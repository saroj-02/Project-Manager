require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const connectDB = require('./db');
const User = require('./models/User');
const Project = require('./models/Project');
const Task = require('./models/Task');

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'project-manager-secret-key-12345';

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        const token = jwt.sign({ id: newUser._id, username: newUser.username }, JWT_SECRET);
        res.status(201).json({ token, user: { id: newUser._id, username: newUser.username } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET);
        res.json({ token, user: { id: user._id, username: user.username } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Middleware
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Project Routes
app.get('/api/projects', authenticate, async (req, res) => {
    try {
        const userProjects = await Project.find({
            $or: [
                { members: req.user.username },
                { owner: req.user.username }
            ]
        });
        // Map _id to id for frontend compatibility
        const formattedProjects = userProjects.map(p => ({ ...p.toObject(), id: p._id }));
        res.json(formattedProjects);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/projects', authenticate, async (req, res) => {
    try {
        const { name, description } = req.body;
        const newProject = new Project({
            name,
            description,
            owner: req.user.username,
            members: [req.user.username],
            columns: [
                { id: 'todo', title: 'To Do' },
                { id: 'in-progress', title: 'In Progress' },
                { id: 'done', title: 'Done' }
            ]
        });
        await newProject.save();
        res.status(201).json({ ...newProject.toObject(), id: newProject._id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/projects/:projectId/members', authenticate, async (req, res) => {
    try {
        const { username } = req.body;
        const project = await Project.findById(req.params.projectId);

        if (!project) return res.status(404).json({ message: 'Project not found' });
        if (project.owner !== req.user.username) {
            return res.status(403).json({ message: 'Only the owner can add members' });
        }

        const userExists = await User.findOne({ username });
        if (!userExists) return res.status(404).json({ message: 'User not found' });

        if (project.members.includes(username)) {
            return res.status(400).json({ message: 'User already a member' });
        }

        project.members.push(username);
        await project.save();
        
        io.to(req.params.projectId).emit('member-added', { projectId: req.params.projectId, username });
        res.json({ message: 'Member added successfully', members: project.members });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.delete('/api/projects/:projectId', authenticate, async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        
        if (project.owner !== req.user.username) {
            return res.status(403).json({ message: 'Only the owner can delete the project' });
        }
        
        await Project.findByIdAndDelete(req.params.projectId);
        await Task.deleteMany({ projectId: req.params.projectId });
        
        res.json({ message: 'Project deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Task Routes
app.get('/api/projects/:projectId/tasks', authenticate, async (req, res) => {
    try {
        const projectTasks = await Task.find({ projectId: req.params.projectId });
        const formattedTasks = projectTasks.map(t => ({ ...t.toObject(), id: t._id }));
        res.json(formattedTasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/projects/:projectId/tasks', authenticate, async (req, res) => {
    try {
        const { title, description, columnId, assignee } = req.body;
        const newTask = new Task({
            projectId: req.params.projectId,
            title,
            description,
            columnId: columnId || 'todo',
            assignee,
            comments: []
        });
        await newTask.save();
        const formattedTask = { ...newTask.toObject(), id: newTask._id };
        io.to(req.params.projectId).emit('task-created', formattedTask);
        res.status(201).json(formattedTask);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.patch('/api/tasks/:taskId', authenticate, async (req, res) => {
    try {
        const updatedTask = await Task.findByIdAndUpdate(
            req.params.taskId,
            { $set: req.body },
            { new: true }
        );
        
        if (!updatedTask) return res.status(404).json({ message: 'Task not found' });

        const formattedTask = { ...updatedTask.toObject(), id: updatedTask._id };
        io.to(updatedTask.projectId).emit('task-updated', formattedTask);
        res.json(formattedTask);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.delete('/api/tasks/:taskId', authenticate, async (req, res) => {
    try {
        const task = await Task.findById(req.params.taskId);
        if (!task) return res.status(404).json({ message: 'Task not found' });
        
        const projectId = task.projectId;
        await Task.findByIdAndDelete(req.params.taskId);
        
        io.to(projectId).emit('task-deleted', req.params.taskId);
        res.json({ message: 'Task deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Comments
app.post('/api/tasks/:taskId/comments', authenticate, async (req, res) => {
    try {
        const { content } = req.body;
        const task = await Task.findById(req.params.taskId);

        if (!task) return res.status(404).json({ message: 'Task not found' });

        const newComment = {
            content,
            author: req.user.username,
            createdAt: new Date()
        };
        
        task.comments.push(newComment);
        await task.save();
        
        // Get the last comment (the one we just added) to include its generated _id
        const savedComment = task.comments[task.comments.length - 1];
        const formattedComment = { ...savedComment.toObject(), id: savedComment._id };
        
        io.to(task.projectId).emit('comment-added', { taskId: req.params.taskId, comment: formattedComment });
        res.status(201).json(formattedComment);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Socket logic
io.on('connection', (socket) => {
    console.log('a user connected');
    
    socket.on('join-project', (projectId) => {
        socket.join(projectId);
        console.log(`User joined project: ${projectId}`);
    });

    socket.on('leave-project', (projectId) => {
        socket.leave(projectId);
        console.log(`User left project: ${projectId}`);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
