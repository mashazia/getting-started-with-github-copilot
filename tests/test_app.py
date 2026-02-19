from fastapi.testclient import TestClient
from src.app import app, activities

client = TestClient(app)


def setup_function(fn):
    # reset the in-memory database before each test
    for name, activity in activities.items():
        # revert participants to their original set defined in app.py
        # since app.py defines them at import time, we'll hardcode the initial state
        # simpler: reload app module? but resetting manually
        pass


# to make resetting easier, capture initial state at import
_initial_participants = {name: activity["participants"].copy() for name, activity in activities.items()}


def reset_activities():
    for name, activity in activities.items():
        activity["participants"] = _initial_participants[name].copy()


def test_get_activities_returns_all():
    reset_activities()
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert "Chess Club" in data
    assert isinstance(data["Chess Club"]["participants"], list)


def test_signup_and_duplicate():
    reset_activities()
    # sign up a new student
    email = "tester@mergington.edu"
    activity_name = "Chess Club"
    resp = client.post(
        f"/activities/{activity_name}/signup?email={email}",
        json={"recaptcha_token": "dummy"},
    )
    assert resp.status_code == 200
    assert email in activities[activity_name]["participants"]

    # signing up again should fail
    resp2 = client.post(
        f"/activities/{activity_name}/signup?email={email}",
        json={"recaptcha_token": "dummy"},
    )
    assert resp2.status_code == 400
    assert "already signed up" in resp2.json()["detail"]


def test_signup_nonexistent_activity():
    reset_activities()
    resp = client.post(
        "/activities/Nonexistent/signup?email=foo@bar.com",
        json={"recaptcha_token": "dummy"},
    )
    assert resp.status_code == 404


def test_remove_participant():
    reset_activities()
    email = _initial_participants["Chess Club"][0]
    resp = client.delete(f"/activities/Chess Club/participants?email={email}")
    assert resp.status_code == 200
    assert email not in activities["Chess Club"]["participants"]


def test_remove_missing_participant():
    reset_activities()
    resp = client.delete("/activities/Chess Club/participants?email=nonexistent@x.com")
    assert resp.status_code == 400


def test_remove_nonexistent_activity():
    reset_activities()
    resp = client.delete("/activities/Nope/participants?email=foo@x.com")
    assert resp.status_code == 404
