const { getTenantActivities, testConnection, isConfigured, tableName } = require('../config/dynamodb');

/**
 * GET /api/activities
 * Fetches recent tenant activity stream from AWS DynamoDB
 */
exports.getActivities = async (req, res) => {
  try {
    const tenantId = req.user.role === 'super_admin' && req.query.tenantId 
      ? req.query.tenantId 
      : req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tenant ID is required to retrieve activities.' 
      });
    }

    const limit = parseInt(req.query.limit, 10) || 25;
    const activities = await getTenantActivities(tenantId, limit);

    res.json({
      success: true,
      dynamodbActive: isConfigured(),
      count: activities.length,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/activities/status
 * Check DynamoDB connectivity and table status
 */
exports.getStatus = async (req, res) => {
  try {
    const result = await testConnection();
    res.json({
      success: true,
      configured: isConfigured(),
      tableName,
      ...result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
