const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: ["https://your-netlify-url.netlify.app", "http://localhost:3000"],
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Add environment variables
require('dotenv').config();
const PORT = process.env.PORT || 8080;
const MONGODB_URI = process.env.MONGODB_URI || 'your_mongodb_uri';

// MongoDB connection
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    });

// Message Schema
const messageSchema = new mongoose.Schema({
    name: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Socket.IO Connection
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });

    // Listen for new messages
    socket.on('new message', async (messageData) => {
        try {
            const message = new Message(messageData);
            await message.save();
            // Broadcast the message to all connected clients
            io.emit('message received', message);
        } catch (error) {
            console.error('Error saving message:', error);
        }
    });
});

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Server is running' });
});

app.post('/api/messages', async (req, res) => {
    try {
        const message = new Message(req.body);
        await message.save();
        // Emit to all clients when a new message is posted via REST
        io.emit('message received', message);
        res.status(201).json(message);
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: -1 });
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: error.message });
    }
});

// View messages route
app.get('/view-messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: -1 });
        res.json({
            total: messages.length,
            messages: messages
        });
    } catch (error) {
        console.error('Error viewing messages:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});
