// Variable to keep track if Admin has given us permission
let isPermissionGranted = false;
// Variable to hold the index of a booking while we ask for a reason to delete it
let pendingDeleteIndex = null;

// Function to handle logging in or registering
function handleAuth(event, type) {
    event.preventDefault(); // Stop page from refreshing
    // Get the name from the input or the email
    let name = type === 'login' ? document.getElementById('login-email').value.split('@')[0] : document.getElementById('reg-name').value;
    // Save the user's name in the browser memory
    localStorage.setItem('currentUser', name);
    
    // Show a message that login worked
    alert("Login successful! Welcome back, " + name);
    
    // Go to the main dashboard
    window.location.href = 'index.html';
}

// Function to log out of the portal
function handleLogout() {
    // Show a message before leaving
    alert("You have been logged out. See you next time!");
    // Forget the user and go back to the login page
    localStorage.removeItem('currentUser'); 
    window.location.href = 'authentication.html';
}

// Function to switch between Dashboard, Reschedule, and Availability tabs
function showSection(sectionId) {
    // Only allow Reschedule or Availability tabs if permission is granted
    if ((sectionId === 'create' || sectionId === 'availability') && !isPermissionGranted) {
        alert("Access Denied: You need Admin permission to use this feature."); 
        return;
    }
    // Hide all dashboard sections
    document.querySelectorAll('.dashboard-section').forEach(s => s.classList.add('hidden'));
    // Show only the section we clicked
    document.getElementById(sectionId + '-section').classList.remove('hidden');
    
    // Highlight the active button in the sidebar
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
    
    // Refresh the hall cards if we opened the availability page
    if (sectionId === 'availability') renderAvailability();
}

// Function to simulate an Admin granting or taking away permission
function togglePermission() {
    isPermissionGranted = !isPermissionGranted; // Flip the true/false value
    const badge = document.getElementById('statusBadge');
    const rescheduleBtn = document.getElementById('rescheduleTabBtn');
    const availBtn = document.getElementById('availabilityTabBtn');
    const btnText = document.getElementById('permBtnText');
    const btn = document.getElementById('permSimBtn');

    if (isPermissionGranted) {
        // Change colors and unlock buttons if permission is ON
        badge.textContent = "Mode: Edit Enabled"; badge.className = "status-badge edit-mode";
        rescheduleBtn.classList.remove('locked-nav');
        availBtn.classList.remove('locked-nav');
        btnText.textContent = "Revoke Permission";
        btn.style.background = "#3b82f6"; btn.style.color = "white";
        
        // Alert the user that they can now edit
        alert("Permission Granted! You can now check available venues and reschedule units.");
    } else {
        // Reset colors and lock buttons if permission is OFF
        badge.textContent = "Mode: View Only"; badge.className = "status-badge view-only";
        rescheduleBtn.classList.add('locked-nav');
        availBtn.classList.add('locked-nav');
        btnText.textContent = "Grant Permission";
        btn.style.background = "white"; btn.style.color = "#3b82f6";
        
        // Alert the user that they are back in view-only mode
        alert("Permission Revoked. The dashboard is now back to View-Only mode.");
        showSection('timetable'); // Go back to view mode
    }
}

// Function to open the reason popup when clicking the 'X' button
function openReasonModal(index) {
    if (!isPermissionGranted) { 
        alert("Error: You need Admin permission to remove a scheduled unit."); 
        return; 
    }
    pendingDeleteIndex = index; // Remember which one we are deleting
    document.getElementById('reasonModal').classList.remove('hidden'); // Show modal
}

// Function to close the reason popup
function closeModal() {
    document.getElementById('reasonModal').classList.add('hidden');
    document.getElementById('rescheduleReasonText').value = ""; // Clear text
    pendingDeleteIndex = null;
}

// Function to actually remove the unit once a reason is given
function confirmRescheduleRequest() {
    const reason = document.getElementById('rescheduleReasonText').value;
    if (!reason.trim()) { 
        alert("Please type a reason before submitting."); 
        return; 
    }
    
    // Pull the list from browser memory, remove the item, and save it back
    let s = JSON.parse(localStorage.getItem('savedSchedules')) || [];
    s.splice(pendingDeleteIndex, 1);
    localStorage.setItem('savedSchedules', JSON.stringify(s));
    
    // Success message
    alert("Reason submitted. The slot has been cleared for your new booking.");
    
    closeModal(); // Hide popup
    renderTable(); // Update the screen
}

// Function to save a new lecture booking
function saveSchedule() {
    const name = document.getElementById('lecturerInput').value;
    const course = document.getElementById('courseInput').value;
    const room = document.getElementById('roomInput').value;
    const day = document.getElementById('dayInput').value; 
    const start = document.getElementById('startTimeInput').value;
    const end = document.getElementById('endTimeInput').value;
    
    if (!name || !start || !end) { 
        alert("Please make sure all fields are filled in."); 
        return; 
    }

    // Map the start time to a specific row in the grid
    const rowId = (parseInt(start.split(':')[0]) - 7) + 1;
    const newEntry = { name, course, room, day, start, end, rowId, timeRange: `${start} - ${end}` };
    
    let schedules = JSON.parse(localStorage.getItem('savedSchedules')) || [];
    // Check if the cell is already occupied
    if (schedules.find(s => s.day === day && s.rowId === rowId)) { 
        alert("There is already a class scheduled in this time !"); 
        return; 
    }
    
    schedules.push(newEntry); // Add to list
    localStorage.setItem('savedSchedules', JSON.stringify(schedules)); // Save list
    
    // Success message
    alert("Your new schedule has been saved successfully.");
    
    renderTable(); 
    showSection('timetable'); // Go back to the grid
}

// Function to draw the entire timetable and update numbers
function renderTable() {
    // 1. Build an empty grid first
    const tbody = document.getElementById('timetableBody');
    tbody.innerHTML = "";
    for(let i = 0; i < 12; i++) {
        tbody.innerHTML += `<tr><td id="MON-${i+1}"></td><td id="TUE-${i+1}"></td><td id="WED-${i+1}"></td><td id="THU-${i+1}"></td><td id="FRI-${i+1}"></td></tr>`;
    }
    
    // 2. Load the bookings
    const schedules = JSON.parse(localStorage.getItem('savedSchedules')) || [];
    document.getElementById('bookingCount').innerText = schedules.length;
    
    // 3. Update the hall availability counter (Green card)
    const rooms = Array.from(document.getElementById('roomInput').options).map(o => o.value);
    const occupied = new Set(schedules.map(s => s.room)).size;
    document.getElementById('totalHallsDisplay').innerText = rooms.length;
    document.getElementById('availableHallsDisplay').innerText = rooms.length - occupied;

    // 4. Place the blue lecture cards into the cells
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

// Function to build the hall cards on the availability page
function renderAvailability() {
    const grid = document.getElementById('availabilityGrid');
    const s = JSON.parse(localStorage.getItem('savedSchedules')) || [];
    const rooms = Array.from(document.getElementById('roomInput').options).map(o => o.value);
    const occupied = new Set(s.map(i => i.room));
    
    grid.innerHTML = "";
    rooms.forEach(r => {
        // Only show cards for halls that are NOT in our occupied list
        if(!occupied.has(r)) {
            grid.innerHTML += `<div class="hall-card">
                <span class="status-tag">Free</span>
                <b style="font-size:16px;">${r}</b><br><small style="color:#64748b;">Egerton Main Campus</small>
                <div class="hall-details"><div><i class="fas fa-users"></i> 150 Seats</div><div><i class="fas fa-wifi"></i> WiFi: OK</div></div>
                <button class="reserve-btn" onclick="quickBook('${r}')">Book Hall</button>
            </div>`;
        }
    });
}

// Function to book a specific hall from the availability tab
function quickBook(h) {
    if(!isPermissionGranted) { 
        alert("Wait! You must click 'Grant Permission' first."); 
        return; 
    }
    // Set the room in the form
    document.getElementById('roomInput').value = h; 
    alert("Hall " + h + " selected! Please fill in the course and time details.");
    showSection('create'); // Take us to the form
}

// This runs as soon as the page finishes loading
window.onload = function() {
    // Get the name of the person who logged in
    const user = localStorage.getItem('currentUser') || "Victor";
    document.getElementById('headerNameDisplay').textContent = user;
    document.getElementById('lecturerInput').value = user;
    renderTable(); // Show the grid
};