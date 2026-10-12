import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the Token and capture start time
api.interceptors.request.use(
  (config) => {
    config.metadata = { startTime: performance.now() };
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to measure latency and broadcast telemetry
api.interceptors.response.use(
  (response) => {
    const startTime = response.config?.metadata?.startTime || performance.now();
    const roundTripMs = parseFloat((performance.now() - startTime).toFixed(1));
    response.roundTripMs = roundTripMs;

    // Check if this response came from a cached NoSQL data endpoint
    const hasCacheHeader = Boolean(response.headers['x-cache'] || response.headers['X-Cache']);
    const hasCacheInBody = Boolean(response.data?.cache || response.data?.source);

    if (hasCacheHeader || hasCacheInBody) {
      const rawHeaderCache = response.headers['x-cache'] || response.headers['X-Cache'];
      const rawHeaderSource = response.headers['x-source'] || response.headers['X-Source'];
      
      const source = response.data?.source || (rawHeaderSource ? rawHeaderSource.toLowerCase() : (rawHeaderCache === 'HIT' ? 'redis' : 'mongodb'));
      const cacheStatus = rawHeaderCache || response.data?.cache || (source === 'redis' ? 'HIT' : 'MISS');
      const backendMs = response.data?.responseTimeMs || parseFloat(response.headers['x-response-time'] || response.headers['X-Response-Time']) || roundTripMs;

      // Attach to response object for direct page use
      response.telemetry = {
        source,
        cacheStatus,
        backendMs,
        roundTripMs,
        cacheKey: response.data?.cacheKey || null,
        url: response.config?.url,
        timestamp: new Date().toLocaleTimeString()
      };

      // Broadcast global event so active on-screen badges and dock update
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('nosql-telemetry', {
          detail: response.telemetry
        }));
      }
    } else {
      response.telemetry = null;
    }

    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;