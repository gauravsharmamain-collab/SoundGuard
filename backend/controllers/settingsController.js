import * as settingsService from '../services/settingsService.js';

export function createSettingsController(io) {
  return {
    async handleGetSettings(req, res) {
      try {
        const settings = settingsService.getAllSettings();
        return res.json({
          success: true,
          settings
        });
      } catch (err) {
        console.error('[Get Settings Error]', err.message);
        return res.status(500).json({
          success: false,
          error: err.message
        });
      }
    },

    async handleUpdateSettings(req, res) {
      try {
        const newSettings = req.body;
        if (!newSettings || typeof newSettings !== 'object') {
          return res.status(400).json({
            success: false,
            error: 'Request body must be a settings object'
          });
        }

        const updated = settingsService.updateSettings(newSettings);

        if (io) {
          io.emit('settings_updated', updated);
        }

        return res.json({
          success: true,
          message: 'Settings updated successfully',
          settings: updated
        });
      } catch (err) {
        console.error('[Update Settings Error]', err.message);
        return res.status(500).json({
          success: false,
          error: err.message
        });
      }
    }
  };
}
