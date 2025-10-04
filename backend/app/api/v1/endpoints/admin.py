import logging
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.core.deps import get_current_user
from app.schemas.validation import UserResponse
from app.db.mongodb import get_users_collection, get_messages_collection, get_sessions_collection
from bson import ObjectId

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


async def require_admin(user_id: str = Depends(get_current_user)):
    """Dependency to check if user is admin."""
    try:
        users_collection = get_users_collection()
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        
        if not user or not user.get('is_admin', False):
            logger.warning(f"Admin access denied for user {user_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        return user_id
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin check error for user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication failed")


@router.get("/users", response_model=List[UserResponse])
async def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    is_verified: Optional[bool] = None,
    is_active: Optional[bool] = None,
    admin_id: str = Depends(require_admin)
):
    """Get all users with optional filtering (admin only)."""
    try:
        logger.info(f"Admin {admin_id} requesting user list")

        users_collection = get_users_collection()
        
        # Build query filter
        query_filter = {}
        if search:
            query_filter["email"] = {"$regex": search, "$options": "i"}
        if is_verified is not None:
            query_filter["is_verified"] = is_verified
        if is_active is not None:
            query_filter["is_active"] = is_active

        # Execute query with pagination
        cursor = users_collection.find(query_filter).skip(skip).limit(limit)
        users = await cursor.to_list(length=limit)

        result = [
            UserResponse(
                id=int(str(user["_id"]), 16) % (10**9),  # Convert ObjectId to int
                email=user["email"],
                is_active=user.get("is_active", True),
                is_verified=user.get("is_verified", False),
                created_at=user["created_at"].isoformat()
            ) for user in users
        ]

        logger.info(f"Admin {admin_id} retrieved {len(result)} users")
        return result
    except Exception as e:
        logger.error(f"Admin user list error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve users")


@router.get("/users/{user_id_param}")
async def get_user_details(
    user_id_param: str,
    admin_id: str = Depends(require_admin)
):
    """Get detailed information about a specific user (admin only)."""
    try:
        logger.info(f"Admin {admin_id} requesting details for user {user_id_param}")

        users_collection = get_users_collection()
        messages_collection = get_messages_collection()
        sessions_collection = get_sessions_collection()
        
        # Find user
        user = await users_collection.find_one({"_id": ObjectId(user_id_param)})
        if not user:
            logger.warning(f"Admin {admin_id} requested non-existent user {user_id_param}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Get user statistics
        message_count = await messages_collection.count_documents({"user_id": user_id_param})
        session_count = await sessions_collection.count_documents({"user_id": user_id_param})

        # Get last activity
        last_message = await messages_collection.find_one(
            {"user_id": user_id_param},
            sort=[("created_at", -1)]
        )
        last_activity = last_message["created_at"].isoformat() if last_message else None

        result = {
            "id": int(str(user["_id"]), 16) % (10**9),
            "email": user["email"],
            "is_active": user.get("is_active", True),
            "is_verified": user.get("is_verified", False),
            "created_at": user["created_at"].isoformat(),
            "message_count": message_count,
            "session_count": session_count,
            "verification_method": user.get("verification_method"),
            "is_admin": user.get("is_admin", False),
            "last_activity": last_activity
        }

        logger.info(f"Admin {admin_id} retrieved details for user {user_id_param}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin user details error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve user details")


@router.put("/users/{user_id_param}")
async def update_user(
    user_id_param: str,
    email: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_verified: Optional[bool] = None,
    is_admin: Optional[bool] = None,
    admin_id: str = Depends(require_admin)
):
    """Update user information (admin only)."""
    try:
        logger.info(f"Admin {admin_id} updating user {user_id_param}")

        users_collection = get_users_collection()
        
        # Check if user exists
        user = await users_collection.find_one({"_id": ObjectId(user_id_param)})
        if not user:
            logger.warning(f"Admin {admin_id} attempted to update non-existent user {user_id_param}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Build update document
        update_data = {"updated_at": datetime.utcnow()}
        
        # Check if email is being changed and if it's already taken
        if email and email != user["email"]:
            existing_user = await users_collection.find_one({"email": email})
            if existing_user:
                logger.warning(f"Admin {admin_id} attempted to change email to existing one: {email}")
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
            update_data["email"] = email

        if is_active is not None:
            update_data["is_active"] = is_active
        if is_verified is not None:
            update_data["is_verified"] = is_verified
        if is_admin is not None:
            update_data["is_admin"] = is_admin

        # Update user
        await users_collection.update_one(
            {"_id": ObjectId(user_id_param)},
            {"$set": update_data}
        )

        logger.info(f"Admin {admin_id} successfully updated user {user_id_param}")
        return {"message": "User updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin user update error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update user")


@router.delete("/users/{user_id_param}")
async def delete_user(
    user_id_param: str,
    admin_id: str = Depends(require_admin)
):
    """Delete a user and all their data (admin only)."""
    try:
        logger.info(f"Admin {admin_id} deleting user {user_id_param}")

        users_collection = get_users_collection()
        messages_collection = get_messages_collection()
        sessions_collection = get_sessions_collection()
        
        # Check if user exists
        user = await users_collection.find_one({"_id": ObjectId(user_id_param)})
        if not user:
            logger.warning(f"Admin {admin_id} attempted to delete non-existent user {user_id_param}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Delete all user data
        message_result = await messages_collection.delete_many({"user_id": user_id_param})
        session_result = await sessions_collection.delete_many({"user_id": user_id_param})
        
        # Delete user
        await users_collection.delete_one({"_id": ObjectId(user_id_param)})

        message_count = message_result.deleted_count
        session_count = session_result.deleted_count

        logger.info(f"Admin {admin_id} successfully deleted user {user_id_param}, {message_count} messages, {session_count} sessions")
        return {
            "message": "User deleted successfully",
            "messages_deleted": message_count,
            "sessions_deleted": session_count
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin user deletion error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete user")


@router.get("/stats")
async def get_system_stats(admin_id: str = Depends(require_admin)):
    """Get system-wide statistics (admin only)."""
    try:
        logger.info(f"Admin {admin_id} requesting system statistics")

        users_collection = get_users_collection()
        messages_collection = get_messages_collection()
        sessions_collection = get_sessions_collection()

        # User statistics
        total_users = await users_collection.count_documents({})
        active_users = await users_collection.count_documents({"is_active": True})
        verified_users = await users_collection.count_documents({"is_verified": True})
        admin_users = await users_collection.count_documents({"is_admin": True})

        # Message and session statistics
        total_messages = await messages_collection.count_documents({})
        total_sessions = await sessions_collection.count_documents({})

        # Recent activity (last 24 hours)
        yesterday = datetime.utcnow() - timedelta(days=1)
        recent_messages = await messages_collection.count_documents({
            "created_at": {"$gte": yesterday}
        })
        
        # Get unique users active in last 24 hours
        recent_users_pipeline = [
            {"$match": {"created_at": {"$gte": yesterday}}},
            {"$group": {"_id": "$user_id"}},
            {"$count": "count"}
        ]
        recent_users_result = await messages_collection.aggregate(recent_users_pipeline).to_list(1)
        recent_users = recent_users_result[0]["count"] if recent_users_result else 0

        stats = {
            "users": {
                "total": total_users,
                "active": active_users,
                "verified": verified_users,
                "admins": admin_users
            },
            "content": {
                "total_messages": total_messages,
                "total_sessions": total_sessions
            },
            "activity_24h": {
                "messages": recent_messages,
                "active_users": recent_users
            },
            "generated_at": datetime.utcnow().isoformat()
        }

        logger.info(f"Admin {admin_id} retrieved system statistics")
        return stats
    except Exception as e:
        logger.error(f"Admin stats error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve statistics")
