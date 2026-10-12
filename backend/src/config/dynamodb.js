const { DynamoDBClient, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const region = process.env.AWS_REGION || 'ap-south-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const tableName = process.env.DYNAMODB_TABLE_NAME || 'TenantActivity';

let isConfigured = false;
let ddbDocClient = null;

if (accessKeyId && secretAccessKey) {
  try {
    const client = new DynamoDBClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });

    ddbDocClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: true
      }
    });

    isConfigured = true;
    console.log(`⚡ AWS DynamoDB Client configured for region [${region}], table: [${tableName}]`);
  } catch (err) {
    console.warn('⚠️ [DynamoDB] Initialization error:', err.message);
  }
} else {
  console.warn('⚠️ [DynamoDB] AWS credentials not found. Activity logging will be skipped or mocked.');
}

/**
 * Test connectivity by describing the table
 */
const testConnection = async () => {
  if (!isConfigured || !ddbDocClient) return { ok: false, error: 'Not configured' };
  try {
    const rawClient = ddbDocClient.client || new DynamoDBClient({
      region,
      credentials: { accessKeyId, secretAccessKey }
    });
    const res = await rawClient.send(new DescribeTableCommand({ TableName: tableName }));
    return {
      ok: true,
      tableName: res.Table?.TableName,
      status: res.Table?.TableStatus,
      itemCount: res.Table?.ItemCount
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

/**
 * Log Tenant Activity to AWS DynamoDB
 * @param {Object} params
 * @param {string} params.tenantId - Tenant ObjectId or string
 * @param {string} params.eventType - e.g. 'TASK_CREATED', 'LOGIN', 'PROJECT_CREATED'
 * @param {string} params.userId - Actor User ID
 * @param {string} params.userEmail - Actor User Email
 * @param {string} params.userName - Actor User Name
 * @param {string} params.entityId - Target entity ID
 * @param {string} params.entityType - 'task', 'project', 'client', 'meeting', 'auth'
 * @param {string} params.summary - Human-readable summary
 * @param {Object} params.metadata - Extra details
 * @param {number} [params.retentionDays=30] - Auto-delete days for TTL
 */
const logTenantActivity = async ({
  tenantId,
  eventType,
  userId,
  userEmail,
  userName,
  entityId,
  entityType,
  summary,
  metadata = {},
  retentionDays = 30
}) => {
  if (!isConfigured || !ddbDocClient) {
    return false;
  }

  try {
    const safeTenantId = (tenantId || 'system').toString();
    const now = new Date();
    const eventId = uuidv4();
    const isoString = now.toISOString();

    // 2 Hours retention for DynamoDB TTL attribute (Unix epoch in seconds)
    // 2 hours = 2 * 60 * 60 = 7,200 seconds
    const ttlHours = parseFloat(process.env.DYNAMODB_TTL_HOURS) || 2;
    const expiresAt = Math.floor(now.getTime() / 1000) + Math.round(ttlHours * 3600);

    const item = {
      PK: `TENANT#${safeTenantId}`,
      SK: `TIMESTAMP#${isoString}#${eventId}`,
      eventId,
      tenantId: safeTenantId,
      eventType,
      userId: userId ? userId.toString() : null,
      userEmail: userEmail || null,
      userName: userName || null,
      entityId: entityId ? entityId.toString() : null,
      entityType: entityType || 'activity',
      summary: summary || `${eventType} executed`,
      metadata,
      createdAt: isoString,
      'tenantly-dynamo-ttl': expiresAt,
      expiresAt
    };

    await ddbDocClient.send(new PutCommand({
      TableName: tableName,
      Item: item
    }));

    return true;
  } catch (err) {
    console.warn(`⚠️ [DynamoDB] Failed to log activity [${eventType}]:`, err.message);
    return false;
  }
};

/**
 * Retrieve Recent Tenant Activities from DynamoDB
 * @param {string} tenantId - Tenant ID
 * @param {number} limit - Maximum activities to fetch (default 25)
 */
const getTenantActivities = async (tenantId, limit = 25) => {
  if (!isConfigured || !ddbDocClient) {
    return [];
  }

  try {
    const safeTenantId = (tenantId || 'system').toString();
    const response = await ddbDocClient.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `TENANT#${safeTenantId}`
      },
      ScanIndexForward: false, // Descending order (newest first)
      Limit: limit
    }));

    return (response.Items || []).map(item => ({
      id: item.eventId,
      eventType: item.eventType,
      entityType: item.entityType,
      entityId: item.entityId,
      summary: item.summary,
      userEmail: item.userEmail,
      userName: item.userName,
      metadata: item.metadata,
      createdAt: item.createdAt,
      expiresAt: item.expiresAt
    }));
  } catch (err) {
    console.warn('⚠️ [DynamoDB] Failed to query activities:', err.message);
    return [];
  }
};

module.exports = {
  isConfigured: () => isConfigured,
  testConnection,
  logTenantActivity,
  getTenantActivities,
  tableName
};
