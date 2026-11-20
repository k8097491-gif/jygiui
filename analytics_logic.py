def scope_for(user_id, role):
    if role == "requester":
        return "requester_id = %s", (user_id,)
    if role == "specialist":
        return "assignee_id = %s", (user_id,)
    if role in {"dispatcher", "manager", "admin"}:
        return "TRUE", ()
    raise ValueError("Unknown role")


def shape_summary(totals, categories):
    return {
        "total": int(totals["total"] or 0),
        "open": int(totals["open"] or 0),
        "overdue": int(totals["overdue"] or 0),
        "averageRating": float(totals["average_rating"]) if totals["average_rating"] is not None else None,
        "byCategory": [{"name": row["name"], "count": int(row["count"])} for row in categories],
    }
