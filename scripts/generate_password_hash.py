"""
Generate a bcrypt hash for the ADMIN_PASSWORD_HASH value in backend/.env.

Usage:
    cd backend
    pip install -r requirements.txt
    python ../scripts/generate_password_hash.py

You'll be prompted for a password, and it will print the hash to paste into
your .env file. Never put the plain-text password itself in .env.
"""
import getpass
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

if __name__ == "__main__":
    password = getpass.getpass("Enter the admin password to hash: ")
    confirm = getpass.getpass("Confirm password: ")
    if password != confirm:
        print("Passwords do not match. Try again.")
        sys.exit(1)
    if len(password) < 8:
        print("Warning: password is shorter than 8 characters. Consider using something stronger.")
    hashed = pwd_context.hash(password)
    print("\nAdd this to backend/.env:\n")
    print(f"ADMIN_PASSWORD_HASH={hashed}")
