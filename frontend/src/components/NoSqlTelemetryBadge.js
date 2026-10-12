import React from 'react';
import { Zap, Database, RefreshCw, Trash2 } from 'lucide-react';
import api from '../utils/api';

/**
 * On-Screen NoSQL Performance & Cache Telemetry Badge
 * Designed for immediate, impressive demonstration to faculty.
 */
const NoSqlTelemetryBadge = ({ telemetry, onRefetch, compact = false }) => {
  const [clearing, setClearing] = React.useState(false);

  if (!telemetry) return null;

  const isRedis = telemetry.source === 'redis' || telemetry.cacheStatus === 'HIT';
  const duration = telemetry.roundTripMs || telemetry.backendMs || 0;

  const handleClearCache = async (e) => {
    e.stopPropagation();
    try {
      setClearing(true);
      await api.post('/cache/invalidate');
      if (onRefetch) {
        setTimeout(onRefetch, 100);
      }
    } catch (err) {
      console.error('Error clearing cache', err);
    } finally {
      setTimeout(() => setClearing(false), 400);
    }
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: compact ? '4px 10px' : '6px 14px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.2px',
        background: isRedis
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.08) 100%)'
          : 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(37, 99, 235, 0.08) 100%)',
        border: isRedis
          ? '1px solid rgba(16, 185, 129, 0.4)'
          : '1px solid rgba(59, 130, 246, 0.4)',
        color: isRedis ? '#065f46' : '#1e40af',
        boxShadow: isRedis
          ? '0 2px 8px rgba(16, 185, 129, 0.15)'
          : '0 2px 8px rgba(59, 130, 246, 0.15)',
        transition: 'all 0.25s ease',
        userSelect: 'none'
      }}
      title={isRedis ? 'Served directly from Redis in-memory cache' : 'Queried from MongoDB document store & cached to Redis'}
    >
      {/* Icon */}
      {isRedis ? (
        <span style={{ display: 'flex', alignItems: 'center', color: '#10b981' }}>
          <Zap size={15} style={{ filter: 'drop-shadow(0 0 4px rgba(16,185,129,0.5))' }} />
        </span>
      ) : (
        <span style={{ display: 'flex', alignItems: 'center', color: '#3b82f6' }}>
          <Database size={15} style={{ filter: 'drop-shadow(0 0 4px rgba(59,130,246,0.5))' }} />
        </span>
      )}

      {/* Latency and Storage Layer */}
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <strong style={{ fontSize: '13px', color: isRedis ? '#047857' : '#1d4ed8' }}>
          {duration} ms
        </strong>
        <span style={{ opacity: 0.6 }}>•</span>
        <span>
          {isRedis ? 'Redis Key-Value (HIT)' : 'MongoDB Document (MISS)'}
        </span>
        {telemetry.cacheKey && (
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              background: isRedis ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.15)',
              padding: '1px 6px',
              borderRadius: '4px',
              fontWeight: 500
            }}
            title={`Redis Cache Key: ${telemetry.cacheKey}`}
          >
            🔑 {telemetry.cacheKey.split(':')[0]}:{telemetry.cacheKey.split(':')[1]}
          </span>
        )}
      </span>

      {/* Quick Action Buttons for Faculty Demonstration */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
        {onRefetch && (
          <button
            onClick={onRefetch}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px 4px',
              cursor: 'pointer',
              color: isRedis ? '#047857' : '#1d4ed8',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Refresh query to demonstrate Redis HIT speedup"
          >
            <RefreshCw size={13} />
          </button>
        )}
        <button
          onClick={handleClearCache}
          disabled={clearing}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '2px 4px',
            cursor: 'pointer',
            color: '#dc2626',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            opacity: clearing ? 0.4 : 0.85
          }}
          title="Invalidate Redis cache to trigger fresh MongoDB MISS"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};

export default NoSqlTelemetryBadge;
