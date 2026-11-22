from copy import deepcopy
from fastapi.testclient import TestClient
import main

client = TestClient(main.app)
ENDPOINT = "/events"
SAMPLE = {"name":"Test event","date":"2026-12-01","venue":"Hall"}
STORE = main.events


def test_crud_roundtrip():
    original = deepcopy(STORE)
    try:
        result = client.post(ENDPOINT, json=SAMPLE)
        assert result.status_code == 201
        created = result.json()
        record_id = created["id"]
        assert isinstance(record_id, int)
        assert client.get(f"{ENDPOINT}/{record_id}").json() == created
        assert created in client.get(ENDPOINT).json()
        changed = {**SAMPLE, "name": "Updated"}
        updated = client.put(f"{ENDPOINT}/{record_id}", json=changed)
        assert updated.status_code == 200
        assert updated.json()["name"] == "Updated"
        assert client.get(f"{ENDPOINT}/{record_id}").json() == updated.json()
        deleted = client.delete(f"{ENDPOINT}/{record_id}")
        assert deleted.status_code == 204
        assert deleted.content == b""
        assert client.get(f"{ENDPOINT}/{record_id}").status_code == 404
        assert all(row["id"] != record_id for row in client.get(ENDPOINT).json())
    finally:
        STORE[:] = original


def test_invalid_requests_do_not_change_records():
    before = deepcopy(STORE)
    assert client.post(ENDPOINT, json={}).status_code == 422
    assert client.post(ENDPOINT, json={**SAMPLE, "name": "  "}).status_code == 422
    assert client.post(ENDPOINT, json={**SAMPLE, "id": 100}).status_code == 422
    assert client.put(f"{ENDPOINT}/999999", json=SAMPLE).status_code == 404
    assert client.delete(f"{ENDPOINT}/999999").status_code == 404
    assert STORE == before


def test_frontend_assets():
    assert "text/html" in client.get("/").headers["content-type"]
    assert 'data-entity="events"' in client.get("/").text
    script = client.get("/app.js")
    assert script.status_code == 200
    assert "fetch(" in script.text
    assert "localStorage" not in script.text
    assert client.get("/style.css").status_code == 200
    assert client.get("/main.py").status_code == 404
