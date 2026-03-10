from datetime import datetime


def _to_time(t):
    """Convert time string or timedelta to a comparable datetime.time."""
    if hasattr(t, "seconds"):          # timedelta from MySQL
        total = t.seconds
        h, rem = divmod(total, 3600)
        m, s = divmod(rem, 60)
        return datetime.strptime(f"{h:02d}:{m:02d}:{s:02d}", "%H:%M:%S").time()
    if isinstance(t, str):
        for fmt in ("%H:%M:%S", "%H:%M"):
            try:
                return datetime.strptime(t, fmt).time()
            except ValueError:
                continue
    return t  # already a time object


def times_overlap(start_a, end_a, start_b, end_b):
    """Return True if interval [start_a, end_a) overlaps [start_b, end_b)."""
    sa, ea = _to_time(start_a), _to_time(end_a)
    sb, eb = _to_time(start_b), _to_time(end_b)
    return sa < eb and sb < ea


def detect_clash(new_start, new_end, existing_slots):
    """
    Check whether a new time slot clashes with any existing slot.

    Args:
        new_start (str): Start time of the new lecture (HH:MM or HH:MM:SS).
        new_end   (str): End time of the new lecture.
        existing_slots (list[dict]): Slots already in the database for that venue/date.
            Each dict must contain 'start_time' and 'end_time'.

    Returns:
        dict | None: The clashing slot dict, or None if no clash.
    """
    for slot in existing_slots:
        if times_overlap(new_start, new_end, slot["start_time"], slot["end_time"]):
            return slot
    return None
