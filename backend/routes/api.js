import express from 'express';
import { createDetectionController } from '../controllers/detectionController.js';
import { createDeviceController } from '../controllers/deviceController.js';
import { createSettingsController } from '../controllers/settingsController.js';
import { SUPPORTED_CATEGORIES } from '../services/detectionService.js';

export function createApiRouter(io) {
  const router = express.Router();

  const detectionCtrl = createDetectionController(io);
  const deviceCtrl = createDeviceController(io);
  const settingsCtrl = createSettingsController(io);

  // Health check
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      system: 'SoundGuard Assistive IoT Server',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // Sound categories reference
  router.get('/categories', (req, res) => {
    res.json({
      success: true,
      categories: SUPPORTED_CATEGORIES
    });
  });

  // Detections
  router.post('/detections', detectionCtrl.handleCreateDetection);
  router.get('/detections', detectionCtrl.handleGetDetections);
  router.delete('/detections', detectionCtrl.handleClearHistory);
  router.patch('/detections/:id/acknowledge', detectionCtrl.handleAcknowledgeDetection);

  // Stats
  router.get('/stats', detectionCtrl.handleGetStats);

  // Device status & heartbeat
  router.post('/device/heartbeat', deviceCtrl.handleHeartbeat);
  router.get('/device/status', deviceCtrl.handleGetStatus);

  // Settings
  router.get('/settings', settingsCtrl.handleGetSettings);
  router.put('/settings', settingsCtrl.handleUpdateSettings);

  return router;
}
