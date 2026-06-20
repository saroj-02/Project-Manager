const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    content: { type: String, required: true },
    author: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const taskPermissionSchema = new mongoose.Schema({
    username: { type: String, required: true },
    accessLevel: { type: String, enum: ['allow', 'view-only', 'hidden'], default: 'allow' }
});

const taskSchema = new mongoose.Schema({
    projectId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    columnId: { type: String, default: 'todo' },
    assignee: { type: String },
    dueDate: { type: Date },
    labels: [{ type: String }],
    permissions: [taskPermissionSchema],
    comments: [commentSchema]
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
