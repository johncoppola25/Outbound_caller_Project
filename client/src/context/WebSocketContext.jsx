import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [listeners] = useState(() => new Set());

  useEffect(() => {
    let socket = null;
    let reconnectTimer = null;
    let backoff = 1000; // Start at 1 second
    const MAX_BACKOFF = 30000; // Cap at 30 seconds
    let unmounted = false;

    const connect = () => {
      if (unmounted) return;
      const token = localStorage.getItem('outreach_token');
      if (!token) return; // Don't connect without auth
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // In production (same origin), use the page's host. In dev, use port 3001.
        const isDev = window.location.port === '5173' || window.location.port === '5174';
        const wsHost = isDev ? `${window.location.hostname}:3001` : window.location.host;
        const wsUrl = `${protocol}//${wsHost}?token=${encodeURIComponent(token)}`;

        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          backoff = 1000; // Reset backoff on successful connection
        };

        socket.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          if (!unmounted) {
            console.log(`WebSocket reconnecting in ${backoff / 1000}s...`);
            reconnectTimer = setTimeout(() => {
              backoff = Math.min(backoff * 2, MAX_BACKOFF);
              connect();
            }, backoff);
          }
        };

        socket.onerror = (error) => {
          console.log('WebSocket error:', error);
          setIsConnected(false);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setLastMessage(data);
            listeners.forEach(callback => {
              try {
                callback(data);
              } catch (e) {
                console.error('Error in listener:', e);
              }
            });
          } catch (e) {
            console.error('Error parsing WebSocket message:', e);
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        if (!unmounted) {
          reconnectTimer = setTimeout(() => {
            backoff = Math.min(backoff * 2, MAX_BACKOFF);
            connect();
          }, backoff);
        }
      }
    };

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (socket) {
        socket.close();
      }
    };
  }, [listeners]);

  const subscribe = useCallback((callback) => {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  }, [listeners]);

  return (
    <WebSocketContext.Provider value={{ isConnected, lastMessage, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
