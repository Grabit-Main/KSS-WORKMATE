import { useEffect } from 'react';
import { useWebSocket } from '../context/WebSocketContext';

export const useRealtime = (eventType, callback) => {
  const { subscribe, isConnected } = useWebSocket();

  useEffect(() => {
    if (!isConnected) return;
    const unsubscribe = subscribe(eventType, callback);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [eventType, callback, subscribe, isConnected]);
};
