import { io } from 'socket.io-client';

const rawApiUrl = import.meta.env.VITE_API_URL || '';
const isVercelHost = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');

// Only connect if we have an explicit external backend URL, or if running locally
const hasValidBackendUrl = Boolean(rawApiUrl && !rawApiUrl.startsWith('/') && !rawApiUrl.includes('vercel.app'));
const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const shouldConnect = hasValidBackendUrl || (isLocalhost && !isVercelHost);

const SOCKET_URL = hasValidBackendUrl
  ? rawApiUrl.replace(/\/api\/?$/, '')
  : (isLocalhost ? 'http://localhost:5000' : '');

let socket = null;

if (shouldConnect && SOCKET_URL) {
  try {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 3,
      timeout: 5000
    });
    socket.on('connect_error', () => {
      // Avoid infinite error flooding in console if socket server is unavailable
      if (socket) socket.disconnect();
    });
  } catch (err) {
    console.debug('Socket initialization skipped:', err.message);
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
