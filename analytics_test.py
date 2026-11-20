import unittest
from analytics_logic import scope_for, shape_summary


class AnalyticsLogicTests(unittest.TestCase):
    def test_requester_is_scoped_to_own_rows(self):
        sql, params = scope_for("student-uuid", "requester")
        self.assertEqual(sql, "requester_id = %s")
        self.assertEqual(params, ("student-uuid",))

    def test_specialist_is_scoped_to_assigned_rows(self):
        sql, params = scope_for("agent-uuid", "specialist")
        self.assertEqual(sql, "assignee_id = %s")
        self.assertEqual(params, ("agent-uuid",))

    def test_manager_uses_service_wide_scope(self):
        sql, params = scope_for("manager-uuid", "manager")
        self.assertEqual(sql, "TRUE")
        self.assertEqual(params, ())

    def test_unknown_role_fails_closed(self):
        with self.assertRaises(ValueError):
            scope_for("user", "visitor")

    def test_summary_keeps_empty_rating_null(self):
        result = shape_summary(
            {"total": 0, "open": 0, "overdue": 0, "average_rating": None},
            [],
        )
        self.assertEqual(result, {"total": 0, "open": 0, "overdue": 0, "averageRating": None, "byCategory": []})


if __name__ == "__main__":
    unittest.main()
