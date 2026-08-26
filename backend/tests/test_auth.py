import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Configure env BEFORE importing auth, since it reads module-level env vars.
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-unit-tests"
os.environ["ADMIN_USERNAME"] = "admin"

import importlib
import auth as auth_module

# Reload so the module picks up the env vars set above even if it was
# already imported earlier in the test session.
importlib.reload(auth_module)
os.environ["ADMIN_PASSWORD_HASH"] = auth_module.hash_password("correct-horse-battery-staple")
importlib.reload(auth_module)


def test_password_hash_roundtrip():
    hashed = auth_module.hash_password("my-password")
    assert auth_module.verify_password("my-password", hashed)
    assert not auth_module.verify_password("wrong-password", hashed)


def test_authenticate_admin_success():
    assert auth_module.authenticate_admin("admin", "correct-horse-battery-staple") is True


def test_authenticate_admin_wrong_password():
    assert auth_module.authenticate_admin("admin", "wrong-password") is False


def test_authenticate_admin_wrong_username():
    assert auth_module.authenticate_admin("someone-else", "correct-horse-battery-staple") is False


def test_create_and_decode_access_token():
    token = auth_module.create_access_token(subject="admin")
    subject = auth_module.decode_token(token)
    assert subject == "admin"


def test_decode_invalid_token_returns_none():
    assert auth_module.decode_token("not-a-real-token") is None
