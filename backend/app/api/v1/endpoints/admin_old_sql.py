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
def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    is_verified: Optional[bool] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    admin_id: str = Depends(require_admin)
):
    """Get all users with optional filtering (admin only)."""
    try:
        logger.info(f"Admin {admin_id} requesting user list")

        query = select(User)

        # Apply filters
        if search:
            query = query.where(User.email.contains(search))
        if is_verified is not None:
            query = query.where(User.is_verified == is_verified)
        if is_active is not None:
            query = query.where(User.is_active == is_active)

        users = db.execute(query.offset(skip).limit(limit)).scalars().all()

        result = [
            UserResponse(
                id=user.id,
                email=user.email,
                is_active=user.is_active,
                is_verified=user.is_verified,
                created_at=user.created_at.isoformat()
            ) for user in users
        ]

        logger.info(f"Admin {admin_id} retrieved {len(result)} users")
        return result
    except Exception as e:
        logger.error(f"Admin user list error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve users")


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user_details(
    user_id: int,
    db: Session = Depends(get_db),
    admin_id: str = Depends(require_admin)
):
    """Get detailed information about a specific user (admin only)."""
    try:
        logger.info(f"Admin {admin_id} requesting details for user {user_id}")

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.warning(f"Admin {admin_id} requested non-existent user {user_id}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Get user statistics
        message_count = db.query(Message).filter(Message.user_id == user_id).count()
        session_count = db.query(func.count(func.distinct(Message.session_id))).filter(
            Message.user_id == user_id
        ).scalar()

        result = UserResponse(
            id=user.id,
            email=user.email,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at.isoformat()
        )

        # Add additional admin-only fields
        result.__dict__.update({
            "message_count": message_count,
            "session_count": session_count,
            "verification_method": user.verification_method,
            "last_activity": None  # Would need to track this separately
        })

        logger.info(f"Admin {admin_id} retrieved details for user {user_id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin user details error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve user details")


@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    email: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_verified: Optional[bool] = None,
    db: Session = Depends(get_db),
    admin_id: str = Depends(require_admin)
):
    """Update user information (admin only)."""
    try:
        logger.info(f"Admin {admin_id} updating user {user_id}")

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.warning(f"Admin {admin_id} attempted to update non-existent user {user_id}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Check if email is being changed and if it's already taken
        if email and email != user.email:
            existing_user = db.query(User).filter(User.email == email).first()
            if existing_user:
                logger.warning(f"Admin {admin_id} attempted to change email to existing one: {email}")
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
            user.email = email

        if is_active is not None:
            user.is_active = is_active
        if is_verified is not None:
            user.is_verified = is_verified

        db.add(user)
        db.commit()
        db.refresh(user)

        logger.info(f"Admin {admin_id} successfully updated user {user_id}")
        return {"message": "User updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin user update error: {e}")
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update user")


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_id: str = Depends(require_admin)
):
    """Delete a user and all their data (admin only)."""
    try:
        logger.info(f"Admin {admin_id} deleting user {user_id}")

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.warning(f"Admin {admin_id} attempted to delete non-existent user {user_id}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Delete all user messages first (due to foreign key constraint)
        message_count = db.query(Message).filter(Message.user_id == user_id).delete()

        # Delete user
        db.delete(user)
        db.commit()

        logger.info(f"Admin {admin_id} successfully deleted user {user_id} and {message_count} messages")
        return {"message": f"User deleted successfully. {message_count} messages removed"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin user deletion error: {e}")
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete user")


@router.get("/stats")
def get_system_stats(
    db: Session = Depends(get_db),
    admin_id: str = Depends(require_admin)
):
    """Get system-wide statistics (admin only)."""
    try:
        logger.info(f"Admin {admin_id} requesting system statistics")

        # User statistics
        total_users = db.query(func.count(User.id)).scalar()
        active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
        verified_users = db.query(func.count(User.id)).filter(User.is_verified == True).scalar()

        # Message statistics
        total_messages = db.query(func.count(Message.id)).scalar()
        total_sessions = db.query(func.count(func.distinct(Message.session_id))).scalar()

        # Recent activity (last 24 hours)
        from datetime import datetime, timedelta
        yesterday = datetime.utcnow() - timedelta(days=1)
        recent_messages = db.query(func.count(Message.id)).filter(
            Message.created_at >= yesterday
        ).scalar()

        recent_users = db.query(func.count(func.distinct(Message.user_id))).filter(
            Message.created_at >= yesterday
        ).scalar()

        stats = {
            "users": {
                "total": total_users,
                "active": active_users,
                "verified": verified_users
            },
            "messages": {
                "total": total_messages,
                "sessions": total_sessions
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