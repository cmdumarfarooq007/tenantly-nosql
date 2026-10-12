const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    subdomain: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['active', 'suspended', 'inactive'], default: 'active' },
    subscription_plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    max_users: { type: Number, default: 5 },
    max_projects: { type: Number, default: 3 },
    logo_url: { type: String, default: '' },
    headline: { type: String, default: '' },
    website: { type: String, default: '' },
    public_email: { type: String, default: '' },
    public_phone: { type: String, default: '' },
    location: { type: String, default: '' },
    about: { type: String, default: '' }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

tenantSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

module.exports = mongoose.model('Tenant', tenantSchema);
