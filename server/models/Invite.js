const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    projectName: { type: String, required: true },
    sender: { type: String, required: true },
    recipient: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Invite', inviteSchema);
