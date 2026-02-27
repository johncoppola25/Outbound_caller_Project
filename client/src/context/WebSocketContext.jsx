import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [listeners] = useState(() => new Set());

  useEffect(() => {
    let socket = null;
    
    const connect = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.hostname}:3001`;
        
        socket = new WebSocket(wsUrl);
        
        socket.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
        };
        
        socket.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
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
      }
    };
    
    connect();
    
    return () => {
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
