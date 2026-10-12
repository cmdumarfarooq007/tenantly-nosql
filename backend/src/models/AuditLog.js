const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    entity_type: { type: String },
    entity_id: { type: String },
    ip_address: { type: String }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

auditLogSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
