const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    company_name: { type: String },
    contact_person: { type: String },
    email: { type: String },
    phone: { type: String },
    location: { type: String },
    address: { type: String },
    industry: { type: String },
    status: { type: String, default: 'active' },
    allotted_budget: { type: Number, default: 0 },
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: [
      {
        note: String,
        author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        created_at: { type: Date, default: Date.now }
      }
    ],
    contacts: [
      {
        first_name: String,
        last_name: String,
        email: String,
        phone: String,
        role: { type: String, default: 'Contact' }
      }
    ]
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

clientSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

module.exports = mongoose.model('Client', clientSchema);
