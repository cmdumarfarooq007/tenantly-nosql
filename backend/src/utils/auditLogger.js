const AuditLog = require('../models/AuditLog');

const logAction = async (tenantId, userId, action, entityType, entityId, ipAddress) => {
  try {
    await AuditLog.create({
      tenant_id: tenantId || null,
      user_id: userId || null,
      action,
      entity_type: entityType,
      entity_id: entityId ? entityId.toString() : null,
      ip_address: ipAddress
    });
  } catch (error) {
    console.error('Audit Log Error:', error);
  }
};

module.exports = logAction;