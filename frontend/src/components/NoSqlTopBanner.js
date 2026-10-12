import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Zap, Database, RefreshCw, Trash2, Clock } from 'lucide-react';
import api from '../utils/api';

/**
 * NoSqlTopBanner
 * Sits permanently at the very top of every application view.
 * Clearly demonstrates on-screen where the data was fetched from (MongoDB vs. Redis)
 * and the exact response time in milliseconds.
 */
const NoSqlTopBanner = () => {
  const location = useLocation();
  const [telemetry, setTelemetry] = useState(null);
  const [currentTTL, setCurrentTTL] = useState(60);
  const [clearing, setClearing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState('');

  // Listen for active NoSQL telemetry events
  useEffect(() => {
    const handleTelemetry = (e) => {
      if (e.detail) {
        setTelemetry(e.detail);
      }
    };

    window.addEventListener('nosql-telemetry', handleTelemetry);
    return () => window.removeEventListener('nosql-telemetry', handleTelemetry);
  }, []);

  // Fetch configured TTL on mount
  useEffect(() => {
    api.get('/cache/keys').then(res => {
      if (res.data?.configuredTTL) {
        setCurrentTTL(res.data.configuredTTL);
      }
    }).catch(() => {});
  }, []);

  // Set TTL dynamically
  const handleSetTTL = async (val) => {
    try {
      const res = await api.post('/cache/ttl', { ttl: val });
      if (res.data?.success) {
        setCurrentTTL(res.data.configuredTTL);
        setNotice(`TTL set to ${res.data.configuredTTL}s`);
        setTimeout(() => setNotice(''), 3000);
      }
    } catch (err) {
      console.error('Failed to update TTL', err);
    }
  };

  // Evict Redis cache to demonstrate initial MongoDB load
  const handleEvictCache = async () => {
    try {
      setClearing(true);
      await api.post('/cache/invalidate');
      setNotice('Redis cache evicted! Reloading from MongoDB...');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error('Error evicting cache', err);
      setClearing(false);
    }
  };

  // Re-fetch current page to demonstrate Redis HIT within TTL
  const handleTestNextFetch = () => {
    setRefreshing(true);
    setNotice('Testing next fetch within TTL...');
    setTimeout(() => {
      window.location.reload();
    }, 200);
  };

  if (location.pathname === '/dashboard') {
    return null;
  }

  const isRedis = telemetry?.source === 'redis' || telemetry?.cacheStatus === 'HIT';
  const isMongo = telemetry?.source === 'mongodb' || telemetry?.cacheStatus === 'MISS';
  const duration = telemetry?.roundTripMs || telemetry?.backendMs || null;

  return (
    <div
      style={{
        margin: '0 0 20px 0',
        padding: '12px 20px',
        borderRadius: '12px',
        backgroundColor: isRedis ? '#064e3b' : isMongo ? '#1e3a8a' : '#1e293b',
        color: '#ffffff',
        boxShadow: isRedis
          ? '0 4px 16px rgba(16, 185, 129, 0.25)'
          : isMongo
          ? '0 4px 16px rgba(59, 130, 246, 0.25)'
          : '0 4px 12px rgba(0, 0, 0, 0.15)',
        border: isRedis
          ? '1px solid rgba(52, 211, 153, 0.5)'
          : isMongo
          ? '1px solid rgba(96, 165, 250, 0.5)'
          : '1px solid rgba(148, 163, 184, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        transition: 'all 0.3s ease',
        userSelect: 'none'
      }}
    >
      {/* Primary Row: Storage Layer + Latency + Interactive Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Left: Storage Engine & Hit/Miss Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {isRedis ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '8px',
                backgroundColor: '#059669',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13px',
                letterSpacing: '0.5px',
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.4)'
              }}
            >
              <Zap size={18} style={{ color: '#fef08a' }} />
              <span>FETCHED FROM: REDIS IN-MEMORY KEY-VALUE CACHE (HIT)</span>
            </div>
          ) : isMongo ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '8px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13px',
                letterSpacing: '0.5px',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)'
              }}
            >
              <Database size={18} style={{ color: '#93c5fd' }} />
              <span>FETCHED FROM: MONGODB DOCUMENT STORE (FIRST TIME / MISS)</span>
            </div>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '8px',
                backgroundColor: '#334155',
                color: '#cbd5e1',
                fontWeight: 700,
                fontSize: '13px'
              }}
            >
              <Clock size={16} />
              <span>FETCHING NO-SQL TELEMETRY...</span>
            </div>
          )}

          {/* Response Time Callout */}
          {duration !== null && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)'
              }}
            >
              <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>Response Time:</span>
              <strong
                style={{
                  fontSize: '15px',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  color: isRedis ? '#4ade80' : '#60a5fa'
                }}
              >
                {duration} ms
              </strong>
              {isRedis && (
                <span style={{ fontSize: '11px', color: '#a7f3d0', fontWeight: 700, marginLeft: '4px' }}>
                  ⚡ (Ultra Fast)
                </span>
              )}
            </div>
          )}

          {/* Active Key */}
          {telemetry?.cacheKey && (
            <div
              style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                padding: '5px 10px',
                borderRadius: '6px',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
              title={`Full Cache Key: ${telemetry.cacheKey}`}
            >
              🔑 {telemetry.cacheKey.length > 45 ? telemetry.cacheKey.substring(0, 45) + '...' : telemetry.cacheKey}
            </div>
          )}
        </div>

        {/* Right: Quick Action Buttons for Faculty Demonstration */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* TTL Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: '4px 8px', borderRadius: '8px' }}>
            <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600, marginRight: '2px' }}>TTL:</span>
            {[5, 10, 30, 60].map(s => (
              <button
                key={s}
                onClick={() => handleSetTTL(s)}
                style={{
                  background: currentTTL === s ? '#f59e0b' : 'transparent',
                  color: currentTTL === s ? '#000' : '#fff',
                  border: currentTTL === s ? 'none' : '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '4px',
                  padding: '2px 7px',
                  fontSize: '11px',
                  fontWeight: currentTTL === s ? 700 : 500,
                  cursor: 'pointer'
                }}
                title={`Set Redis TTL to ${s} seconds`}
              >
                {s}s
              </button>
            ))}
          </div>

          {/* Try Next Fetch button */}
          <button
            onClick={handleTestNextFetch}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 13px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.2s ease'
            }}
            title="Click to test subsequent fetch: If within TTL, data will load from Redis in 1-2ms!"
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            <span>Test Next Fetch (HIT)</span>
          </button>

          {/* Evict Redis (Test Mongo) button */}
          <button
            onClick={handleEvictCache}
            disabled={clearing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.85)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 13px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)',
              transition: 'all 0.2s ease'
            }}
            title="Evict Redis cache to test initial load from MongoDB"
          >
            <Trash2 size={14} />
            <span>Evict Cache (Test Mongo)</span>
          </button>
        </div>
      </div>

      {/* Explanatory Context Line */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.85)', paddingTop: '2px' }}>
        <div>
          {isRedis ? (
            <span>
              ✅ <strong>Subsequent Load:</strong> Key is alive in Redis memory within <strong>{currentTTL}s TTL</strong>. No MongoDB queries executed.
            </span>
          ) : isMongo ? (
            <span>
              ℹ️ <strong>First-Time Load / Cache Expired:</strong> Data was fetched from MongoDB and stored in Redis. Click <strong>Test Next Fetch</strong> to verify Redis HIT!
            </span>
          ) : (
            <span>Ready. Open or refresh any page to observe NoSQL retrieval telemetry.</span>
          )}
        </div>
        {notice && (
          <div style={{ fontWeight: 700, color: '#fef08a' }}>
            {notice}
          </div>
        )}
      </div>
    </div>
  );
};

export default NoSqlTopBanner;
