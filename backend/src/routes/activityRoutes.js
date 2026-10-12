const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const activityController = require('../controllers/activityController');

// All activity routes require authentication
router.get('/', verifyToken, activityController.getActivities);
router.get('/status', verifyToken, activityController.getStatus);

module.exports = router;
