const API_BASE = '/api';

// State
let currentUser = null;
let currentSession = null;

// DOM Elements
const sectionIds = ['dashboard', 'users', 'requests'];
const eventLog = document.getElementById('event-log');
const userTableBody = document.getElementById('user-table-body');
const breachAlertCard = document.getElementById('breach-alert-card');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    refreshData();
    setInterval(refreshData, 5000); // Auto-refresh every 5s

    // Unified Login/Registration is now only in the Auth Gate

    // Forms (Auth Gate)
    document.getElementById('login-form-gate').addEventListener('submit', handleLoginGate);
    document.getElementById('register-form-gate').addEventListener('submit', handleRegisterGate);
});

// View Switching Logic
function switchGate(type) {
    const loginForm = document.getElementById('gate-login-form');
    const registerForm = document.getElementById('gate-register-form');
    const tabs = document.querySelectorAll('.tab-btn');

    if (type === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
    }
}

function unlockApp(username) {
    console.log("Starting Security Handshake for:", username);
    currentUser = username;

    const gate = document.getElementById('auth-gate');
    const processing = document.getElementById('processing-gate');
    const dashboard = document.getElementById('dashboard-root');
    const progressBar = document.getElementById('handshake-progress');
    const statusText = document.getElementById('handshake-status');
    const bitScroller = document.getElementById('bit-scroller');

    // Role detection
    const isAdmin = username.toLowerCase() === 'admin';
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
        if (isAdmin) el.classList.remove('hidden');
        else el.classList.add('hidden');
    });

    // Phase 1: Close Login Gate
    if (gate) gate.classList.add('hidden');

    // Phase 2: Show Handshake
    if (processing) {
        processing.classList.remove('hidden');
        processing.style.display = 'flex';

        let progress = 0;
        const steps = [
            "DECRYPTING DSA TOKENS...",
            "VERIFYING HASHTABLE INTEGRITY...",
            "SYNCHRONIZING SECURE SESSION...",
            "HANDSHAKE COMPLETE"
        ];

        // Start bit scroller
        const bitInterval = setInterval(() => {
            if (bitScroller) {
                const bits = Array(40).fill(0).map(() => Math.round(Math.random())).join(' ');
                bitScroller.innerText = bits + "\n" + bitScroller.innerText.split("\n").slice(0, 2).join("\n");
            }
        }, 100);

        const interval = setInterval(() => {
            progress += 5;
            if (progressBar) progressBar.style.width = progress + '%';

            if (statusText) {
                const stepIdx = Math.floor((progress / 100) * steps.length);
                statusText.innerText = steps[Math.min(stepIdx, steps.length - 1)];
            }

            if (progress >= 100) {
                clearInterval(interval);
                clearInterval(bitInterval);

                // Phase 3: Final Transition to Dashboard
                setTimeout(() => {
                    if (processing) {
                        processing.style.opacity = '0';
                        setTimeout(() => {
                            processing.classList.add('hidden');
                            if (dashboard) {
                                dashboard.classList.remove('hidden');
                                dashboard.style.display = 'grid';
                                dashboard.style.opacity = '1';
                                addLog(`Dashboard unlocked for user: ${username}`, 'success');
                                refreshData();
                                if (window.feather) feather.replace();
                            }
                        }, 500);
                    }
                }, 1000); // 1 second buffer for visual effect
            }
        }, 80);
    }
}

function handleLogout() {
    currentUser = null;
    const dashboard = document.getElementById('dashboard-root');
    const gate = document.getElementById('auth-gate');
    const processing = document.getElementById('processing-gate');

    // Hide all admin items on logout
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));

    if (dashboard) {
        dashboard.classList.add('hidden');
        dashboard.style.display = 'none';
    }
    if (processing) {
        processing.classList.add('hidden');
        processing.style.display = 'none';
    }
    if (gate) {
        gate.classList.remove('hidden');
        gate.style.display = 'flex';
        gate.style.opacity = '1';
    }
    addLog('Security session terminated.', 'system');
}

// Navigation
function showSection(id) {
    sectionIds.forEach(sid => {
        document.getElementById(`section-${sid}`).classList.add('hidden');
        document.querySelector(`.nav-item[onclick="showSection('${sid}')"]`).classList.remove('active');
    });

    document.getElementById(`section-${id}`).classList.remove('hidden');
    document.querySelector(`.nav-item[onclick="showSection('${id}')"]`).classList.add('active');

    if (id === 'users') refreshData();
    if (id === 'requests') refreshRequests();
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
    const isAdmin = currentUser && currentUser.toLowerCase() === 'admin';
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
                ${isAdmin ? `
                    <button class="mini-btn" onclick="toggleLock('${user.username}', ${user.isLocked})">
                        ${user.isLocked ? 'Unlock' : 'Lock'}
                    </button>
                ` : `<span class="dim-text">Restricted</span>`}
            </td>
        `;
        userTableBody.appendChild(row);
    });
}

async function handleLoginGate(e) {
    e.preventDefault();
    const username = document.getElementById('log-username-gate').value;
    const password = document.getElementById('log-password-gate').value;
    const ipAddress = "127.0.0.1";

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, ipAddress })
        });
        const data = await res.json();

        if (data.success) {
            notify(`Access Granted: Welcome ${username}`, 'success');
            unlockApp(username);
            if (data.breachDetected) {
                setTimeout(() => {
                    notify("SECURITY ALERT: Unusual activity detected!", "error");
                    addLog("CRITICAL: Breach detection triggered for " + username, "error");
                }, 1000);
            }
        } else {
            notify(data.message, 'error');
            if (res.status === 403) showMajorAlert(data.message);
        }
    } catch (err) {
        notify("Network error", "error");
    }
}

async function handleRegisterGate(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username-gate').value;
    const email = document.getElementById('reg-email-gate').value;
    const password = document.getElementById('reg-password-gate').value;

    try {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();

        if (data.success) {
            notify("Identity Created! You can now login.", "success");
            switchGate('login');
        } else {
            notify(data.message, 'error');
        }
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

// Request System
async function requestUnlock(username) {
    if (!username) {
        notify("Username required to request unlock.", "error");
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/request-unlock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const data = await res.json();
        if (data.success) {
            notify("Unlock Request Sent!", "success");
            const btn = document.querySelector('#lockout-major-alert button');
            if (btn) btn.innerText = "REQUEST SENT";
            if (btn) btn.disabled = true;
        } else {
            notify(data.message, "error");
        }
    } catch (err) {
        notify("Connection failed", "error");
    }
}

async function refreshRequests() {
    try {
        const res = await fetch(`${API_BASE}/unlock-requests`);
        const requests = await res.json();
        const body = document.getElementById('request-table-body');
        if (!body) return;

        body.innerHTML = '';
        requests.forEach(req => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${req.username}</td>
                <td>${req.timestamp}</td>
                <td><span class="badge ${req.status === 'pending' ? 'badge-primary' : (req.status === 'approved' ? 'badge-success' : 'badge-error')}">${req.status.toUpperCase()}</span></td>
                <td>
                    ${req.status === 'pending' ? `
                        <button class="mini-btn success-btn" onclick="handleRequest('${req.username}', 'approve')">Approve</button>
                        <button class="mini-btn error-btn" onclick="handleRequest('${req.username}', 'deny')">Deny</button>
                    ` : '<span class="dim-text">Processed</span>'}
                </td>
            `;
            body.appendChild(row);
        });
    } catch (err) {
        notify("Failed to load requests", "error");
    }
}

async function handleRequest(username, action) {
    try {
        const res = await fetch(`${API_BASE}/handle-unlock-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, action })
        });
        const data = await res.json();
        if (data.success) {
            notify(`Request ${action}d!`, "success");
            refreshRequests();
            refreshData(); // Refresh user table too
        } else {
            notify(data.message, "error");
        }
    } catch (err) {
        notify("Action failed", "error");
    }
}

// Utils
function showMajorAlert(msg) {
    const old = document.getElementById('lockout-major-alert');
    if (old) old.remove();
    const alert = document.createElement('div');
    alert.id = 'lockout-major-alert';
    alert.style = `background:#ff4d4d;color:white;padding:20px;margin:10px 0;border-radius:12px;font-weight:bold;text-align:center;border:2px solid white;box-shadow:0 0 20px rgba(255,77,77,0.5);animation:pulse 1s infinite;`;

    // Check if it's a regular user message
    const instruction = msg.toLowerCase().includes("locked") ?
        `<br><small>Please contact System Admin to request an unlock.</small>
         <button class="btn-primary mini-btn" style="margin-top:10px" onclick="requestUnlock('${document.getElementById('log-username-gate').value}')">
            Submit Unlock Request
         </button>` :
        "<br><small>Security Protocol: Lockdown Initiated</small>";

    alert.innerHTML = `⚠️ <span style="font-size: 1.1rem">${msg}</span> ⚠️${instruction}`;

    // Target the gate first if it's visible, otherwise targets the dashboard section
    const gate = document.getElementById('auth-gate');
    if (!gate.classList.contains('hidden')) {
        gate.querySelector('.gate-card').prepend(alert);
    } else {
        const target = document.getElementById('section-requests') || document.getElementById('section-dashboard');
        if (target) target.prepend(alert);
    }
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
