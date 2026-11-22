import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Volume2, 
  Eye, 
  Vibrate, 
  Sliders, 
  ShieldCheck, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Server
} from 'lucide-react';
import { fetchSettings, updateSettings } from '../services/api';
import { playAlertNotification, triggerTactileVibration } from '../services/soundAlert';

export default function SettingsPage({ onSettingsSaved }) {
  const [settings, setSettings] = useState({
    visual_alerts_enabled: true,
    sound_alerts_enabled: true,
    vibration_alerts_enabled: true,
    min_confidence: 0.70,
    high_priority_flash: true,
    primary_device_id: 'soundguard_01',
    auto_dismiss_seconds: 0
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const data = await fetchSettings();
        if (data) {
          setSettings(prev => ({
            ...prev,
            ...data,
            min_confidence: typeof data.min_confidence === 'number' ? data.min_confidence : parseFloat(data.min_confidence) || 0.70
          }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const updated = await updateSettings(settings);
      setSavedSuccess(true);
      if (onSettingsSaved) onSettingsSaved(updated);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestChime = () => {
    playAlertNotification('door_knock', 'medium');
    triggerTactileVibration('door_knock', 'medium');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Settings Header */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <SettingsIcon size={20} className="text-cyan-400" />
            System &amp; Assistive Preferences
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Configured settings are stored persistently in backend SQLite and enforced on all incoming ESP32 packets.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 text-xs font-semibold animate-fadeIn">
            <CheckCircle2 size={15} />
            <span>Saved to SQLite</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Assistive Visual & Auditory Controls */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 pb-2 border-b border-slate-800">
            Assistive Notification Channels
          </h4>

          {/* Visual Alerts Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <Eye size={16} className="text-cyan-400" />
                Visual Alert Banners &amp; Pulsing Glow
              </label>
              <p className="text-xs text-slate-400">
                Display high-visibility visual banners and category color-coded borders when sound is detected.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.visual_alerts_enabled}
              onChange={(e) => setSettings({ ...settings, visual_alerts_enabled: e.target.checked })}
              className="w-5 h-5 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-cyan-500"
            />
          </div>

          {/* High Priority Strobe */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
            <div className="space-y-0.5">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <Eye size={16} className="text-amber-400" />
                Critical Sound Strobe Animation
              </label>
              <p className="text-xs text-slate-400">
                Intense flashing strobe for critical events (Bell / Alarm and Crying Baby).
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.high_priority_flash}
              onChange={(e) => setSettings({ ...settings, high_priority_flash: e.target.checked })}
              className="w-5 h-5 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Sound Alert Chime Toggle */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
            <div className="space-y-0.5">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <Volume2 size={16} className="text-blue-400" />
                Auditory Assistive Chime
              </label>
              <p className="text-xs text-slate-400">
                Web Audio synthesizer tone for residual hearing and cochlear implant users.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTestChime}
                className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
              >
                Test Chime
              </button>
              <input
                type="checkbox"
                checked={settings.sound_alerts_enabled}
                onChange={(e) => setSettings({ ...settings, sound_alerts_enabled: e.target.checked })}
                className="w-5 h-5 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-cyan-500"
              />
            </div>
          </div>

          {/* Haptic Vibration Toggle */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
            <div className="space-y-0.5">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <Vibrate size={16} className="text-emerald-400" />
                Haptic Vibration (Touch &amp; Mobile devices)
              </label>
              <p className="text-xs text-slate-400">
                Tactile feedback via the browser vibration API when supported by device hardware.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.vibration_alerts_enabled}
              onChange={(e) => setSettings({ ...settings, vibration_alerts_enabled: e.target.checked })}
              className="w-5 h-5 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-cyan-500"
            />
          </div>
        </div>

        {/* Inference & Threshold Settings */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 pb-2 border-b border-slate-800">
            TinyML Classification &amp; Filtering
          </h4>

          {/* Minimum Confidence Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sliders size={16} className="text-cyan-400" />
                  Minimum Confidence Threshold
                </label>
                <p className="text-xs text-slate-400">
                  Detections below this score will be rejected by the backend to prevent false positives.
                </p>
              </div>
              <span className="text-lg font-bold font-mono text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-lg border border-cyan-500/30">
                {Math.round(settings.min_confidence * 100)}%
              </span>
            </div>

            <input
              type="range"
              min="0.50"
              max="0.95"
              step="0.01"
              value={settings.min_confidence}
              onChange={(e) => setSettings({ ...settings, min_confidence: parseFloat(e.target.value) })}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>50% (Permissive)</span>
              <span>70% (Recommended)</span>
              <span>95% (High Precision)</span>
            </div>
          </div>

          {/* Target Device ID */}
          <div className="pt-3 border-t border-slate-800/60 space-y-1.5">
            <label className="text-sm font-semibold text-white">Target ESP32 Device Identifier</label>
            <input
              type="text"
              value={settings.primary_device_id || 'soundguard_01'}
              onChange={(e) => setSettings({ ...settings, primary_device_id: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <p className="text-xs text-slate-500">
              Matches the <code className="text-cyan-400">deviceId</code> configured in the ESP32 Arduino firmware.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-all duration-200 shadow-lg shadow-cyan-500/25 cursor-pointer disabled:opacity-50"
          >
            <Save size={18} />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
