const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['active', 'archived', 'completed'], default: 'active' },
    start_date: { type: Date },
    end_date: { type: Date },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    budget: { type: Number, default: 0 },
    category: { type: String, default: 'General' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assigned_members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

projectSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

module.exports = mongoose.model('Project', projectSchema);
