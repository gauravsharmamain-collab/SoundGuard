import * as deviceService from '../services/deviceService.js';

export function createDeviceController(io) {
  return {
    async handleHeartbeat(req, res) {
      try {
        const { device_id, status, wifi_rssi, firmware_version } = req.body;
        const ip_address = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;

        if (!device_id || typeof device_id !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'device_id is required'
          });
        }

        const device = deviceService.recordHeartbeat({
          device_id,
          status: status || 'online',
          wifi_rssi: wifi_rssi !== undefined ? Number(wifi_rssi) : null,
          firmware_version: firmware_version || '1.0.0',
          ip_address: typeof ip_address === 'string' ? ip_address.replace('::ffff:', '') : null
        });

        if (io) {
          io.emit('device_heartbeat', device);
        }

        return res.json({
          success: true,
          message: 'Heartbeat acknowledged',
          device
        });
      } catch (err) {
        console.error('[Heartbeat Error]', err.message);
        return res.status(500).json({
          success: false,
          error: err.message
        });
      }
    },

    async handleGetStatus(req, res) {
      try {
        const { device_id } = req.query;
        const status = deviceService.getDeviceStatus(device_id);
        return res.json({
          success: true,
          ...status
        });
      } catch (err) {
        console.error('[Device Status Error]', err.message);
        return res.status(500).json({
          success: false,
          error: err.message
        });
      }
    }
  };
}
