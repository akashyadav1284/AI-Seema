import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from app.main import app

client = TestClient(app)

@pytest.fixture
def mock_db():
    with patch("app.routes.auth.is_db_connected", return_value=True), \
         patch("app.routes.auth.get_db") as mock_get_db, \
         patch("app.services.auth.get_db") as mock_get_db_service:
        
        mock_db_instance = AsyncMock()
        mock_collection = AsyncMock()
        mock_db_instance.__getitem__.return_value = mock_collection
        
        mock_get_db.return_value = mock_db_instance
        mock_get_db_service.return_value = mock_db_instance
        
        yield mock_collection

def test_register_success(mock_db):
    mock_db.find_one.return_value = None
    mock_db.insert_one = AsyncMock()
    
    response = client.post("/api/auth/register", json={
        "name": "Test User",
        "email": "test@example.com",
        "password": "securepassword123",
        "role": "admin"
    })
    
    assert response.status_code == 201
    assert response.json()["email"] == "test@example.com"
    assert response.json()["role"] == "admin"
    assert "password" not in response.json()
    assert "id" in response.json()

def test_register_duplicate(mock_db):
    mock_db.find_one.return_value = {"email": "test@example.com"}
    
    response = client.post("/api/auth/register", json={
        "name": "Test User",
        "email": "test@example.com",
        "password": "securepassword123"
    })
    
    assert response.status_code == 400
    assert "Email already registered" in response.json()["detail"]

def test_login_success(mock_db):
    from app.services.auth import get_password_hash
    hashed = get_password_hash("securepassword123")
    mock_db.find_one.return_value = {
        "email": "test@example.com",
        "password_hash": hashed,
        "is_active": True
    }
    
    response = client.post("/api/auth/login", data={
        "username": "test@example.com",
        "password": "securepassword123"
    })
    
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_invalid_credentials(mock_db):
    from app.services.auth import get_password_hash
    hashed = get_password_hash("securepassword123")
    mock_db.find_one.return_value = {
        "email": "test@example.com",
        "password_hash": hashed,
        "is_active": True
    }
    
    response = client.post("/api/auth/login", data={
        "username": "test@example.com",
        "password": "wrongpassword"
    })
    
    assert response.status_code == 401

def test_me_success(mock_db):
    # First login to get a token
    from app.services.auth import get_password_hash
    hashed = get_password_hash("securepassword123")
    mock_db.find_one.return_value = {
        "_id": "USR-12345",
        "name": "Test",
        "email": "test@example.com",
        "password_hash": hashed,
        "role": "viewer",
        "is_active": True,
        "created_at": "2026-01-01T00:00:00",
        "updated_at": "2026-01-01T00:00:00"
    }
    
    login_response = client.post("/api/auth/login", data={
        "username": "test@example.com",
        "password": "securepassword123"
    })
    token = login_response.json()["access_token"]
    
    # Then access /me
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"
    assert response.json()["id"] == "USR-12345"

def test_protected_without_token():
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    
    response = client.get("/api/events/")
    assert response.status_code == 401

def test_invalid_token(mock_db):
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer fake_token_123"})
    assert response.status_code == 401

def test_rbac_viewer_cannot_review(mock_db):
    # Setup viewer token
    from app.services.auth import get_password_hash
    hashed = get_password_hash("securepassword123")
    mock_db.find_one.return_value = {
        "_id": "USR-VIEWER",
        "email": "viewer@example.com",
        "password_hash": hashed,
        "role": "viewer",
        "is_active": True
    }
    
    login_response = client.post("/api/auth/login", data={
        "username": "viewer@example.com",
        "password": "securepassword123"
    })
    token = login_response.json()["access_token"]
    
    # Attempt to review event
    response = client.patch(
        "/api/events/EVT-123/review", 
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "VERIFIED"}
    )
    
    # Should be blocked by RoleChecker
    assert response.status_code == 403
    assert response.json()["detail"] == "Operation not permitted"

