"""
Create an admin user in MongoDB Atlas
Run this script to create an admin user for your chatbot application.
"""
import asyncio
import sys
from pathlib import Path

# Add the backend directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from app.db.mongodb import init_mongodb, close_mongodb, get_users_collection
from app.core.security import get_password_hash
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def create_admin_user(email: str, password: str):
    """Create an admin user in MongoDB."""
    try:
        # Initialize MongoDB
        await init_mongodb()
        logger.info("Connected to MongoDB")
        
        # Get users collection
        users_collection = get_users_collection()
        
        # Check if user already exists
        existing_user = await users_collection.find_one({"email": email})
        if existing_user:
            logger.warning(f"User with email {email} already exists")
            
            # Update to make them admin
            result = await users_collection.update_one(
                {"email": email},
                {"$set": {"is_admin": True, "is_verified": True, "is_active": True}}
            )
            
            if result.modified_count > 0:
                logger.info(f"✅ Updated existing user {email} to admin")
            else:
                logger.info(f"User {email} was already an admin")
            return
        
        # Create new admin user
        hashed_password = get_password_hash(password)
        user_doc = {
            "email": email,
            "hashed_password": hashed_password,
            "is_active": True,
            "is_verified": True,  # Auto-verify admin users
            "is_admin": True,
            "verification_method": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await users_collection.insert_one(user_doc)
        user_id = str(result.inserted_id)
        
        logger.info(f"✅ Created admin user successfully!")
        logger.info(f"   Email: {email}")
        logger.info(f"   User ID: {user_id}")
        logger.info(f"   Admin: True")
        logger.info(f"   Verified: True")
        
    except Exception as e:
        logger.error(f"Failed to create admin user: {e}")
        raise
    finally:
        await close_mongodb()
        logger.info("Disconnected from MongoDB")


async def main():
    """Main function to run the script."""
    print("=" * 60)
    print("Create Admin User for ChatBot")
    print("=" * 60)
    
    # Get email
    email = input("\nEnter admin email: ").strip()
    if not email or "@" not in email:
        print("❌ Invalid email address")
        return
    
    # Get password
    password = input("Enter admin password: ").strip()
    if len(password) < 8:
        print("❌ Password must be at least 8 characters long")
        return
    
    # Confirm
    confirm = input(f"\nCreate admin user with email '{email}'? (yes/no): ").strip().lower()
    if confirm not in ["yes", "y"]:
        print("❌ Cancelled")
        return
    
    print("\n" + "=" * 60)
    print("Creating admin user...")
    print("=" * 60)
    
    await create_admin_user(email, password)
    
    print("\n" + "=" * 60)
    print("You can now log in with these credentials:")
    print(f"  Email: {email}")
    print(f"  Password: {password}")
    print("=" * 60)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n❌ Cancelled by user")
    except Exception as e:
        logger.error(f"Error: {e}")
        print(f"\n❌ Error: {e}")
