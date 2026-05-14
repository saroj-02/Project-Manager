const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    owner: { type: String, required: true },
    members: [{ type: String }],
    columns: [{
        id: { type: String, required: true },
        title: { type: String, required: true }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
