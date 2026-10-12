import React, { useState, useEffect } from 'react';
import { Zap, Database, ChevronDown, ChevronUp, Trash2, RefreshCw, Cpu, Layers, Eye, EyeOff, Clock } from 'lucide-react';
import api from '../utils/api';

/**
 * Floating NoSQL Interactive Demonstration Dock
 * Visibly demonstrates on-screen whether opened data is retrieved from MongoDB or Redis.
 * Also provides a live inspector of items currently cached in Redis memory.
 */
const NoSqlDemoDock = () => {
  const [telemetry, setTelemetry] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('telemetry'); // 'telemetry' | 'keys'
  const [cachedKeys, setCachedKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [selectedKeyData, setSelectedKeyData] = useState(null);
  const [invalidating, setInvalidating] = useState(false);
  const [notice, setNotice] = useState('');
  const [currentTTL, setCurrentTTL] = useState(60);
  const [customTTLInput, setCustomTTLInput] = useState('');

  // Listen for global NoSQL telemetry events triggered by api calls
  useEffect(() => {
    const handleTelemetry = (e) => {
      if (e.detail) {
        setTelemetry(e.detail);
        setNotice('');
        // If dock is open on keys tab, refresh the keys automatically
        if (expanded && activeTab === 'keys') {
          fetchCachedKeys();
        }
      }
    };

    window.addEventListener('nosql-telemetry', handleTelemetry);
    return () => window.removeEventListener('nosql-telemetry', handleTelemetry);
  }, [expanded, activeTab]);

  // Fetch configured TTL on mount
  useEffect(() => {
    api.get('/cache/keys').then(res => {
      if (res.data?.configuredTTL) {
        setCurrentTTL(res.data.configuredTTL);
      }
    }).catch(() => {});
  }, []);

  const fetchCachedKeys = async () => {
    try {
      setLoadingKeys(true);
      const res = await api.get('/cache/keys');
      if (res.data?.success) {
        setCachedKeys(res.data.keys || []);
        if (res.data.configuredTTL) {
          setCurrentTTL(res.data.configuredTTL);
        }
      }
    } catch (err) {
      console.error('Failed to fetch Redis keys:', err);
    } finally {
      setLoadingKeys(false);
    }
  };

  const handleUpdateTTL = async (ttlValue) => {
    const val = parseInt(ttlValue, 10);
    if (!val || val <= 0) return;
    try {
      const res = await api.post('/cache/ttl', { ttl: val });
      if (res.data?.success) {
        setCurrentTTL(res.data.configuredTTL);
        setNotice(`⏱️ Cache TTL set to ${res.data.configuredTTL} seconds (saved to .env)!`);
        fetchCachedKeys();
      }
    } catch (err) {
      setNotice('⚠️ Failed to update TTL: ' + err.message);
    }
  };

  useEffect(() => {
    if (expanded) {
      fetchCachedKeys();
    }
  }, [expanded, activeTab]);

  const isRedis = telemetry?.source === 'redis' || telemetry?.cacheStatus === 'HIT';

  const duration = telemetry?.roundTripMs || telemetry?.backendMs || 0;

  const handleInvalidate = async () => {
    try {
      setInvalidating(true);
      await api.post('/cache/invalidate');
      setNotice('✅ Redis cache evicted! All keys cleared.');
      setCachedKeys([]);
      setSelectedKeyData(null);
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (err) {
      setNotice('⚠️ Invalidation failed: ' + err.message);
    } finally {
      setInvalidating(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '24px',
        zIndex: 9999,
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      {/* Minimized Pill */}
      {!expanded ? (
        <div
          onClick={() => setExpanded(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 16px',
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(12px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            color: '#fff',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            cursor: 'pointer',
            transition: 'all 0.25s ease'
          }}
          title="Click to view live NoSQL Performance Telemetry and Redis Memory"
        >
          {telemetry ? (
            <>
              {isRedis ? (
                <span style={{ display: 'flex', alignItems: 'center', color: '#34d399' }}>
                  <Zap size={16} />
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', color: '#60a5fa' }}>
                  <Database size={16} />
                </span>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <span style={{ fontWeight: 700, color: isRedis ? '#34d399' : '#60a5fa' }}>
                  {duration} ms
                </span>
                <span style={{ color: '#94a3b8' }}>•</span>
                <span style={{ fontWeight: 600 }}>
                  {isRedis ? 'Redis HIT' : 'MongoDB MISS'}
                </span>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#94a3b8' }}>
              <Clock size={15} />
              <span>NoSQL Ready</span>
            </div>
          )}

          <ChevronUp size={15} style={{ color: '#94a3b8', marginLeft: '4px' }} />
        </div>
      ) : (
        /* Expanded Demonstration Panel */
        <div
          style={{
            width: '420px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
            color: '#f8fafc',
            padding: '18px',
            animation: 'fadeInUp 0.2s ease-out',
            overflowY: 'auto'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={18} color="#38bdf8" />
              <strong style={{ fontSize: '14px', letterSpacing: '0.3px' }}>NoSQL Telemetry Inspector</strong>
            </div>
            <button
              onClick={() => setExpanded(false)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '8px' }}>
            <button
              onClick={() => setActiveTab('telemetry')}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'telemetry' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: activeTab === 'telemetry' ? '#fff' : '#94a3b8',
                transition: 'all 0.15s ease'
              }}
            >
              ⚡ Live Telemetry
            </button>
            <button
              onClick={() => setActiveTab('keys')}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'keys' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: activeTab === 'keys' ? '#fff' : '#94a3b8',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px'
              }}
            >
              <Layers size={13} /> Redis Store ({cachedKeys.length})
            </button>
          </div>

          {/* Live TTL Configuration Panel */}
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#e2e8f0' }}>
                ⏱️ Cache TTL Duration:
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.18)', padding: '2px 7px', borderRadius: '4px' }}>
                Active: {currentTTL}s
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
              {[5, 10, 30, 60, 300].map((t) => (
                <button
                  key={t}
                  onClick={() => handleUpdateTTL(t)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '5px',
                    border: currentTTL === t ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.15)',
                    background: currentTTL === t ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                    color: currentTTL === t ? '#38bdf8' : '#cbd5e1',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title={`Set cache TTL to ${t} seconds`}
                >
                  {t}s
                </button>
              ))}

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                <input
                  type="number"
                  placeholder="Sec"
                  value={customTTLInput}
                  onChange={(e) => setCustomTTLInput(e.target.value)}
                  style={{
                    width: '46px',
                    padding: '3px 5px',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '11px'
                  }}
                />
                <button
                  onClick={() => {
                    if (customTTLInput) {
                      handleUpdateTTL(customTTLInput);
                      setCustomTTLInput('');
                    }
                  }}
                  style={{
                    padding: '3px 8px',
                    background: '#0284c7',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Set
                </button>
              </div>
            </div>
          </div>


          {/* Tab 1: Live Telemetry */}
          {activeTab === 'telemetry' && (
            <div>
              {/* Current Request Metrics Box */}
              <div
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: isRedis ? 'rgba(5, 150, 105, 0.15)' : 'rgba(37, 99, 235, 0.15)',
                  border: isRedis ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(96, 165, 250, 0.3)',
                  marginBottom: '14px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Endpoint</span>
                  <code style={{ fontSize: '11px', color: '#e2e8f0', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
                    {telemetry?.url || 'Active Screen Request'}
                  </code>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Data Source</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: isRedis ? '#34d399' : '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isRedis ? <Zap size={13} /> : <Database size={13} />}
                    {isRedis ? 'Redis (Key-Value HIT)' : 'MongoDB (Document Store MISS)'}
                  </span>
                </div>

                {telemetry?.cacheKey && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Redis Key</span>
                    <code style={{ fontSize: '10px', color: '#38bdf8', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', maxWidth: '210px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={telemetry?.cacheKey}>
                      {telemetry?.cacheKey}
                    </code>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Response Latency</span>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                    {duration} ms
                  </span>
                </div>
              </div>

              {/* Architecture Explanations for Faculty */}
              <div style={{ fontSize: '11.5px', color: '#94a3b8', marginBottom: '14px', lineHeight: '1.6', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div>🍃 <strong>MongoDB:</strong> Primary Document Store (Complex collections, nested lookups, aggregation).</div>
                <div style={{ marginTop: '4px' }}>⚡ <strong>Redis:</strong> In-Memory Key-Value Accelerator (Stores items you open for ultra-fast 1ms retrieval).</div>
              </div>
            </div>
          )}

          {/* Tab 2: Redis In-Memory Key Inspector */}
          {activeTab === 'keys' && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Items currently in Redis memory:</span>
                <button
                  onClick={fetchCachedKeys}
                  disabled={loadingKeys}
                  style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
                >
                  <RefreshCw size={11} className={loadingKeys ? 'spin' : ''} /> Refresh
                </button>
              </div>

              {cachedKeys.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', color: '#94a3b8', fontSize: '12px' }}>
                  No keys in Redis right now.<br />
                  <span style={{ fontSize: '11px', opacity: 0.8 }}>Open a project or client to cache it into Redis!</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                  {cachedKeys.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '9px 11px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        fontSize: '11.5px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Zap size={12} /> {item.typeLabel}
                        </span>
                        <span style={{ fontSize: '10px', color: '#94a3b8', background: 'rgba(0,0,0,0.4)', padding: '1px 5px', borderRadius: '4px' }}>
                          TTL: {item.ttl}s
                        </span>
                      </div>

                      <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '2px', wordBreak: 'break-all' }}>
                        {item.preview}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <code style={{ fontSize: '9.5px', color: '#94a3b8', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.key}>
                          {item.key}
                        </code>
                        <button
                          onClick={() => setSelectedKeyData(selectedKeyData?.key === item.key ? null : item)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#38bdf8',
                            cursor: 'pointer',
                            fontSize: '10.5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            padding: '2px 4px'
                          }}
                        >
                          {selectedKeyData?.key === item.key ? <EyeOff size={11} /> : <Eye size={11} />}
                          {selectedKeyData?.key === item.key ? 'Hide' : 'Inspect'}
                        </button>
                      </div>

                      {/* Expanded JSON Inspector for this key */}
                      {selectedKeyData?.key === item.key && (
                        <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(0,0,0,0.6)', borderRadius: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                          <pre style={{ margin: 0, fontSize: '10px', color: '#a7f3d0', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {JSON.stringify(item.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {notice && (
            <div style={{ fontSize: '12px', padding: '8px 10px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', marginBottom: '12px' }}>
              {notice}
            </div>
          )}

          {/* Action Demonstration Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              title="Refresh page to demonstrate Redis HIT speedup"
            >
              <RefreshCw size={13} /> Refresh (Demonstrate HIT)
            </button>

            <button
              onClick={handleInvalidate}
              disabled={invalidating}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                background: 'rgba(239, 68, 68, 0.18)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              title="Evict all keys from Redis to demonstrate MongoDB fallback"
            >
              <Trash2 size={13} /> Evict Redis (Demonstrate MISS)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoSqlDemoDock;
