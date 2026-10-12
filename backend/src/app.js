const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorMiddleware');
const connectDB = require('./config/db');

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Cache', 'X-Source', 'X-Response-Time', 'x-cache', 'x-source', 'x-response-time']
}));
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tenants', require('./routes/tenantRoutes'));
app.use('/api', require('./routes/userRoutes'));
app.use('/api/clients', require('./routes/clientRoutes'));
app.use('/api/meetings', require('./routes/meetingRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api', require('./routes/taskRoutes'));
app.use('/api/activities', require('./routes/activityRoutes'));

const { initRedis, isRedisReady, deleteCachePattern, getAllCachedKeysDetails, getDefaultTTL, setRuntimeTTL } = require('./config/redis');
const ddb = require('./config/dynamodb');
initRedis();

// NoSQL Demonstration & Cache Management Endpoints
app.get('/api/cache/keys', async (req, res) => {
    try {
        const keys = await getAllCachedKeysDetails();
        res.json({
            success: true,
            redisReady: isRedisReady(),
            configuredTTL: getDefaultTTL(),
            count: keys.length,
            keys
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Update Redis Cache TTL dynamically
app.post('/api/cache/ttl', async (req, res) => {
    try {
        const { ttl } = req.body;
        const newTTL = setRuntimeTTL(ttl);
        res.json({
            success: true,
            configuredTTL: newTTL,
            message: `Redis cache TTL successfully set to ${newTTL} seconds.`
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/cache/invalidate', async (req, res) => {
    try {
        await deleteCachePattern('*');
        res.json({ success: true, message: 'All Redis cache keys successfully evicted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});



// Health Check
app.get('/api/health', async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const dbState = mongoose.connection.readyState;
        res.json({
            status: 'ok',
            database: dbState === 1 ? 'connected' : 'disconnected',
            redis: isRedisReady() ? 'connected' : 'disconnected',
            dynamodb: ddb.isConfigured() ? 'connected' : 'disconnected'
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

app.use(errorHandler);

const { initScheduler } = require('./utils/scheduler');

// Start Server Function
const startServer = async () => {
    try {
        await connectDB();
        initRedis();
        initScheduler();
        const PORT = process.env.PORT || 5000;
        const server = app.listen(PORT, () => console.log(`🚀 Backend Server running on port ${PORT}`));
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} is already in use. Terminate any running process using port ${PORT} or choose another port in .env.`);
                process.exit(1);
            } else {
                console.error('❌ Server error:', err);
            }
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err);
    }
};

if (require.main === module) {
    startServer();
}

module.exports = app;
