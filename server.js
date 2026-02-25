const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Static files for frontend
app.use(express.static(path.join(__dirname)));

// Home route - serves the dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

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

const loadUsers = () => {
    const userDataPath = path.join(__dirname, 'user_data.txt');
    if (!fs.existsSync(userDataPath)) return;

    const data = fs.readFileSync(userDataPath, 'utf8');
    data.split('\n').forEach(line => {
        if (!line.trim()) return;
        const [username, password, email] = line.split(':');
        if (!username || !password) return;

        // The file now has plaintext passwords
        const newUser = new User(username, password, email);
        users.set(username, newUser);
        loginHistory.set(username, []);
        userSessions.set(username, new Set());
    });
    console.log(`[Persistence] Loaded ${users.size} users from user_data.txt`);
};

const saveUserToFile = (username, password, email) => {
    const line = `${username}:${password}:${email}\n`;
    fs.appendFileSync(path.join(__dirname, 'user_data.txt'), line);
};

const isCommonPassword = (password) => COMMON_PASSWORDS.includes(password);

const checkBreach = (username) => {
    // 1. Internal JS Logic (Fast check)
    const user = users.get(username);
    if (!user) return false;

    const history = loginHistory.get(username) || [];
    if (user.failedAttempts > 3) return true;
    if (history.length > 5) return true;

    // 2. Call EXTERNAL C++ Engine (Deep DSA Security Analysis)
    try {
        console.log(`[C++ Bridge] Calling security_engine.exe for user: ${username}`);
        const exePath = path.join(__dirname, 'security_engine.exe');
        const output = execSync(`"${exePath}" --check-breach ${username}`).toString().trim();

        console.log(`[C++ Bridge] Engine Response Raw: ${output}`);
        return output.includes("BREACH_DETECTED");
    } catch (err) {
        console.error("[C++ Bridge] Error calling engine:", err.message);
        return false; // Fallback to safe
    }
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

    saveUserToFile(username, password, email);

    const newUser = users.get(username) || new User(username, password, email);
    if (!users.has(username)) {
        users.set(username, newUser);
        loginHistory.set(username, []);
        userSessions.set(username, new Set());
    }

    res.json({ success: true, message: "User registered successfully and saved to vault!" });
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

// ==================== UNLOCK REQUESTS ====================

app.post('/api/request-unlock', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, message: "Username required" });

    const requestFile = path.join(__dirname, 'unlock_requests.txt');
    const timestamp = new Date().toLocaleString();
    const line = `${username}:${timestamp}:pending\n`;

    fs.appendFileSync(requestFile, line);
    res.json({ success: true, message: "Unlock request submitted to Administrator." });
});

app.get('/api/unlock-requests', (req, res) => {
    const requestFile = path.join(__dirname, 'unlock_requests.txt');
    if (!fs.existsSync(requestFile)) return res.json([]);

    const data = fs.readFileSync(requestFile, 'utf8');
    const requests = data.split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => {
            const [username, timestamp, status] = line.split(':');
            return { username, timestamp, status };
        });
    res.json(requests);
});

app.post('/api/handle-unlock-request', (req, res) => {
    const { username, action } = req.body; // action: approve/deny
    const requestFile = path.join(__dirname, 'unlock_requests.txt');

    if (!fs.existsSync(requestFile)) return res.status(404).json({ success: false, message: "No requests found" });

    let data = fs.readFileSync(requestFile, 'utf8');
    let lines = data.split('\n');
    let updated = false;

    const newLines = lines.map(line => {
        if (line.includes(`${username}:`) && line.includes(':pending')) {
            updated = true;
            return `${username}:${new Date().toLocaleString()}:${action === 'approve' ? 'approved' : 'denied'}`;
        }
        return line;
    });

    if (updated) {
        fs.writeFileSync(requestFile, newLines.join('\n'));
        if (action === 'approve') {
            const user = users.get(username);
            if (user) {
                user.isLocked = false;
                user.failedAttempts = 0;
            }
        }
        res.json({ success: true, message: `Request ${action}d successfully.` });
    } else {
        res.status(404).json({ success: false, message: "Pending request not found." });
    }
});

// Initial Load
loadUsers();

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
