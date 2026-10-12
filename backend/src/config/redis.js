require('dotenv').config();
const Redis = require('ioredis');

let redisClient = null;
let isConnected = false;

/**
 * Initialize Redis Client with fallback and retry strategy
 */
const initRedis = () => {
    try {
        const host = process.env.REDIS_HOST || '127.0.0.1';
        const port = parseInt(process.env.REDIS_PORT, 10) || 6379;

        redisClient = new Redis({
            host,
            port,
            retryStrategy: (times) => {
                const delay = Math.min(times * 200, 3000);
                return delay;
            },
            maxRetriesPerRequest: 1,
            connectTimeout: 2000,
            lazyConnect: false
        });

        redisClient.on('connect', () => {
            isConnected = true;
            console.log(`✅ Redis connected successfully to: redis://${host}:${port}`);
        });

        redisClient.on('ready', () => {
            isConnected = true;
        });

        redisClient.on('error', (err) => {
            isConnected = false;
            // Suppress repeating spam on disconnect, log concise notice
            if (process.env.NODE_ENV !== 'test') {
                const msg = err.errors ? err.errors.map(e => e.message).join(', ') : err.message;
                console.warn(`⚠️ [Redis] Connection notice: ${msg || err.code || 'Not connected'}`);
            }
        });

        redisClient.on('close', () => {
            isConnected = false;
        });

        redisClient.on('end', () => {
            isConnected = false;
        });

    } catch (err) {
        console.warn('⚠️ [Redis] Initialization error:', err.message);
    }
};

/**
 * Retrieve JSON cached value
 */
const getCache = async (key) => {
    if (!redisClient || !isConnected) return null;
    try {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    } catch (err) {
        console.warn(`⚠️ [Redis] Error getting key ${key}:`, err.message);
        return null;
    }
};

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

let runtimeTTL = null;

/**
 * Dynamically resolves TTL directly from memory or .env so any change is picked up immediately
 * without requiring manual server restarts.
 */
const getDefaultTTL = () => {
    if (runtimeTTL !== null && runtimeTTL > 0) {
        return runtimeTTL;
    }
    try {
        const envPath = path.resolve(__dirname, '../../.env');
        if (fs.existsSync(envPath)) {
            const parsed = dotenv.parse(fs.readFileSync(envPath));
            if (parsed.REDIS_TTL) {
                return parseInt(parsed.REDIS_TTL, 10);
            }
        }
    } catch (e) {
        // Fallback to process.env
    }
    return parseInt(process.env.REDIS_TTL, 10) || 60;
};

/**
 * Change TTL dynamically at runtime and write it to .env
 */
const setRuntimeTTL = (newTtl) => {
    const parsed = parseInt(newTtl, 10);
    if (!isNaN(parsed) && parsed > 0) {
        runtimeTTL = parsed;
        process.env.REDIS_TTL = String(parsed);
        try {
            const envPath = path.resolve(__dirname, '../../.env');
            if (fs.existsSync(envPath)) {
                let content = fs.readFileSync(envPath, 'utf8');
                if (/^REDIS_TTL=\d+/m.test(content)) {
                    content = content.replace(/^REDIS_TTL=\d+/m, `REDIS_TTL=${parsed}`);
                } else {
                    content += `\nREDIS_TTL=${parsed}\n`;
                }
                fs.writeFileSync(envPath, content, 'utf8');
                console.log(`⏱️ [Redis] TTL updated to ${parsed}s and saved to .env`);
            }
        } catch (err) {
            console.warn('⚠️ [Redis] Error writing REDIS_TTL to .env:', err.message);
        }
        return parsed;
    }
    return getDefaultTTL();
};


/**
 * Save value in Redis as JSON with TTL in seconds (defaults to REDIS_TTL from .env)
 */
const setCache = async (key, value, ttlSeconds) => {
    if (!redisClient || !isConnected) return false;
    try {
        const ttl = (ttlSeconds !== undefined && ttlSeconds !== null) ? ttlSeconds : getDefaultTTL();
        await redisClient.set(key, JSON.stringify(value), 'EX', ttl);
        return true;
    } catch (err) {
        console.warn(`⚠️ [Redis] Error setting key ${key}:`, err.message);
        return false;
    }
};


/**
 * Delete a specific key
 */
const deleteCache = async (key) => {
    if (!redisClient || !isConnected) return false;
    try {
        await redisClient.del(key);
        return true;
    } catch (err) {
        console.warn(`⚠️ [Redis] Error deleting key ${key}:`, err.message);
        return false;
    }
};

/**
 * Invalidate keys matching a pattern (e.g. 'projects:tenant123:*')
 */
const deleteCachePattern = async (pattern) => {
    if (!redisClient || !isConnected) return false;
    try {
        const stream = redisClient.scanStream({
            match: pattern,
            count: 100
        });

        const keysToDelete = [];
        for await (const chunk of stream) {
            if (chunk && chunk.length > 0) {
                keysToDelete.push(...chunk);
            }
        }

        if (keysToDelete.length > 0) {
            await redisClient.del(...keysToDelete);
            console.log(`🧹 [Redis Cache] Invalidated ${keysToDelete.length} key(s) matching "${pattern}"`);
        }
        return true;
    } catch (err) {
        console.warn(`⚠️ [Redis] Error deleting pattern ${pattern}:`, err.message);
        return false;
    }
};

const getAllCachedKeysDetails = async () => {
    if (!redisClient || !isConnected) return [];
    try {
        const stream = redisClient.scanStream({
            match: '*',
            count: 100
        });

        const keys = [];
        for await (const chunk of stream) {
            if (chunk && chunk.length > 0) {
                keys.push(...chunk);
            }
        }

        const details = [];
        for (const key of keys) {
            const [ttl, rawVal] = await Promise.all([
                redisClient.ttl(key),
                redisClient.get(key)
            ]);

            let parsed = null;
            let preview = '';
            let typeLabel = 'Key-Value';

            if (key.startsWith('project:detail:')) {
                typeLabel = 'Opened Project Document';
            } else if (key.startsWith('client:detail:')) {
                typeLabel = 'Opened Client Document';
            } else if (key.startsWith('tasks:project:')) {
                typeLabel = 'Opened Project Tasks';
            } else if (key.startsWith('tasks:workspace:')) {
                typeLabel = 'Dashboard Workspace Tasks';
            } else if (key.startsWith('meetings:')) {
                typeLabel = 'Dashboard Meetings';
            } else if (key.startsWith('projects:')) {
                typeLabel = 'Dashboard / Projects List';
            } else if (key.startsWith('clients:')) {
                typeLabel = 'Dashboard / Clients List';
            } else if (key.startsWith('tenant_details:')) {
                typeLabel = 'Dashboard Workspace Stats';
            } else if (key.startsWith('employees:')) {
                typeLabel = 'Dashboard / Employees List';
            } else if (key.startsWith('tenants:')) {
                typeLabel = 'Dashboard / Tenants (SuperAdmin)';
            }


            try {
                parsed = JSON.parse(rawVal);
                if (parsed?.projects && Array.isArray(parsed.projects) && parsed.projects[0]?.name) {
                    preview = parsed.projects[0].name;
                } else if (parsed?.users && Array.isArray(parsed.users)) {
                    preview = `${parsed.users.length} employees`;
                } else if (parsed?.name) {
                    preview = `${parsed.name} (${parsed.company_name || 'Client'})`;
                } else if (parsed?.tasks && Array.isArray(parsed.tasks)) {
                    preview = `${parsed.tasks.length} tasks`;
                } else if (Array.isArray(parsed)) {
                    preview = `${parsed.length} items`;
                } else if (parsed?.company_name) {
                    preview = parsed.company_name;
                } else {
                    preview = Object.keys(parsed || {}).slice(0, 3).join(', ');
                }
            } catch {
                preview = (rawVal || '').slice(0, 40);
            }

            details.push({
                key,
                ttl,
                typeLabel,
                preview: preview || key,
                sizeBytes: rawVal ? Buffer.byteLength(rawVal, 'utf8') : 0,
                data: parsed
            });
        }

        details.sort((a, b) => a.key.localeCompare(b.key));
        return details;
    } catch (err) {
        console.warn('⚠️ [Redis] Error getting cached keys details:', err.message);
        return [];
    }
};

const isRedisReady = () => isConnected;

module.exports = {
    initRedis,
    getCache,
    setCache,
    deleteCache,
    deleteCachePattern,
    getAllCachedKeysDetails,
    getDefaultTTL,
    setRuntimeTTL,
    isRedisReady,
    get client() { return redisClient; }
};



