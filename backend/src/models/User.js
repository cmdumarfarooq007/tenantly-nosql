const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true, default: null },
    email: { type: String, required: true },
    password_hash: { type: String, required: true },
    full_name: { type: String, required: true },
    role: { 
      type: String, 
      enum: ['super_admin', 'tenant_admin', 'employee', 'manager', 'user'], 
      default: 'employee' 
    },
    avatar_url: { type: String, default: '' },
    is_active: { type: Boolean, default: true }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

userSchema.index({ tenant_id: 1, email: 1 }, { unique: true, sparse: true });

userSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

module.exports = mongoose.model('User', userSchema);
