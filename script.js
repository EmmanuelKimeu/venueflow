// 1. NAVIGATION TAB LOGIC
function showSection(sectionId) {
    document.querySelectorAll('.dashboard-section').forEach(section => section.classList.add('hidden'));
    document.getElementById(sectionId + '-section').classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    if (event) event.currentTarget.classList.add('active');
}

// 2. NAME SYNCING & PERSISTENCE LOGIC
function syncName(val) {
    // Update both input fields simultaneously
    document.getElementById('headerNameInput').value = val;
    document.getElementById('lecturerInput').value = val;
    
    // Save the name to localStorage so it persists after refresh
    localStorage.setItem('lecturerName', val);
}

// 3. SAVE SCHEDULE
function saveSchedule() {
    const course = document.getElementById('courseInput').value;
    const room = document.getElementById('roomInput').value;
    const day = document.getElementById('dayInput').value;
    const timeSlot = document.getElementById('timeInput').value;
    const lecturer = document.getElementById('lecturerInput').value;

    if (!lecturer) {
        alert("Please enter a lecturer name first!");
        return;
    }

    const newSchedule = { course, room, day, timeSlot, lecturer };
    let schedules = JSON.parse(localStorage.getItem('savedSchedules')) || [];
    
    // Clash check
    if (schedules.find(s => s.day === day && s.timeSlot === timeSlot)) {
        alert("This slot is already occupied!");
        return;
    }

    schedules.push(newSchedule);
    localStorage.setItem('savedSchedules', JSON.stringify(schedules));

    alert("Booking Saved Successfully!");
    renderTable();
    showSection('timetable');
}

// 4. DELETE SCHEDULE
function deleteSchedule(index) {
    if (confirm("Remove this lecture?")) {
        let schedules = JSON.parse(localStorage.getItem('savedSchedules')) || [];
        schedules.splice(index, 1);
        localStorage.setItem('savedSchedules', JSON.stringify(schedules));
        renderTable();
    }
}

// 5. RENDER TABLE
function renderTable() {
    document.querySelectorAll('.timetable td:not(.day-label)').forEach(td => td.innerHTML = "");

    const schedules = JSON.parse(localStorage.getItem('savedSchedules')) || [];
    const bookingCountEl = document.getElementById('bookingCount');
    if (bookingCountEl) bookingCountEl.innerText = schedules.length;

    schedules.forEach((item, index) => {
        const cellId = `${item.day}-${item.timeSlot}`;
        const cell = document.getElementById(cellId);
        
        if (cell) {
            cell.innerHTML = `
                <div class="course-slot">
                    <button class="delete-btn" onclick="deleteSchedule(${index})">&times;</button>
                    <strong>${item.course.split(' - ')[0]}</strong><br>
                    <span style="font-size: 9px; opacity: 0.8;">By: ${item.lecturer}</span><br>
                    <span>${item.room}</span>
                </div>`;
        }
    });
}

// 6. INITIALIZE PAGE ON LOAD
window.onload = function() {
    // Retrieve the saved name or default to Victor Munene
    const savedName = localStorage.getItem('lecturerName') || "Victor Munene";
    syncName(savedName);
    renderTable();
};