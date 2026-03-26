const API = "http://localhost:5000";

// Load Units into dropdown
function loadUnits() {
    fetch(`${API}/units`)
    .then(res => res.json())
    .then(data => {
        const unitSelect = document.getElementById("unit");
        unitSelect.innerHTML = "";

        data.forEach(unit => {
            const option = document.createElement("option");
            option.value = unit.unit_id;
            option.textContent = `${unit.unit_code} - ${unit.unit_name}`;
            unitSelect.appendChild(option);
        });
    });
}

// Load Venues into dropdown
function loadVenues() {
    fetch(`${API}/venues`)
    .then(res => res.json())
    .then(data => {
        const venueSelect = document.getElementById("venue");
        venueSelect.innerHTML = "";

        data.forEach(venue => {
            const option = document.createElement("option");
            option.value = venue.venue_id;
            option.textContent = venue.venue_name;
            venueSelect.appendChild(option);
        });
    });
}

// Load Timetable
function loadTimetable() {
    fetch(`${API}/timetable`)
    .then(res => res.json())
    .then(data => {
        const table = document.getElementById("timetableTable");
        table.innerHTML = "";

        data.forEach(item => {
            const row = `
                <tr>
                    <td>${item.unit_name}</td>
                    <td>${item.venue_name}</td>
                    <td>${item.day}</td>
                    <td>${item.start_time} - ${item.end_time}</td>
                </tr>
            `;
            table.innerHTML += row;
        });
    });
}

// Submit form
document.getElementById("timetableForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const data = {
        unit_id: document.getElementById("unit").value,
        venue_id: document.getElementById("venue").value,
        day: document.getElementById("day").value,
        start_time: document.getElementById("start_time").value,
        end_time: document.getElementById("end_time").value
    };

    fetch(`${API}/timetable`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(() => {
        alert("Scheduled successfully");
        loadTimetable();
    });
});

// Load everything when page opens
loadUnits();
loadVenues();
loadTimetable();