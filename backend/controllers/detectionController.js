import * as detectionService from '../services/detectionService.js';

export function createDetectionController(io) {
  return {
    async handleCreateDetection(req, res) {
      try {
        const { device_id, sound, confidence, timestamp, is_test } = req.body;

        if (!device_id || !sound || confidence === undefined) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields: device_id, sound, and confidence are mandatory'
          });
        }

        const detection = detectionService.addDetection({
          device_id,
          sound,
          confidence,
          timestamp,
          is_test: is_test ? 1 : 0
        });

        // Broadcast to all connected frontend clients via Socket.IO
        if (io) {
          io.emit('new_detection', detection);
          // Also broadcast updated stats so dashboards stay live
          const stats = detectionService.getStats();
          io.emit('stats_update', stats);
        }

        return res.status(201).json({
          success: true,
          message: 'Detection event recorded successfully',
          detection
        });
      } catch (err) {
        console.error('[Detection Error]', err.message);
        const status = err.status || 400;
        return res.status(status).json({
          success: false,
          error: err.message,
          code: err.code || 'BAD_REQUEST'
        });
      }
    },

    async handleGetDetections(req, res) {
      try {
        const { category, start_date, end_date, minimum_confidence, page, limit, sort } = req.query;
        const result = detectionService.getDetections({
          category,
          start_date,
          end_date,
          minimum_confidence,
          page,
          limit,
          sort
        });
        return res.json({
          success: true,
          ...result
        });
      } catch (err) {
        console.error('[Get Detections Error]', err.message);
        return res.status(500).json({
          success: false,
          error: err.message
        });
      }
    },

    async handleGetStats(req, res) {
      try {
        const stats = detectionService.getStats();
        return res.json({
          success: true,
          stats
        });
      } catch (err) {
        console.error('[Get Stats Error]', err.message);
        return res.status(500).json({
          success: false,
          error: err.message
        });
      }
    },

    async handleAcknowledgeDetection(req, res) {
      try {
        const { id } = req.params;
        const detection = detectionService.acknowledgeDetection(id);

        if (io) {
          io.emit('detection_acknowledged', detection);
          const stats = detectionService.getStats();
          io.emit('stats_update', stats);
        }

        return res.json({
          success: true,
          message: `Detection ${id} acknowledged`,
          detection
        });
      } catch (err) {
        console.error('[Acknowledge Error]', err.message);
        return res.status(err.message.includes('not found') ? 404 : 500).json({
          success: false,
          error: err.message
        });
      }
    },

    async handleClearHistory(req, res) {
      try {
        const result = detectionService.clearAllDetections();

        if (io) {
          io.emit('history_cleared', result);
          const stats = detectionService.getStats();
          io.emit('stats_update', stats);
        }

        return res.json({
          success: true,
          message: 'All detection history cleared successfully',
          deleted_count: result.deleted_count
        });
      } catch (err) {
        console.error('[Clear History Error]', err.message);
        return res.status(500).json({
          success: false,
          error: err.message
        });
      }
    }
  };
}
