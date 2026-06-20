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
const Invite = require('./models/Invite');

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
        
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ message: 'Email already registered' });
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
        // Allow login with either username or email
        const user = await User.findOne({
            $or: [
                { username: username },
                { email: username }
            ]
        });

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

app.post('/api/projects/:projectId/invites', authenticate, async (req, res) => {
    try {
        const { username } = req.body;
        const project = await Project.findById(req.params.projectId);

        if (!project) return res.status(404).json({ message: 'Project not found' });
        if (project.owner !== req.user.username) {
            return res.status(403).json({ message: 'Only the owner can invite members' });
        }

        const recipientUser = await User.findOne({ username });
        if (!recipientUser) return res.status(404).json({ message: 'User not found' });

        if (project.owner === username) {
            return res.status(400).json({ message: 'User is the owner of this project' });
        }

        if (project.members.includes(username)) {
            return res.status(400).json({ message: 'User already a member' });
        }

        const existingInvite = await Invite.findOne({
            projectId: req.params.projectId,
            recipient: username,
            status: 'pending'
        });
        if (existingInvite) {
            return res.status(400).json({ message: 'Invitation already pending for this user' });
        }

        const newInvite = new Invite({
            projectId: project._id,
            projectName: project.name,
            sender: req.user.username,
            recipient: username,
            status: 'pending'
        });

        await newInvite.save();

        io.to(`user:${username}`).emit('invite-received', {
            id: newInvite._id,
            projectId: newInvite.projectId,
            projectName: newInvite.projectName,
            sender: newInvite.sender,
            recipient: newInvite.recipient,
            status: newInvite.status,
            createdAt: newInvite.createdAt
        });

        res.status(201).json({ message: 'Invitation sent successfully', invite: newInvite });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/invites', authenticate, async (req, res) => {
    try {
        const invites = await Invite.find({ recipient: req.user.username, status: 'pending' });
        const formattedInvites = invites.map(i => ({ ...i.toObject(), id: i._id }));
        res.json(formattedInvites);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/invites/:inviteId/respond', authenticate, async (req, res) => {
    try {
        const { action } = req.body;
        if (!['accept', 'reject'].includes(action)) {
            return res.status(400).json({ message: 'Invalid action' });
        }

        const invite = await Invite.findById(req.params.inviteId);
        if (!invite) return res.status(404).json({ message: 'Invitation not found' });

        if (invite.recipient !== req.user.username) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (invite.status !== 'pending') {
            return res.status(400).json({ message: 'Invitation has already been processed' });
        }

        if (action === 'accept') {
            const project = await Project.findById(invite.projectId);
            if (!project) {
                invite.status = 'rejected';
                await invite.save();
                return res.status(404).json({ message: 'Project no longer exists' });
            }

            if (!project.members.includes(req.user.username)) {
                project.members.push(req.user.username);
                await project.save();
            }

            invite.status = 'accepted';
            await invite.save();

            io.to(invite.projectId.toString()).emit('member-added', {
                projectId: invite.projectId.toString(),
                username: req.user.username
            });

            res.json({ message: 'Invitation accepted', projectId: invite.projectId });
        } else {
            invite.status = 'rejected';
            await invite.save();
            res.json({ message: 'Invitation rejected' });
        }
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
        const project = await Project.findById(req.params.projectId);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const isOwner = project.owner === req.user.username;
        const projectTasks = await Task.find({ projectId: req.params.projectId });
        
        // Filter out hidden tasks for non-owner members
        const filteredTasks = projectTasks.filter(task => {
            if (isOwner) return true;
            const perm = task.permissions.find(p => p.username === req.user.username);
            return !perm || perm.accessLevel !== 'hidden';
        });

        const formattedTasks = filteredTasks.map(t => ({ ...t.toObject(), id: t._id }));
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
        const task = await Task.findById(req.params.taskId);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const project = await Project.findById(task.projectId);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        // If not the owner, check task permissions
        if (project.owner !== req.user.username) {
            const userPerm = task.permissions.find(p => p.username === req.user.username);
            if (userPerm && userPerm.accessLevel !== 'allow') {
                return res.status(403).json({ message: 'You have view-only access and cannot edit this task' });
            }
        }

        const updatedTask = await Task.findByIdAndUpdate(
            req.params.taskId,
            { $set: req.body },
            { new: true }
        );
        
        const formattedTask = { ...updatedTask.toObject(), id: updatedTask._id };
        io.to(updatedTask.projectId).emit('task-updated', formattedTask);
        res.json(formattedTask);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.patch('/api/tasks/:taskId/permissions', authenticate, async (req, res) => {
    try {
        const { username, accessLevel } = req.body;
        if (!['allow', 'view-only', 'hidden'].includes(accessLevel)) {
            return res.status(400).json({ message: 'Invalid access level' });
        }

        const task = await Task.findById(req.params.taskId);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const project = await Project.findById(task.projectId);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        if (project.owner !== req.user.username) {
            return res.status(403).json({ message: 'Only the project owner can change permissions' });
        }

        const existingPermission = task.permissions.find(p => p.username === username);
        if (existingPermission) {
            existingPermission.accessLevel = accessLevel;
        } else {
            task.permissions.push({ username, accessLevel });
        }

        await task.save();

        const formattedTask = { ...task.toObject(), id: task._id };
        io.to(task.projectId).emit('task-updated', formattedTask);
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

        const project = await Project.findById(task.projectId);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        if (project.owner !== req.user.username) {
            const userPerm = task.permissions.find(p => p.username === req.user.username);
            if (userPerm && userPerm.accessLevel !== 'allow') {
                return res.status(403).json({ message: 'You have view-only access and cannot comment on this task' });
            }
        }

        const newComment = {
            content,
            author: req.user.username,
            createdAt: new Date()
        };
        
        task.comments.push(newComment);
        await task.save();
        
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
    
    socket.on('join-user', (username) => {
        socket.join(`user:${username}`);
        console.log(`User joined personal room: ${username}`);
    });
    
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

// Serve static assets in production
if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') {
    app.use(express.static(path.join(__dirname, '../dist')));

    app.get(/.*/, (req, res) => {
        res.sendFile(path.resolve(__dirname, '../dist', 'index.html'));
    });
}

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
