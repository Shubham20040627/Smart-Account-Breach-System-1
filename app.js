const API_BASE = 'http://localhost:5000/api';

// State
let currentUser = null;
let currentSession = null;

// DOM Elements
const sectionIds = ['dashboard', 'users', 'auth'];
const eventLog = document.getElementById('event-log');
const userTableBody = document.getElementById('user-table-body');
const breachAlertCard = document.getElementById('breach-alert-card');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    refreshData();
    setInterval(refreshData, 5000); // Auto-refresh every 5s

    // Forms
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('login-form').addEventListener('submit', handleLogin);
});

// Navigation
function showSection(id) {
    sectionIds.forEach(sid => {
        document.getElementById(`section-${sid}`).classList.add('hidden');
        document.querySelector(`.nav-item[onclick="showSection('${sid}')"]`).classList.remove('active');
    });

    document.getElementById(`section-${id}`).classList.remove('hidden');
    document.querySelector(`.nav-item[onclick="showSection('${id}')"]`).classList.add('active');

    if (id === 'users') refreshUserTable();
}

// Logging
function addLog(message, type = 'system') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString();
    entry.innerText = `[${time}] ${message}`;
    eventLog.prepend(entry);
}

// Data Fetching
async function refreshData() {
    try {
        const response = await fetch(`${API_BASE}/users`);
        const users = await response.json();

        // Update Stats
        document.getElementById('stat-users').innerText = users.length;
        const lockedCount = users.filter(u => u.isLocked).length;
        document.getElementById('stat-locked').innerText = lockedCount;

        const hasBreach = users.some(u => u.isLocked || u.failedAttempts >= 3);
        if (hasBreach) {
            document.getElementById('stat-threat').innerText = 'ELEVATED';
            breachAlertCard.classList.add('breach-detected');
        } else {
            document.getElementById('stat-threat').innerText = 'CLEAN';
            breachAlertCard.classList.remove('breach-detected');
        }

        if (document.getElementById('section-users').classList.contains('hidden') === false) {
            renderUserTable(users);
        }
    } catch (err) {
        console.error("Failed to fetch data", err);
    }
}

async function renderUserTable(users) {
    userTableBody.innerHTML = '';
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${user.failedAttempts}</td>
            <td>
                <span class="badge ${user.isLocked ? 'badge-error' : 'badge-success'}">
                    ${user.isLocked ? 'LOCKED' : 'SECURE'}
                </span>
            </td>
            <td>
                <button class="mini-btn" onclick="toggleLock('${user.username}', ${user.isLocked})">
                    ${user.isLocked ? 'Unlock' : 'Lock'}
                </button>
            </td>
        `;
        userTableBody.appendChild(row);
    });
}

// Handlers
async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();

        if (data.success) {
            addLog(`User ${username} registered successfully.`, 'success');
            notify(`User ${username} created!`, 'success');
            e.target.reset();
        } else {
            addLog(`Registration failed: ${data.message}`, 'error');
            notify(data.message, 'error');
        }
    } catch (err) {
        notify("Network error", "error");
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('log-username').value;
    const password = document.getElementById('log-password').value;
    const ipAddress = "127.0.0.1"; // Simulated

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, ipAddress })
        });
        const data = await res.json();

        if (data.success) {
            addLog(`Login successful for ${username}. Breach: ${data.breachDetected ? 'YES' : 'NO'}.`, 'success');
            notify(`Welcome back, ${username}!`, 'success');
            const oldAlert = document.getElementById('lockout-major-alert');
            if (oldAlert) oldAlert.remove();
            if (data.breachDetected) {
                notify("SECURITY ALERT: Unusual activity detected!", "error");
                addLog("CRITICAL: Breach detection triggered for " + username, "error");
            }
            e.target.reset();
        } else {
            const errorMsg = data.attemptsRemaining
                ? `${data.message} (${data.attemptsRemaining} attempts left)`
                : data.message;
            addLog(`Login failed for ${username}: ${errorMsg}`, 'error');
            notify(errorMsg, 'error');
            if (res.status === 403) showMajorAlert(data.message);
        }
        refreshData();
    } catch (err) {
        notify("Network error", "error");
    }
}

async function toggleLock(username, isLocked) {
    const endpoint = isLocked ? 'unlock' : 'lock';
    try {
        await fetch(`${API_BASE}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        addLog(`User ${username} ${isLocked ? 'unlocked' : 'locked'} by admin.`);
        refreshData();
    } catch (err) {
        notify("Failed to toggle lock", "error");
    }
}

// Utils
function showMajorAlert(msg) {
    const old = document.getElementById('lockout-major-alert');
    if (old) old.remove();
    const alert = document.createElement('div');
    alert.id = 'lockout-major-alert';
    alert.style = `background:#ff4d4d;color:white;padding:20px;margin:20px 0;border-radius:8px;font-weight:bold;text-align:center;border:2px solid white;box-shadow:0 0 20px rgba(255,77,77,0.5);animation:pulse 1s infinite;`;
    alert.innerHTML = `⚠️ <span style="font-size: 1.2rem">${msg}</span> ⚠️<br><small>System Lockdown in effect</small>`;
    document.getElementById('section-auth').prepend(alert);
}

function notify(msg, type = 'info') {
    const area = document.getElementById('notification-area');
    const toast = document.createElement('div');
    toast.className = 'notification';
    if (type === 'error') toast.style.borderLeftColor = 'var(--error)';
    if (type === 'success') toast.style.borderLeftColor = 'var(--success)';
    toast.innerText = msg;
    area.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}
