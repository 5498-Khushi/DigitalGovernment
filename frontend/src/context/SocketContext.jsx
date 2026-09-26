import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../api/client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!user || !token) {
      socketRef.current?.disconnect();
      return;
    }

    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('notification', (payload) => {
      setLastNotification({ ...payload, id: Date.now() });
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Citizen Service Update', { body: payload.message });
      }
    });

    return () => socket.disconnect();
  }, [user]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, lastNotification }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
