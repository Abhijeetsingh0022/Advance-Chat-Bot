#!/usr/bin/env python3
"""
Script to create the first admin user for the ChatBot application.
Run this once after setting up the database.
"""
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlmodel import Session, select
from app.db.session import engine
from app.models.sql_models import User
from app.core.security import get_password_hash


def create_admin_user(email: str, password: str):
    """Create an admin user if one doesn't exist."""
    
    with Session(engine) as session:
        # Check if admin already exists
        statement = select(User).where(User.email == email)
        existing_user = session.exec(statement).first()
        
        if existing_user:
            if existing_user.is_admin:
                print(f"❌ Admin user with email {email} already exists!")
                return False
            else:
                # Upgrade existing user to admin
                existing_user.is_admin = True
                existing_user.is_verified = True
                existing_user.is_active = True
                session.add(existing_user)
                session.commit()
                print(f"✅ Upgraded existing user {email} to admin!")
                return True
        
        # Create new admin user
        hashed_password = get_password_hash(password)
        admin_user = User(
            email=email,
            hashed_password=hashed_password,
            is_admin=True,
            is_verified=True,
            is_active=True,
            verification_method="admin_init"
        )
        
        session.add(admin_user)
        session.commit()
        session.refresh(admin_user)
        
        print(f"✅ Successfully created admin user!")
        print(f"   Email: {email}")
        print(f"   User ID: {admin_user.id}")
        print(f"\n⚠️  Please store the password securely and consider changing it after first login.")
        return True


def main():
    print("=" * 60)
    print("ChatBot Admin User Creation Script")
    print("=" * 60)
    print()
    
    # Get email from user
    email = input("Enter admin email address: ").strip()
    
    if not email or '@' not in email:
        print("❌ Invalid email address!")
        sys.exit(1)
    
    # Get password from user
    import getpass
    password = getpass.getpass("Enter admin password (min 8 characters): ")
    
    if len(password) < 8:
        print("❌ Password must be at least 8 characters long!")
        sys.exit(1)
    
    password_confirm = getpass.getpass("Confirm admin password: ")
    
    if password != password_confirm:
        print("❌ Passwords do not match!")
        sys.exit(1)
    
    print()
    print("Creating admin user...")
    print()
    
    try:
        success = create_admin_user(email, password)
        if success:
            print()
            print("=" * 60)
            print("Admin user created successfully!")
            print("You can now log in and access admin endpoints.")
            print("=" * 60)
            sys.exit(0)
        else:
            sys.exit(1)
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
