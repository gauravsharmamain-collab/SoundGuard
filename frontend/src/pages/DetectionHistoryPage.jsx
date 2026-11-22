import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { fetchDetections, acknowledgeDetection, clearDetectionHistory } from '../services/api';
import SoundBadge from '../components/SoundBadge';
import ConfirmationModal from '../components/ConfirmationModal';

export default function DetectionHistoryPage({ onHistoryChange }) {
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters state
  const [searchCategory, setSearchCategory] = useState('');
  const [minConfidence, setMinConfidence] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');

  // Confirmation modal for clear history
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const loadData = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDetections({
        category: searchCategory,
        start_date: startDate,
        end_date: endDate,
        minimum_confidence: minConfidence !== '' ? parseFloat(minConfidence) / 100 : '',
        page,
        limit: 15,
        sort: sortOrder
      });
      setEvents(res.data || []);
      setPagination(res.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load detection history');
    } finally {
      setLoading(false);
    }
  }, [searchCategory, minConfidence, startDate, endDate, sortOrder]);

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const handleAcknowledge = async (id) => {
    try {
      await acknowledgeDetection(id);
      setEvents(prev => prev.map(e => e.id === id ? { ...e, acknowledged: 1 } : e));
      if (onHistoryChange) onHistoryChange();
    } catch (err) {
      alert(`Could not acknowledge event #${id}: ${err.message}`);
    }
  };

  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
      await clearDetectionHistory();
      setIsClearModalOpen(false);
      loadData(1);
      if (onHistoryChange) onHistoryChange();
    } catch (err) {
      alert(`Could not clear history: ${err.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  const handleExportCSV = () => {
    if (events.length === 0) {
      alert('No detection events available to export.');
      return;
    }

    const headers = ['Event ID', 'Sound Category', 'Confidence (%)', 'Timestamp', 'Date Time ISO', 'Device ID', 'Acknowledged', 'Is Test'];
    const rows = events.map(e => [
      e.id,
      e.sound,
      (e.confidence * 100).toFixed(1),
      e.timestamp,
      new Date(e.timestamp).toISOString(),
      `"${e.device_id}"`,
      e.acknowledged ? 'YES' : 'NO',
      e.is_test ? 'YES' : 'NO'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `soundguard_detections_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetFilters = () => {
    setSearchCategory('');
    setMinConfidence('');
    setStartDate('');
    setEndDate('');
    setSortOrder('desc');
  };

  return (
    <div className="space-y-6">
      {/* Page Header and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">Detection History Log</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Complete persistent audit trail stored in local SQLite database
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm cursor-pointer"
          >
            <Download size={14} className="text-cyan-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsClearModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 transition-colors shadow-sm cursor-pointer"
          >
            <Trash2 size={14} className="text-red-400" />
            <span>Clear History</span>
          </button>

          <button
            onClick={() => loadData(pagination.page)}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Refresh history"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-cyan-400' : ''} />
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal size={14} className="text-cyan-400" />
            Filter &amp; Search Controls
          </span>
          {(searchCategory || minConfidence || startDate || endDate || sortOrder !== 'desc') && (
            <button
              onClick={handleResetFilters}
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px] cursor-pointer"
            >
              <X size={12} /> Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Sound Category Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Sound Category</label>
            <select
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Categories</option>
              <option value="door_knock">Door Knock</option>
              <option value="clapping">Clapping</option>
              <option value="crying_baby">Crying Baby</option>
              <option value="alarm_bell">Bell / Alarm</option>
            </select>
          </div>

          {/* Min Confidence */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Min Confidence (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="e.g. 75"
              value={minConfidence}
              onChange={(e) => setMinConfidence(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
            </input>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Order</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Table Card */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <RefreshCw size={24} className="mx-auto animate-spin text-cyan-400" />
            <p className="text-xs">Querying SQLite database...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400 space-y-2">
            <AlertCircle size={24} className="mx-auto" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : events.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-5">ID</th>
                  <th className="py-3.5 px-5">Category</th>
                  <th className="py-3.5 px-5">Confidence</th>
                  <th className="py-3.5 px-5">Timestamp</th>
                  <th className="py-3.5 px-5">Device ID</th>
                  <th className="py-3.5 px-5 text-right">Acknowledgement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-5 text-slate-400">
                      #{event.id}
                      {event.is_test ? (
                        <span className="ml-1.5 text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded border border-slate-700">
                          TEST
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 px-5">
                      <SoundBadge sound={event.sound} size="sm" />
                    </td>
                    <td className="py-3 px-5 font-bold" style={{ color: event.color || '#06b6d4' }}>
                      {event.confidence_pct || Math.round(event.confidence * 100)}%
                    </td>
                    <td className="py-3 px-5 text-slate-300 text-[11px]">
                      {new Date(event.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                    </td>
                    <td className="py-3 px-5 text-slate-400">
                      {event.device_id}
                    </td>
                    <td className="py-3 px-5 text-right">
                      {event.acknowledged ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
                          <CheckCircle2 size={13} /> Ack
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAcknowledge(event.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
                        >
                          Acknowledge
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <FileSpreadsheet size={32} className="mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-400">No detection events match your criteria</p>
            <p className="text-xs text-slate-500">
              Clear filters or wait for the ESP32 to send a sound detection.
            </p>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-800/80 bg-slate-950/60 text-xs">
            <span className="text-slate-400">
              Page <span className="text-white font-semibold">{pagination.page}</span> of{' '}
              <span className="text-white font-semibold">{pagination.totalPages}</span>{' '}
              ({pagination.total} total detections)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadData(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <button
                onClick={() => loadData(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleClearHistory}
        title="Clear All Detection History"
        message="Are you sure you want to delete all sound detection records from the local SQLite database? This cannot be undone."
        isDeleting={isClearing}
      />
    </div>
  );
}
