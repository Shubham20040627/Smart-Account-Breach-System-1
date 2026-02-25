const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Static files for frontend
app.use(express.static(path.join(__dirname)));

// ==================== SIMULATED DSA STRUCTURES ====================
// These mirror the logic in the C++ templates

class User {
    constructor(username, password, email) {
        this.username = username;
        this.passwordHash = this.hashPassword(password);
        this.email = email;
        this.failedAttempts = 0;
        this.isLocked = false;
        this.lastAttemptTime = 0;
    }

    hashPassword(password) {
        return crypto.createHash('sha256').update(password).digest('hex').substring(0, 16);
    }

    verifyPassword(password) {
        return this.hashPassword(password) === this.passwordHash;
    }
}

// Global "AuthSystem" state
const users = new Map(); // Mirrored HashTable
const loginHistory = new Map(); // Map of username -> Array (Mirrored Queue)
const userSessions = new Map(); // Map of username -> Set (Mirrored LinkedList)

const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION = 60; // 1 minute for easy testing
const RATE_LIMIT = 10;
const COMMON_PASSWORDS = [
    "password", "123456", "qwerty", "abc123",
    "password123", "admin", "letmein", "welcome",
    "monkey", "dragon"
];

// ==================== HELPER FUNCTIONS ====================

const isCommonPassword = (password) => COMMON_PASSWORDS.includes(password);

const checkBreach = (username) => {
    const user = users.get(username);
    if (!user) return false;

    const history = loginHistory.get(username) || [];
    if (user.failedAttempts > 3) return true;
    if (history.length > 5) return true;
    return false;
};

// ==================== API ROUTES ====================

app.post('/api/register', (req, res) => {
    const { username, password, email } = req.body;

    if (users.has(username)) {
        return res.status(400).json({ success: false, message: "Username already exists!" });
    }

    if (password.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters long!" });
    }

    if (isCommonPassword(password)) {
        return res.status(400).json({ success: false, message: "This password is too common!" });
    }

    const newUser = new User(username, password, email);
    users.set(username, newUser);
    loginHistory.set(username, []);
    userSessions.set(username, new Set());

    res.json({ success: true, message: "User registered successfully!" });
});

app.post('/api/login', (req, res) => {
    const { username, password, ipAddress } = req.body;
    const user = users.get(username);

    if (!user) {
        return res.status(404).json({ success: false, message: "User not found!" });
    }

    const currentTime = Date.now();

    // Check Lockout
    if (user.isLocked) {
        const timeSinceLock = (currentTime - user.lastAttemptTime) / 1000;
        if (timeSinceLock > LOCKOUT_DURATION) {
            user.isLocked = false;
            user.failedAttempts = 0;
        } else {
            return res.status(403).json({
                success: false,
                message: "Account is locked. Try again later.",
                remaining: Math.ceil(LOCKOUT_DURATION - timeSinceLock)
            });
        }
    }

    // Rate Limiting (Check last 3 attempts in history)
    const history = loginHistory.get(username) || [];
    const recentAttempts = history.filter(h => (currentTime - h.timestamp) < 60000); // 1 minute window
    if (recentAttempts.length >= RATE_LIMIT) {
        return res.status(429).json({ success: false, message: "Too many login attempts. Please wait." });
    }

    const loginSuccess = user.verifyPassword(password);

    // Log Attempt (Queue-like behavior)
    history.push({ username, ipAddress, success: loginSuccess, timestamp: currentTime });
    if (history.length > 20) history.shift();
    loginHistory.set(username, history);

    if (loginSuccess) {
        user.failedAttempts = 0;
        user.lastAttemptTime = 0;

        const sessionId = username + currentTime;
        const sessions = userSessions.get(username);
        sessions.add(sessionId);

        const breachDetected = checkBreach(username);

        res.json({
            success: true,
            message: "Login successful!",
            sessionId,
            breachDetected,
            username: user.username,
            email: user.email
        });
    } else {
        user.failedAttempts++;
        user.lastAttemptTime = currentTime;

        if (user.failedAttempts >= MAX_FAILED_ATTEMPTS) {
            user.isLocked = true;
            return res.status(403).json({ success: false, message: "CRITICAL: Account locked after 3 failed attempts!" });
        } else {
            return res.status(401).json({
                success: false,
                message: "Invalid password!",
                attemptsRemaining: MAX_FAILED_ATTEMPTS - user.failedAttempts
            });
        }
    }
});

app.get('/api/users', (req, res) => {
    const userList = Array.from(users.values()).map(u => ({
        username: u.username,
        email: u.email,
        failedAttempts: u.failedAttempts,
        isLocked: u.isLocked
    }));
    res.json(userList);
});

app.get('/api/history/:username', (req, res) => {
    const history = loginHistory.get(req.params.username) || [];
    res.json(history);
});

app.post('/api/lock', (req, res) => {
    const { username } = req.body;
    const user = users.get(username);
    if (user) {
        user.isLocked = true;
        user.lastAttemptTime = Date.now();
        res.json({ success: true, message: `User ${username} locked.` });
    } else {
        res.status(404).json({ success: false, message: "User not found" });
    }
});

app.post('/api/unlock', (req, res) => {
    const { username } = req.body;
    const user = users.get(username);
    if (user) {
        user.isLocked = false;
        user.failedAttempts = 0;
        res.json({ success: true, message: `User ${username} unlocked.` });
    } else {
        res.status(404).json({ success: false, message: "User not found" });
    }
});

// Seed data
users.set("admin", new User("admin", "SecurePass123!", "admin@example.com"));
users.set("user1", new User("user1", "MyPassword456!", "user1@example.com"));
loginHistory.set("admin", []);
loginHistory.set("user1", []);
userSessions.set("admin", new Set());
userSessions.set("user1", new Set());

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
