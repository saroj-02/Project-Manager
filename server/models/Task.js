const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    content: { type: String, required: true },
    author: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const taskSchema = new mongoose.Schema({
    projectId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    columnId: { type: String, default: 'todo' },
    assignee: { type: String },
    comments: [commentSchema]
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
