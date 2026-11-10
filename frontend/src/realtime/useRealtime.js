import { useEffect, useRef } from 'react';
import { useWebSocket } from '../context/WebSocketContext';

export const useRealtime = (eventType, callback) => {
  const ws = useWebSocket();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!ws || !ws.subscribe || !eventType) return;
    const handler = (data) => {
      if (callbackRef.current) {
        callbackRef.current(data);
      }
    };
    const unsubscribe = ws.subscribe(eventType, handler);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [eventType, ws]);
};
