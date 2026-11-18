import { io } from 'socket.io-client';

const rawApiUrl = import.meta.env.VITE_API_URL || '';
const isVercelHost = typeof window !== 'undefined' && (
  window.location.hostname.includes('vercel.app') ||
  window.location.hostname.includes('modapella.shop')
);

// In serverless Vercel production, real-time sync is powered by useSmartSync.
// Socket.IO is only initialized in local development or if an explicit external WebSocket URL is provided.
const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
);

const explicitSocketUrl = import.meta.env.VITE_SOCKET_URL;
const shouldConnect = Boolean(explicitSocketUrl || (isLocalhost && !isVercelHost));
const SOCKET_URL = explicitSocketUrl || (isLocalhost ? 'http://localhost:5000' : '');

let socket = null;

if (shouldConnect && SOCKET_URL) {
  try {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false, // Do not auto-connect blindly to prevent unhandled connection spam
      reconnectionAttempts: 2,
      timeout: 3000
    });
    socket.on('connect_error', () => {
      if (socket) socket.disconnect();
    });
  } catch (err) {
    console.debug('[Socket] Initialization skipped:', err.message);
  }
}

// Fallback dummy interface so imports won't break if socket is inactive
if (!socket) {
  socket = {
    on: () => {},
    off: () => {},
    emit: () => {},
    disconnect: () => {},
    connect: () => {},
    connected: false
  };
}

export default socket;
