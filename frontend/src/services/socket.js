import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
  : window.location.origin;
const socket = io(SOCKET_URL, { transports: ['websocket'], autoConnect: true });

export default socket;
