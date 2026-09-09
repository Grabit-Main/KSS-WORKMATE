import { useEffect } from 'react';
import { useWebSocket } from '../context/WebSocketContext';

export const useRealtime = (eventType, callback) => {
  const ws = useWebSocket();

  useEffect(() => {
    if (!ws || !ws.subscribe || !callback) return;
    const unsubscribe = ws.subscribe(eventType, callback);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [eventType, callback, ws]);
};
