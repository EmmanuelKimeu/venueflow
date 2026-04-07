/**
 * VENUEFLOW CORE LOGIC v3.5
 * Features: Smart Redirect, First-Login Security, Role Detection, Absence Modal
 */

let isPermissionGranted = false; 
let pendingDeleteIndex = null;   

// =========================================
// 1. AUTHENTICATION & REDIRECTION LOGIC
// =========================================

function handleAuth(event, type) {
    event.preventDefault();

    if (type === 'login') {
        const email = document.getElementById('login-email').value.toLowerCase();
        const pass = document.getElementById('login-pass').value;
        const name = email.split('@')[0];

        // SIMULATION: How the system "knows" the role without a dropdown
        let role = "Lecturer"; 
        if (email.includes("admin")) role = "Admin";
        if (email.includes("student") || !email.includes("egerton.ac.ke")) role = "Student";

        // SIMULATION: First login check (Lecturers/Admins use 'egerton123' first)
        if ((role === 'Lecturer' || role === 'Admin') && pass === 'egerton123') {
            document.getElementById('login-card').classList.add('hidden');
            document.getElementById('change-pass-card').classList.remove('hidden');
            localStorage.setItem('temp_user', name);
            localStorage.setItem('temp_role', role);
            return;
        }

        localStorage.setItem('currentUser', name);
        localStorage.setItem('userRole', role);
        proceedToDashboard();
    } else {
        // Student Registration
        const name = document.getElementById('reg-name').value;
        localStorage.setItem('currentUser', name);
        localStorage.setItem('userRole', 'Student');
        proceedToDashboard();
    }
}

function finishPasswordUpdate(e) {
    e.preventDefault();
    const p1 = document.getElementById('new-pass').value;
    const p2 = document.getElementById('confirm-pass').value;
    if (p1 !== p2) { alert("Passwords do not match!"); return; }

    const name = localStorage.getItem('temp_user');
    const role = localStorage.getItem('temp_role');
    
    localStorage.setItem('currentUser', name);
    localStorage.setItem('userRole', role);
    localStorage.removeItem('temp_user');
    localStorage.removeItem('temp_role');
    
    alert("Security updated!");
    proceedToDashboard();
}

// SMART REDIRECTOR: Sends user to the correct team member's page
function proceedToDashboard() {
    const role = localStorage.getItem('userRole');
    if (role === 'Lecturer') window.location.href = 'index.html';
    else if (role === 'Student') window.location.href = 'student.html';
    else if (role === 'Admin') window.location.href = 'admin.html';
}

function handleLogout() {
    localStorage.clear();
    window.location.href = 'authentication.html';
}

// =========================================
// 2. DASHBOARD LOGIC (Preserved)
// =========================================

function showSection(sectionId) {
    if ((sectionId === 'create' || sectionId === 'availability') && !isPermissionGranted) {
        alert("Locked: Admin permission required."); return;
    }
    document.querySelectorAll('.dashboard-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(sectionId + '-section').classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
    if (sectionId === 'availability') renderAvailability();
}

function togglePermission() {
    isPermissionGranted = !isPermissionGranted;
    const badge = document.getElementById('statusBadge');
    const rescheduleBtn = document.getElementById('rescheduleTabBtn');
    const availBtn = document.getElementById('availabilityTabBtn');
    const btnText = document.getElementById('permBtnText');
    const btn = document.getElementById('permSimBtn');

    if (isPermissionGranted) {
        badge.textContent = "Mode: Edit Enabled"; badge.className = "status-badge edit-mode";
        rescheduleBtn.classList.remove('locked-nav');
        availBtn.classList.remove('locked-nav');
        btnText.textContent = "Revoke Permission";
        btn.style.background = "#3b82f6"; btn.style.color = "white";
    } else {
        badge.textContent = "Mode: View Only"; badge.className = "status-badge view-only";
        rescheduleBtn.classList.add('locked-nav');
        availBtn.classList.add('locked-nav');
        btnText.textContent = "Grant Permission";
        btn.style.background = "white"; btn.style.color = "#3b82f6";
        showSection('timetable'); 
    }
}

// =========================================
// 3. GRID & SCHEDULING (Single-cell Fixed)
// =========================================

function saveSchedule() {
    const name = document.getElementById('lecturerInput').value;
    const course = document.getElementById('courseInput').value;
    const room = document.getElementById('roomInput').value;
    const day = document.getElementById('dayInput').value; 
    const start = document.getElementById('startTimeInput').value;
    const end = document.getElementById('endTimeInput').value;
    if (!name || !start || !end) { alert("Fill all fields."); return; }

    const rowId = (parseInt(start.split(':')[0]) - 7) + 1;
    const newEntry = { name, course, room, day, start, end, rowId, timeRange: `${start} - ${end}` };
    let schedules = JSON.parse(localStorage.getItem('savedSchedules')) || [];
    if (schedules.find(s => s.day === day && s.rowId === rowId)) { alert("Cell occupied."); return; }
    schedules.push(newEntry);
    localStorage.setItem('savedSchedules', JSON.stringify(schedules));
    renderTable(); showSection('timetable');
}

function renderTable() {
    const tbody = document.getElementById('timetableBody');
    if (!tbody) return;
    tbody.innerHTML = "";
    for(let i = 0; i < 12; i++) {
        tbody.innerHTML += `<tr><td id="MON-${i+1}"></td><td id="TUE-${i+1}"></td><td id="WED-${i+1}"></td><td id="THU-${i+1}"></td><td id="FRI-${i+1}"></td></tr>`;
    }
    const schedules = JSON.parse(localStorage.getItem('savedSchedules')) || [];
    document.getElementById('bookingCount').innerText = schedules.length;
    const rooms = Array.from(document.getElementById('roomInput').options).map(o => o.value);
    const occupied = new Set(schedules.map(s => s.room)).size;
    document.getElementById('totalHallsDisplay').innerText = rooms.length;
    document.getElementById('availableHallsDisplay').innerText = rooms.length - occupied;

    schedules.forEach((item, index) => {
        const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
        const cell = document.getElementById(`${days[item.day]}-${item.rowId}`);
        if (cell) {
            cell.innerHTML = `<div class="course-slot">
                <button class="delete-btn" onclick="openReasonModal(${index})">&times;</button>
                <span class="slot-time-badge">${item.timeRange}</span>
                <strong>${item.course.split(' - ')[0]}</strong><br>
                <span style="font-size:9px; color:#64748b">By: ${item.name}</span>
                <div style="color:#3b82f6; font-weight:700; margin-top:auto">${item.room}</div>
            </div>`;
        }
    });
}

function renderAvailability() {
    const grid = document.getElementById('availabilityGrid');
    const s = JSON.parse(localStorage.getItem('savedSchedules')) || [];
    const rooms = Array.from(document.getElementById('roomInput').options).map(o => o.value);
    const occupied = new Set(s.map(i => i.room));
    grid.innerHTML = "";
    rooms.forEach(r => {
        if(!occupied.has(r)) {
            grid.innerHTML += `<div class="hall-card"><span class="status-tag">Free</span><b>${r}</b><br><small>Main Campus</small><div class="hall-details"><div>Seats: 150</div><div>WiFi: OK</div></div><button class="reserve-btn" onclick="quickBook('${r}')">Book Hall</button></div>`;
        }
    });
}

function quickBook(h) {
    if(!isPermissionGranted) { alert("Admin Permission required."); return; }
    document.getElementById('roomInput').value = h; showSection('create');
}

function openReasonModal(index) {
    if (!isPermissionGranted) { alert("Admin permission required."); return; }
    pendingDeleteIndex = index;
    document.getElementById('reasonModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('reasonModal').classList.add('hidden');
}

function confirmRescheduleRequest() {
    const reason = document.getElementById('rescheduleReasonText').value;
    if (!reason.trim()) { alert("Provide a reason."); return; }
    let s = JSON.parse(localStorage.getItem('savedSchedules')) || [];
    s.splice(pendingDeleteIndex, 1);
    localStorage.setItem('savedSchedules', JSON.stringify(s));
    closeModal(); renderTable();
}

// =========================================
// 4. SECURITY GUARD (Runs on page load)
// =========================================
window.onload = function() {
    const user = localStorage.getItem('currentUser');
    const role = localStorage.getItem('userRole');

    // If on dashboard (index.html), ensure user is a LECTURER
    if (window.location.pathname.includes('index.html')) {
        if (!user || role !== 'Lecturer') {
            alert("Access Denied: Redirecting to Login.");
            window.location.href = 'authentication.html';
            return;
        }
        document.getElementById('headerNameDisplay').textContent = user;
        document.getElementById('lecturerInput').value = user;
    }
    
    renderTable();
};