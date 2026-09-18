class NativeWebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map(); // channel or message type -> array of callbacks
    this.activeSubscriptions = new Set();
    this.token = null;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.baseDelay = 1000; // 1 second
  }

  connect(token) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }
    
    this.token = token;
    
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const wsUrl = apiBaseUrl.replace(/^http/, 'ws') + `/api/ws/?token=${token}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        
        // Resubscribe to active channels
        for (const channel of this.activeSubscriptions) {
          this._sendSubscribe(channel);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Notify global wildcard listeners
          this._notifyListeners('*', data);
          
          // Notify specific message type listeners
          if (data.type) {
            this._notifyListeners(data.type, data);
          }
        } catch (err) {
          console.warn('Failed to parse WebSocket message', err);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected', event.reason);
        this.ws = null;
        this._scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error', error);
      };
      
    } catch (error) {
      console.error('Failed to establish WebSocket connection', error);
      this._scheduleReconnect();
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.activeSubscriptions.clear();
    
    if (this.ws) {
      this.ws.close(1000, "Client disconnected");
      this.ws = null;
    }
    this.token = null;
  }

  _scheduleReconnect() {
    if (!this.token) return; // Don't reconnect if we intentionally disconnected

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max WebSocket reconnection attempts reached.');
      return;
    }

    const delay = this.baseDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`Scheduling WebSocket reconnect in ${delay}ms (Attempt ${this.reconnectAttempts})`);
    
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.token);
    }, delay);
  }

  subscribe(channel) {
    this.activeSubscriptions.add(channel);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this._sendSubscribe(channel);
    }
  }

  unsubscribe(channel) {
    this.activeSubscriptions.delete(channel);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', channel }));
    }
  }

  _sendSubscribe(channel) {
    this.ws.send(JSON.stringify({ type: 'subscribe', channel }));
  }

  // Pub/Sub for React components
  on(eventOrType, callback) {
    if (!this.listeners.has(eventOrType)) {
      this.listeners.set(eventOrType, []);
    }
    this.listeners.get(eventOrType).push(callback);
  }

  off(eventOrType, callback) {
    if (this.listeners.has(eventOrType)) {
      const filtered = this.listeners.get(eventOrType).filter(cb => cb !== callback);
      if (filtered.length === 0) {
        this.listeners.delete(eventOrType);
      } else {
        this.listeners.set(eventOrType, filtered);
      }
    }
  }

  _notifyListeners(eventOrType, data) {
    const callbacks = this.listeners.get(eventOrType);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }
}

export const socketService = new NativeWebSocketService();
