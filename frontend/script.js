const API = "http://127.0.0.1:5000";

let currentHallId = null;
/* ---------------- LOGIN ---------------- */
async function login(e) {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));

        if (data.user.role === "admin") location.href = "admin.html";
        else if (data.user.role === "lecturer") location.href = "index.html";
        else location.href = "student.html";
    } else {
        alert(data.error);
    }
}

/* ---------------- REGISTER ---------------- */
async function register(e) {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;

    const res = await fetch(`${API}/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name,
            email,
            password,
            role
        })
    });

    const data = await res.json();

    // Email already exists
    if (
        data.message &&
        data.message.includes("Email already registered")
    ) {
        alert("This email is already registered. Please login instead.");
        return;
    }

    // Lecturer verification failed
    if (
        role === "lecturer" &&
        data.message &&
        data.message.includes("Lecturer verification failed")
    ) {
        alert("No lecturer details found in database. Please register as a student.");
        return;
    }

    // Success
    alert(data.message || "Registered successfully");

    location.href = "login.html";
}
/* ---------------- LOGOUT ---------------- */
function logout() {
    localStorage.removeItem("user");
    location.href = "login.html";
}

/* ---------------- LOAD DATA ---------------- */
async function loadRooms() {
    const select = document.getElementById("roomSelect");
    if (!select) return;

    const res = await fetch(`${API}/rooms`);
    const data = await res.json();

    select.innerHTML = `<option disabled selected>Select Room</option>`;

    data.forEach(room => {
        // ❌ Skip halls under maintenance
        if (room.status === "Maintenance") return;

        select.innerHTML += `
            <option value="${room.id}">
                ${room.room_name} (${room.building})
            </option>
        `;
    });
}
async function loadLecturers() {
    const select = document.getElementById("lecturerSelect");
    if (!select) return;

    const res = await fetch(`${API}/users`);
    const data = await res.json();

    select.innerHTML = `<option disabled selected>Select Lecturer</option>`;
    data.filter(u => u.role === "lecturer")
        .forEach(l => {
            select.innerHTML += `<option value="${l.id}">${l.name}</option>`;
        });
}

async function loadCourses() {
    const select = document.getElementById("courseSelect");
    if (!select) return;

    const res = await fetch(`${API}/courses`);
    const data = await res.json();

    select.innerHTML = `<option disabled selected>Select Course</option>`;
    data.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
}

/* ---------------- CREATE SCHEDULE ---------------- */
async function createSchedule(event) {
    event.preventDefault();

    const data = {
        course_id: document.getElementById("courseSelect").value,
        lecturer_id: document.getElementById("lecturerSelect").value,
        room_id: document.getElementById("roomSelect").value,
        day: document.getElementById("day").value,
        start_time: document.getElementById("startTime").value,
        end_time: document.getElementById("endTime").value
    };

    const res = await fetch(`${API}/schedule`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data)
    });

    const result = await res.json();
    alert(result.message || result.error);

    loadSchedules();
}

/* ---------------- GRID ---------------- */
function generateGrid() {
    const grid = document.getElementById("timetableGrid");
    if (!grid) return;

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const times = [
        "07:00","08:00","09:00","10:00",
        "11:00","12:00","13:00","14:00",
        "15:00","16:00","17:00","18:00"
    ];

    grid.innerHTML = "";

    grid.innerHTML += `<div class="grid-header"></div>`;
    days.forEach(d => grid.innerHTML += `<div class="grid-header">${d}</div>`);

    times.forEach(time => {
        grid.innerHTML += `<div class="time-cell">${time}</div>`;
        days.forEach((d, i) => {
            grid.innerHTML += `<div class="grid-cell" id="cell-${i}-${time}"></div>`;
        });
    });
}

/* ---------------- LOAD SCHEDULES (FULL HEIGHT BLOCKS) ---------------- */
async function loadSchedules() {
    const res = await fetch(`${API}/schedules`);
    const data = await res.json();

    generateGrid();

    const map = {
        Monday: 0,
        Tuesday: 1,
        Wednesday: 2,
        Thursday: 3,
        Friday: 4
    };

    data.forEach(s => {
        const dayIndex = map[s.day];

        // Extract start and end hour
        let startHour = parseInt(s.start_time.split(":")[0]);
        let endHour = parseInt(s.end_time.split(":")[0]);

        // Format first cell ID
        let formattedTime = `${startHour.toString().padStart(2, "0")}:00`;

        const firstCell = document.getElementById(
            `cell-${dayIndex}-${formattedTime}`
        );

        if (firstCell) {
            // Number of hours occupied
            const duration = endHour - startHour;

            // Make the lecture block span multiple rows
            firstCell.innerHTML = `
                <div class="class-block"
                     style="
                        height: calc(${duration} * 100%);
                        min-height: ${duration * 80}px;
                     ">
                    <strong>${s.course}</strong><br>
                    <small>${s.lecturer}</small><br>
                    <small>${s.room}</small><br>
                    <small>${s.start_time} - ${s.end_time}</small>
                </div>
            `;
        }
    });

    const totalSchedules = document.getElementById("totalSchedules");
    if (totalSchedules) {
        totalSchedules.innerText = data.length;
    }
}
/* ---------------- ADMIN ---------------- */
async function addUser() {
    const user = JSON.parse(localStorage.getItem("user"));

    const name = document.getElementById("newName").value;
    const email = document.getElementById("newEmail").value;
    const password = document.getElementById("newPassword").value;
    const role = document.getElementById("newRole").value;

    if (!name || !email || !password) {
        alert("Fill all fields");
        return;
    }

    const res = await fetch(`${API}/admin/add_user`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            admin_id: user.id,
            name, email, password, role
        })
    });

    const data = await res.json();
    alert(data.message || data.error);

    loadUsers();
}

async function deleteUser(id) {
    const user = JSON.parse(localStorage.getItem("user"));

    await fetch(`${API}/admin/delete_user/${id}?admin_id=${user.id}`, {
        method: "DELETE"
    });

    loadUsers();
}

async function loadUsers() {
    const res = await fetch(`${API}/users`);
    const data = await res.json();

    const table = document.getElementById("usersTable");
    if (!table) return;

    table.innerHTML = "";

    data.forEach(u => {
        table.innerHTML += `
        <tr>
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td>${u.role}</td>
            <td><button onclick="deleteUser(${u.id})">Delete</button></td>
        </tr>`;
    });

    const totalUsers = document.getElementById("totalUsers");
    if (totalUsers) totalUsers.innerText = data.length;
}

/* ---------------- HALLS ---------------- */

// LOAD HALLS
async function loadHalls() {
    try {
        const res = await fetch(`${API}/halls`);
        const data = await res.json();

        const table = document.getElementById("hallsTable");
        if (!table) return;

        table.innerHTML = "";

        // ✅ EMPTY STATE
        if (!data || data.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; padding:20px;">
                        🚫 No halls found. Add one above.
                    </td>
                </tr>
            `;
            return;
        }

        data.forEach(h => {

            // ✅ SAFE DEFAULTS (prevents undefined issue)
            const name = h.name || "—";
            const building = h.building || "—";
            const capacity = h.capacity || "—";
            const type = h.type || "—";
            const status = h.status || "Unknown";

            // ✅ STATUS STYLE
            const statusClass = status === "Active" ? "active" : "maintenance";

            table.innerHTML += `
            <tr>
                <td>${name}</td>
                <td>${building}</td>
                <td>${capacity}</td>
                <td>${type}</td>

                <td>
                    <span class="status ${statusClass}">
                        ${status}
                    </span>
                </td>

                <td>
                    <div style="display:flex; gap:5px;">

                        <!-- ⚡ Toggle -->
                        <button class="btn-small btn-toggle"
                            onclick="toggleHall(${h.id}, '${status}')"
                            title="Toggle Status">
                            ⚡
                        </button>

                        <!-- ✏️ Edit -->
                        <button class="btn-small btn-edit"
                            onclick="editHall(${h.id})"
                            title="Edit Hall">
                            ✏️
                        </button>

                        <!-- 🗑 Delete -->
                        <button class="btn-small btn-delete"
                            onclick="deleteHall(${h.id})"
                            title="Delete Hall">
                            🗑
                        </button>

                    </div>
                </td>
            </tr>`;
        });

    } catch (error) {
        console.error("Error loading halls:", error);

        const table = document.getElementById("hallsTable");
        if (table) {
            table.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; color:red;">
                        ❌ Failed to load halls
                    </td>
                </tr>
            `;
        }
    }
}
// ADD HALL
async function addHall() {
    const data = {
        room_name: hallName.value,
        building: hallBuilding.value,
        capacity: hallCapacity.value,
        type: hallType.value,
        status: hallStatus.value
    };

    const res = await fetch(`${API}/halls`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data)
    });

    const result = await res.json();
    alert(result.message || result.error);

    loadHalls();
}


// DELETE
async function deleteHall(id) {
    await fetch(`${API}/halls/${id}`, { method: "DELETE" });
    loadHalls();
}


// TOGGLE STATUS
async function toggleHall(id, currentStatus) {
    const newStatus = currentStatus === "Active" ? "Maintenance" : "Active";

    await fetch(`${API}/update_hall/${id}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ status: newStatus })
    });

    loadHalls();
}
async function toggleHall(id) {
    await fetch(`${API}/halls/toggle/${id}`, {
        method: "PUT"
    });

    loadHalls();
}
// EDIT HALL (simple prompt version)
async function editHall(id) {
    const res = await fetch(`${API}/halls`);
    const data = await res.json();

    const hall = data.find(h => h.id === id);

    currentHallId = id;

    editName.value = hall.name;
    editBuilding.value = hall.building;
    editCapacity.value = hall.capacity;
    editType.value = hall.type || "Lecture Hall";
    editStatus.value = hall.status || "Active";

    document.getElementById("editModal").style.display = "block";
}
/* close modal */
function closeModal() {
    document.getElementById("editModal").style.display = "none";
}
/* save changes */
async function saveHall() {
    const data = {
        name: editName.value,
        building: editBuilding.value,
        capacity: editCapacity.value,
        type: editType.value,
        status: editStatus.value
    };

    await fetch(`${API}/update_hall/${currentHallId}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data)
    });

    closeModal();
    loadHalls();
}

/* FILTER HALLS */
function filterHalls() {
    const input = document.getElementById("searchHall").value.toLowerCase();
    const rows = document.querySelectorAll("#hallsTable tr");

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(input) ? "" : "none";
    });
}

/* ---------------- PDF ---------------- */
function downloadPDF() {
    const element = document.getElementById("timetableGrid");
    html2pdf().from(element).save("VenueFlow_Timetable.pdf");
}

/* ---------------- INIT ---------------- */
window.onload = function () {

    const user = JSON.parse(localStorage.getItem("user"));
    const page = window.location.pathname.split("/").pop();

    // Prevent login flicker
    if (!user && page !== "login.html" && page !== "register.html") {
        location.href = "login.html";
        return;
    }

    // Admin
    if (page === "admin.html") {
        loadUsers();
        loadSchedules();
        loadCourses();
        loadLecturers();
        loadRooms();
    }
    //
    if (page === "halls.html") {
        loadHalls();
    }
    // Lecturer
    if (page === "index.html") {
        loadRooms();
        loadCourses();
        loadLecturers();
        loadSchedules();
    }

    // Student
    if (page === "student.html") {
        loadSchedules(); // ✅ FIXED
    }
};