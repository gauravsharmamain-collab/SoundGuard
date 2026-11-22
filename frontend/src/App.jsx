import React, { useState, useEffect, useCallback, useRef } from 'react';
import socket from './services/socket';
import { 
  fetchStats, 
  fetchDeviceStatus, 
  fetchSettings, 
  acknowledgeDetection, 
  createDetection 
} from './services/api';
import { playAlertNotification, triggerTactileVibration } from './services/soundAlert';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OverviewPage from './pages/OverviewPage';
import LiveDetectionPage from './pages/LiveDetectionPage';
import DetectionHistoryPage from './pages/DetectionHistoryPage';
import SoundAnalyticsPage from './pages/SoundAnalyticsPage';
import DeviceStatusPage from './pages/DeviceStatusPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const [currentTab, setCurrentTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Core Data States
  const [stats, setStats] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);
  const [recentLiveEvents, setRecentLiveEvents] = useState([]);
  const [acknowledgedIds, setAcknowledgedIds] = useState([]);
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  // Settings & Preferences
  const [settings, setSettings] = useState({
    visual_alerts_enabled: true,
    sound_alerts_enabled: true,
    vibration_alerts_enabled: true,
    min_confidence: 0.70,
    high_priority_flash: true
  });

  // Socket Connection State
  const [isSocketConnected, setIsSocketConnected] = useState(socket.connected);

  // Audio & Tactile Preferences Ref to use inside socket event listeners
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Load initial application data
  const loadInitialData = useCallback(async () => {
    try {
      const [statsData, devData, settsData] = await Promise.all([
        fetchStats().catch(() => null),
        fetchDeviceStatus().catch(() => null),
        fetchSettings().catch(() => null)
      ]);

      if (statsData) {
        setStats(statsData);
        // If there is an unacknowledged latest detection, initialize activeAlert
        if (statsData.latest_detection && !statsData.latest_detection.acknowledged) {
          setActiveAlert(statsData.latest_detection);
        }
      }
      if (devData) setDeviceStatus(devData);
      if (settsData) setSettings(prev => ({ ...prev, ...settsData }));
    } catch (err) {
      console.error('[SoundGuard] Error loading initial state:', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Socket.IO event listeners
  useEffect(() => {
    function onConnect() {
      console.log('[Socket.IO] Connected to SoundGuard backend');
      setIsSocketConnected(true);
    }

    function onDisconnect() {
      console.log('[Socket.IO] Disconnected from SoundGuard backend');
      setIsSocketConnected(false);
    }

    function onNewDetection(detection) {
      console.log('[Socket.IO] Received new detection:', detection);

      // Play assistive sound chime if enabled in settings
      if (settingsRef.current.sound_alerts_enabled) {
        playAlertNotification(detection.sound, detection.priority);
      }

      // Trigger tactile vibration if supported and enabled
      if (settingsRef.current.vibration_alerts_enabled) {
        triggerTactileVibration(detection.sound, detection.priority);
      }

      // Set active alert banner
      setActiveAlert(detection);

      // Add to live events feed (keep last 20)
      setRecentLiveEvents(prev => [detection, ...prev.slice(0, 19)]);

      // Refresh statistics
      fetchStats().then(setStats).catch(console.error);
    }

    function onDetectionAcknowledged(detection) {
      console.log('[Socket.IO] Detection acknowledged:', detection.id);
      setAcknowledgedIds(prev => [...prev, detection.id]);
      setActiveAlert(prev => (prev && prev.id === detection.id ? null : prev));
      setRecentLiveEvents(prev => prev.map(e => e.id === detection.id ? { ...e, acknowledged: 1 } : e));
    }

    function onDeviceHeartbeat(dev) {
      setDeviceStatus(dev);
    }

    function onDeviceStatusChange(dev) {
      setDeviceStatus(dev);
    }

    function onStatsUpdate(newStats) {
      setStats(newStats);
    }

    function onSettingsUpdated(newSettings) {
      setSettings(prev => ({ ...prev, ...newSettings }));
    }

    function onHistoryCleared() {
      setActiveAlert(null);
      setRecentLiveEvents([]);
      fetchStats().then(setStats).catch(console.error);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('new_detection', onNewDetection);
    socket.on('detection_acknowledged', onDetectionAcknowledged);
    socket.on('device_heartbeat', onDeviceHeartbeat);
    socket.on('device_status_change', onDeviceStatusChange);
    socket.on('stats_update', onStatsUpdate);
    socket.on('settings_updated', onSettingsUpdated);
    socket.on('history_cleared', onHistoryCleared);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('new_detection', onNewDetection);
      socket.off('detection_acknowledged', onDetectionAcknowledged);
      socket.off('device_heartbeat', onDeviceHeartbeat);
      socket.off('device_status_change', onDeviceStatusChange);
      socket.off('stats_update', onStatsUpdate);
      socket.off('settings_updated', onSettingsUpdated);
      socket.off('history_cleared', onHistoryCleared);
    };
  }, []);

  // Periodic device status poll as client fallback
  useEffect(() => {
    const timer = setInterval(() => {
      fetchDeviceStatus().then(setDeviceStatus).catch(() => {});
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Handle alert acknowledgement
  const handleAcknowledge = async (id) => {
    if (!id) return;
    setIsAcknowledging(true);
    try {
      await acknowledgeDetection(id);
      setActiveAlert(null);
      setAcknowledgedIds(prev => [...prev, id]);
      loadInitialData();
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    } finally {
      setIsAcknowledging(false);
    }
  };

  // Toggle sound chime from header shortcut
  const handleToggleSound = () => {
    setSettings(prev => ({
      ...prev,
      sound_alerts_enabled: !prev.sound_alerts_enabled
    }));
  };

  // Quick test trigger for user convenience
  const handleTriggerTest = async (sound = 'door_knock', conf = 0.92) => {
    try {
      await createDetection({
        device_id: deviceStatus?.primary_device?.device_id || 'soundguard_01',
        sound,
        confidence: conf,
        timestamp: Date.now(),
        is_test: 1
      });
    } catch (err) {
      alert(`Simulation error: ${err.message}`);
    }
  };

  const pageTitles = {
    overview: { title: 'Overview Dashboard', subtitle: 'Live IoT telemetry and classification statistics' },
    live: { title: 'Live Detection Feed', subtitle: 'High-visibility visual sound alerts and real-time monitoring' },
    history: { title: 'Detection History', subtitle: 'Complete SQLite database query log with filtering and CSV export' },
    analytics: { title: 'Sound Analytics', subtitle: 'Recharts statistical breakdowns of detected sound categories' },
    device: { title: 'ESP32 Device Status', subtitle: 'Microcontroller connection heartbeat, RSSI, and diagnostics' },
    settings: { title: 'Settings & Preferences', subtitle: 'Assistive alerting preferences and minimum confidence thresholds' },
  };

  const isDeviceOnline = deviceStatus?.is_online || false;
  const unacknowledgedCount = stats?.unacknowledged_count || (activeAlert ? 1 : 0);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar for Desktop */}
      <div className="hidden md:flex">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          isDeviceOnline={isDeviceOnline}
          isSocketConnected={isSocketConnected}
          unacknowledgedCount={unacknowledgedCount}
        />
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-950">
            <Sidebar
              currentTab={currentTab}
              onSelectTab={(tab) => {
                setCurrentTab(tab);
                setIsMobileMenuOpen(false);
              }}
              isDeviceOnline={isDeviceOnline}
              isSocketConnected={isSocketConnected}
              unacknowledgedCount={unacknowledgedCount}
            />
          </div>
        </div>
      )}

      {/* Main App Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sticky Assistive Header */}
        <Header
          title={pageTitles[currentTab]?.title || 'SoundGuard'}
          subtitle={pageTitles[currentTab]?.subtitle || ''}
          isDeviceOnline={isDeviceOnline}
          isSocketConnected={isSocketConnected}
          soundAlertsEnabled={settings.sound_alerts_enabled}
          onToggleSound={handleToggleSound}
          unacknowledgedCount={unacknowledgedCount}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onQuickSimulate={() => handleTriggerTest('door_knock', 0.94)}
        />

        {/* Scrollable Content Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'overview' && (
              <OverviewPage
                stats={stats}
                deviceStatus={deviceStatus}
                latestDetection={activeAlert || stats?.latest_detection}
                onAcknowledge={handleAcknowledge}
                acknowledgedIds={acknowledgedIds}
                minConfidence={settings.min_confidence}
              />
            )}

            {currentTab === 'live' && (
              <LiveDetectionPage
                activeAlert={activeAlert}
                recentEvents={recentLiveEvents.length > 0 ? recentLiveEvents : (stats?.recent_detections || [])}
                onAcknowledge={handleAcknowledge}
                isAcknowledging={isAcknowledging}
                isSocketConnected={isSocketConnected}
                isDeviceOnline={isDeviceOnline}
                onTriggerTest={handleTriggerTest}
              />
            )}

            {currentTab === 'history' && (
              <DetectionHistoryPage
                onHistoryChange={loadInitialData}
              />
            )}

            {currentTab === 'analytics' && (
              <SoundAnalyticsPage
                stats={stats}
              />
            )}

            {currentTab === 'device' && (
              <DeviceStatusPage
                deviceStatus={deviceStatus}
                onRefresh={loadInitialData}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsPage
                onSettingsSaved={loadInitialData}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
