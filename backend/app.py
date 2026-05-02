from flask import Flask, request, jsonify
from flask_cors import CORS
from db import get_db

app = Flask(__name__)
CORS(app)

# =========================
# BASIC ROUTE
# =========================
@app.route('/')
def home():
    return "VenueFlow API is running 🚀"


# =========================
# AUTHENTICATION
# =========================
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    conn = get_db()
    cur = conn.cursor()

    name = data['name']
    email = data['email']
    password = data['password']
    requested_role = data.get('role', 'student')

    # Default role
    final_role = "student"

    # -----------------------------
    # CHECK IF EMAIL ALREADY EXISTS
    # -----------------------------
    cur.execute("""
        SELECT id FROM users
        WHERE email = %s
    """, (email,))

    existing_user = cur.fetchone()

    if existing_user:
        return jsonify({
            "message": "Email already registered. Please login instead."
        }), 400

    # -----------------------------
    # LECTURER VERIFICATION
    # -----------------------------
    if requested_role == "lecturer":
        cur.execute("""
            SELECT id FROM users
            WHERE email = %s
            AND role = 'lecturer'
        """, (email,))

        lecturer_exists = cur.fetchone()

        if lecturer_exists:
            final_role = "lecturer"
        else:
            return jsonify({
                "message": "Lecturer verification failed"
            }), 400

    # -----------------------------
    # ADMIN CANNOT SELF REGISTER
    # -----------------------------
    if requested_role == "admin":
        final_role = "student"

    # -----------------------------
    # INSERT NEW USER
    # -----------------------------
    cur.execute("""
        INSERT INTO users (name, email, password, role)
        VALUES (%s, %s, %s, %s)
    """, (
        name,
        email,
        password,
        final_role
    ))

    conn.commit()

    return jsonify({
        "message": f"Registered successfully as {final_role}"
    })
#LOGIN-------------------------
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, name, email, role
        FROM users
        WHERE email=%s AND password=%s
    """, (data['email'], data['password']))

    user = cur.fetchone()

    if user:
        return jsonify({
            "message": "Login successful",
            "user": {
                "id": user[0],
                "name": user[1],
                "email": user[2],
                "role": user[3]
            }
        })

    return jsonify({"error": "Invalid credentials"}), 401


# =========================
# HELPER: ADMIN CHECK
# =========================
def is_admin(user_id):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT role FROM users WHERE id=%s", (user_id,))
    user = cur.fetchone()

    return user and user[0] == "admin"


# ADMIN ROUTES
@app.route('/admin/add_user', methods=['POST'])
def admin_add_user():
    data = request.get_json()

    if not is_admin(data.get("admin_id")):
        return jsonify({"error": "Unauthorized"}), 403

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO users (name, email, password, role)
        VALUES (%s, %s, %s, %s)
    """, (
        data['name'],
        data['email'],
        data['password'],
        data['role']
    ))

    conn.commit()
    return jsonify({"message": "User added successfully"})


@app.route('/admin/delete_user/<int:id>', methods=['DELETE'])
def delete_user(id):
    admin_id = request.args.get("admin_id")

    if not is_admin(admin_id):
        return jsonify({"error": "Unauthorized"}), 403

    conn = get_db()
    cur = conn.cursor()

    cur.execute("DELETE FROM users WHERE id=%s", (id,))
    conn.commit()

    return jsonify({"message": "User deleted"})

# HALLS (CRUD)

# @app.route('/halls', methods=['GET'])
# def get_halls():
#     conn = get_db()
#     cur = conn.cursor()

#     cur.execute("SELECT * FROM halls")
#     rows = cur.fetchall()

#     return jsonify([
#         {
#             "id": h[0],
#             "name": h[1],
#             "building": h[2],
#             "capacity": h[3],
#             "type": h[4],
#             "status": h[5]
#         } for h in rows
#     ])


# @app.route('/halls', methods=['POST'])
# def add_hall():
#     data = request.get_json()

#     conn = get_db()
#     cur = conn.cursor()

#     cur.execute("""
#         INSERT INTO halls (name, building, capacity, type, status)
#         VALUES (%s, %s, %s, %s, %s)
#     """, (
#         data['name'],
#         data['building'],
#         data['capacity'],
#         data['type'],
#         data['status']
#     ))

#     conn.commit()
#     return jsonify({"message": "Hall added successfully"})

# @app.route('/halls/<int:id>', methods=['DELETE'])
# def delete_hall(id):
#     conn = get_db()
#     cur = conn.cursor()

#     cur.execute("DELETE FROM halls WHERE id=%s", (id,))
#     conn.commit()

#     return jsonify({"message": "Hall deleted"})
# ROOMS = HALLS MANAGEMENT
# =========================
# HALLS (ALIAS OF ROOMS)
# =========================

# GET ALL HALLS
@app.route('/halls', methods=['GET'])
def get_halls():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT * FROM rooms")
    rows = cur.fetchall()

    return jsonify([
        {
            "id": r[0],
            "name": r[1],
            "capacity": r[2],
            "building": r[3],
            "type": r[4] if r[4] else "Lecture Hall",
            "status": r[5] if r[5] else "Active"
        }
        for r in rows
    ])


# ADD HALL
@app.route('/halls', methods=['POST'])
def add_hall():
    data = request.get_json()

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO rooms (room_name, building, capacity, type, status)
        VALUES (%s, %s, %s, %s, %s)
    """, (
        data['name'],
        data['building'],
        data['capacity'],
        data.get('type', 'Lecture Hall'),
        data.get('status', 'Active')
    ))

    conn.commit()
    return jsonify({"message": "Hall added successfully"})


# DELETE HALL
@app.route('/halls/<int:id>', methods=['DELETE'])
def delete_hall(id):
    conn = get_db()
    cur = conn.cursor()

    # prevent delete if used
    cur.execute("SELECT * FROM schedules WHERE room_id=%s", (id,))
    if cur.fetchone():
        return jsonify({"error": "Hall in use"}), 400

    cur.execute("DELETE FROM rooms WHERE id=%s", (id,))
    conn.commit()

    return jsonify({"message": "Hall deleted"})


# TOGGLE STATUS (🔥 IMPORTANT FEATURE)
@app.route('/halls/toggle/<int:id>', methods=['PUT'])
def toggle_hall(id):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT status FROM rooms WHERE id=%s", (id,))
    row = cur.fetchone()

    if not row:
        return jsonify({"error": "Hall not found"}), 404

    new_status = "Maintenance" if row[0] == "Active" else "Active"

    cur.execute("UPDATE rooms SET status=%s WHERE id=%s", (new_status, id))
    conn.commit()

    return jsonify({"message": "Status updated", "status": new_status})
# ADD ROOM
@app.route('/rooms', methods=['POST'])
def add_room():
    data = request.get_json()
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO rooms (room_name, building, capacity, type, status)
        VALUES (%s, %s, %s, %s, %s)
    """, (
        data['room_name'],
        data['building'],
        data['capacity'],
        data['type'],
        data['status']
    ))

    conn.commit()
    return jsonify({"message": "Hall added successfully"})


# UPDATE ROOM
@app.route('/rooms/<int:id>', methods=['PUT'])
def update_room(id):
    data = request.get_json()
    conn = get_db()
    cur = conn.cursor()

    # dynamic update
    fields = []
    values = []

    for key in data:
        fields.append(f"{key}=%s")
        values.append(data[key])

    values.append(id)

    query = f"UPDATE rooms SET {', '.join(fields)} WHERE id=%s"
    cur.execute(query, values)

    conn.commit()
    return jsonify({"message": "Updated successfully"})


# DELETE ROOM
@app.route('/rooms/<int:id>', methods=['DELETE'])
def delete_room(id):
    conn = get_db()
    cur = conn.cursor()

    # Check if hall is used in schedules
    cur.execute("SELECT * FROM schedules WHERE room_id=%s", (id,))
    if cur.fetchone():
        return jsonify({"error": "Hall is in use and cannot be deleted"}), 400

    cur.execute("DELETE FROM rooms WHERE id=%s", (id,))
    conn.commit()

    return jsonify({"message": "Deleted"})

# ROOMS & COURSES
@app.route('/rooms', methods=['GET'])
def get_rooms():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT * FROM rooms")
    rows = cur.fetchall()

    return jsonify([
    {
        "id": r[0],
        "room_name": r[1],
        "capacity": r[2],
        "building": r[3],
        "type": r[4],
        "status": r[5]
    }
    for r in rows
])

@app.route('/courses', methods=['GET'])
def get_courses():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT * FROM courses")
    rows = cur.fetchall()

    return jsonify([
        {"id": c[0], "code": c[1], "name": c[2]}
        for c in rows
    ])


# =========================
# SCHEDULE (WITH CLASH FIX)
# =========================
@app.route('/schedule', methods=['POST'])
def create_schedule():
    data = request.get_json()

    conn = get_db()
    cur = conn.cursor()

    required = ['course_id', 'lecturer_id', 'room_id', 'day', 'start_time', 'end_time']
    for field in required:
        if field not in data:
            return jsonify({"error": f"{field} is required"}), 400

    # ROOM CLASH CHECK
    cur.execute("""
        SELECT * FROM schedules
        WHERE room_id=%s AND day=%s
        AND (start_time < %s AND end_time > %s)
    """, (
        data['room_id'],
        data['day'],
        data['end_time'],
        data['start_time']
    ))

    if cur.fetchone():
        return jsonify({"error": "Room already booked for this time"}), 400

    # LECTURER CLASH CHECK
    cur.execute("""
        SELECT * FROM schedules
        WHERE lecturer_id=%s AND day=%s
        AND (start_time < %s AND end_time > %s)
    """, (
        data['lecturer_id'],
        data['day'],
        data['end_time'],
        data['start_time']
    ))

    if cur.fetchone():
        return jsonify({"error": "Lecturer has another class at this time"}), 400

    # INSERT
    cur.execute("""
        INSERT INTO schedules (course_id, lecturer_id, room_id, day, start_time, end_time)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        data['course_id'],
        data['lecturer_id'],
        data['room_id'],
        data['day'],
        data['start_time'],
        data['end_time']
    ))

    conn.commit()
    return jsonify({"message": "Schedule created successfully"})


# =========================
# GET ALL SCHEDULES
# =========================
@app.route('/schedules', methods=['GET'])
def get_schedules():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT 
    schedules.id,
    courses.course_name AS course,
    users.name AS lecturer,
    rooms.room_name AS room,
    schedules.day,
    schedules.start_time,
    schedules.end_time
FROM schedules
JOIN courses ON schedules.course_id = courses.id
JOIN users ON schedules.lecturer_id = users.id
JOIN rooms ON schedules.room_id = rooms.id
    """)

    rows = cur.fetchall()

    return jsonify([
        {
            "id": r[0],
            "course": r[1],
            "lecturer": r[2],
            "room": r[3],
            "day": r[4],
            "start_time": str(r[5]),
            "end_time": str(r[6])
        }
        for r in rows
    ])


# =========================
# DELETE SCHEDULE
# =========================
@app.route('/delete_schedule/<int:id>', methods=['DELETE'])
def delete_schedule(id):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("DELETE FROM schedules WHERE id=%s", (id,))
    conn.commit()

    return jsonify({"message": "Schedule deleted"})


# =========================
# USERS LIST
# =========================
@app.route('/users', methods=['GET'])
def get_users():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT id, name, email, role FROM users")
    rows = cur.fetchall()

    return jsonify([
        {"id": u[0], "name": u[1], "email": u[2], "role": u[3]}
        for u in rows
    ])


# RUN SERVER
if __name__ == "__main__":
    app.run(debug=True)