const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
  {
    tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    title: { type: String, required: true },
    description: { type: String },
    agenda: { type: String },
    start_time: { type: Date, required: true },
    end_time: { type: Date, required: true },
    duration_minutes: { type: Number, default: 60 },
    meeting_link: { type: String },
    notes: { type: String },
    status: { type: String, default: 'scheduled' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

meetingSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

module.exports = mongoose.model('Meeting', meetingSchema);
