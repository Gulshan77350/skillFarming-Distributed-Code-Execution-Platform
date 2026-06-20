import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

type MessageHandler = (data: any) => void;

export function useWebSocket(onMessage: MessageHandler) {
  const { token } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      console.warn('WebSocket error — falling back to polling if needed');
    };

    return () => {
      ws.close();
    };
  }, [token]);

  return wsRef;
}
