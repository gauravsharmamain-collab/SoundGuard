import { io } from 'socket.io-client';

// Connect using relative origin when served through Vite proxy,
// or fallback to window.location.hostname:5000 if opened directly
const SOCKET_URL = window.location.port === '5173'
  ? window.location.origin
  : `${window.location.protocol}//${window.location.hostname}:5000`;

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000
});

export default socket;
