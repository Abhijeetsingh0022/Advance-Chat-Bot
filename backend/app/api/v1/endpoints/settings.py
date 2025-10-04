"""
User Settings API endpoints
Handles user profile, preferences, security settings, and session management
"""
import logging
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from app.core.deps import get_current_user
from app.core.security import get_password_hash, verify_password
from app.db.mongodb import get_users_collection, get_sessions_collection
from bson import ObjectId

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["settings"])


# Pydantic schemas for settings
class ProfileUpdateRequest(BaseModel):
    """Update user profile information"""
    full_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None


class AppearanceSettings(BaseModel):
    """User appearance preferences"""
    theme: str = "dark"  # "light" or "dark"
    glass_style: str = "default"  # "default", "strong", "subtle", "vibrant"
    font_size: str = "medium"  # "small", "medium", "large"
    accent_color: str = "gray"  # "gray", "blue", "purple", "green", "red"


class NotificationSettings(BaseModel):
    """Notification preferences"""
    email_notifications: bool = True
    chat_notifications: bool = True
    security_alerts: bool = True


class PrivacySettings(BaseModel):
    """Privacy preferences"""
    profile_visibility: str = "private"  # "public", "private"
    show_online_status: bool = True
    data_collection: bool = True


class AIPreferences(BaseModel):
    """AI chat preferences"""
    default_model: str = "gpt-oss"
    temperature: float = 0.7
    max_tokens: int = 2000
    stream_responses: bool = True


class UserSettings(BaseModel):
    """Complete user settings"""
    profile: Optional[ProfileUpdateRequest] = None
    appearance: Optional[AppearanceSettings] = AppearanceSettings()
    notifications: Optional[NotificationSettings] = NotificationSettings()
    privacy: Optional[PrivacySettings] = PrivacySettings()
    ai_preferences: Optional[AIPreferences] = AIPreferences()


class PasswordChangeRequest(BaseModel):
    """Change user password"""
    current_password: str
    new_password: str


class SessionInfo(BaseModel):
    """Active session information"""
    session_id: str
    device: str
    location: str
    ip_address: str
    last_active: datetime
    is_current: bool


@router.get("/profile")
async def get_profile(current_user_id: str = Depends(get_current_user)):
    """Get user profile information"""
    try:
        users_collection = get_users_collection()
        user = await users_collection.find_one({"_id": ObjectId(current_user_id)})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "email": user.get("email"),
            "full_name": user.get("full_name", ""),
            "bio": user.get("bio", ""),
            "avatar_url": user.get("avatar_url", ""),
            "phone": user.get("phone", ""),
            "location": user.get("location", ""),
            "is_verified": user.get("is_verified", False),
            "created_at": user.get("created_at"),
            "updated_at": user.get("updated_at")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching profile: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(e)}")


@router.put("/profile")
async def update_profile(
    profile: ProfileUpdateRequest,
    current_user_id: str = Depends(get_current_user)
):
    """Update user profile information"""
    try:
        users_collection = get_users_collection()
        
        update_data = {k: v for k, v in profile.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        result = await users_collection.update_one(
            {"_id": ObjectId(current_user_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"Profile updated for user {current_user_id}")
        return {"message": "Profile updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")


@router.get("/settings")
async def get_settings(current_user_id: str = Depends(get_current_user)):
    """Get all user settings"""
    try:
        users_collection = get_users_collection()
        user = await users_collection.find_one({"_id": ObjectId(current_user_id)})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Return settings with defaults if not set
        return {
            "appearance": user.get("appearance", AppearanceSettings().dict()),
            "notifications": user.get("notifications", NotificationSettings().dict()),
            "privacy": user.get("privacy", PrivacySettings().dict()),
            "ai_preferences": user.get("ai_preferences", AIPreferences().dict())
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching settings: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch settings: {str(e)}")


@router.put("/settings")
async def update_settings(
    settings: UserSettings,
    current_user_id: str = Depends(get_current_user)
):
    """Update user settings"""
    try:
        users_collection = get_users_collection()
        
        update_data = {}
        if settings.appearance:
            update_data["appearance"] = settings.appearance.dict()
        if settings.notifications:
            update_data["notifications"] = settings.notifications.dict()
        if settings.privacy:
            update_data["privacy"] = settings.privacy.dict()
        if settings.ai_preferences:
            update_data["ai_preferences"] = settings.ai_preferences.dict()
        
        update_data["updated_at"] = datetime.utcnow()
        
        result = await users_collection.update_one(
            {"_id": ObjectId(current_user_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"Settings updated for user {current_user_id}")
        return {"message": "Settings updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating settings: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")


@router.post("/password/change")
async def change_password(
    request: PasswordChangeRequest,
    current_user_id: str = Depends(get_current_user)
):
    """Change user password"""
    try:
        users_collection = get_users_collection()
        user = await users_collection.find_one({"_id": ObjectId(current_user_id)})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify current password
        if not verify_password(request.current_password, user["hashed_password"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Update password
        new_hashed = get_password_hash(request.new_password)
        await users_collection.update_one(
            {"_id": ObjectId(current_user_id)},
            {"$set": {
                "hashed_password": new_hashed,
                "updated_at": datetime.utcnow()
            }}
        )
        
        logger.info(f"Password changed for user {current_user_id}")
        return {"message": "Password changed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to change password: {str(e)}")


@router.get("/sessions")
async def get_active_sessions(current_user_id: str = Depends(get_current_user)):
    """Get all active sessions for the user"""
    try:
        sessions_collection = get_sessions_collection()
        sessions = await sessions_collection.find({
            "user_id": current_user_id,
            "is_active": True
        }).to_list(length=100)
        
        session_list = []
        for session in sessions:
            session_list.append({
                "session_id": str(session["_id"]),
                "device": session.get("device", "Unknown"),
                "location": session.get("location", "Unknown"),
                "ip_address": session.get("ip_address", "Unknown"),
                "last_active": session.get("updated_at", session.get("created_at")),
                "is_current": session.get("is_current", False)
            })
        
        return {"sessions": session_list}
    except Exception as e:
        logger.error(f"Error fetching sessions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch sessions: {str(e)}")


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    current_user_id: str = Depends(get_current_user)
):
    """Revoke a specific session"""
    try:
        sessions_collection = get_sessions_collection()
        
        result = await sessions_collection.update_one(
            {
                "_id": ObjectId(session_id),
                "user_id": current_user_id
            },
            {"$set": {
                "is_active": False,
                "revoked_at": datetime.utcnow()
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        
        logger.info(f"Session {session_id} revoked for user {current_user_id}")
        return {"message": "Session revoked successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to revoke session: {str(e)}")


@router.post("/export/data")
async def export_user_data(current_user_id: str = Depends(get_current_user)):
    """Export all user data (GDPR compliance)"""
    try:
        users_collection = get_users_collection()
        user = await users_collection.find_one({"_id": ObjectId(current_user_id)})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Remove sensitive data
        user.pop("hashed_password", None)
        user.pop("otp", None)
        user.pop("verification_token", None)
        user["_id"] = str(user["_id"])
        
        # Get user's chat history
        from app.db.mongodb import get_messages_collection
        messages_collection = get_messages_collection()
        messages = await messages_collection.find({
            "user_id": current_user_id
        }).to_list(length=10000)
        
        for msg in messages:
            msg["_id"] = str(msg["_id"])
        
        export_data = {
            "user": user,
            "messages": messages,
            "exported_at": datetime.utcnow().isoformat()
        }
        
        logger.info(f"Data exported for user {current_user_id}")
        return export_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to export data: {str(e)}")


@router.delete("/account")
async def delete_account(
    password: str,
    current_user_id: str = Depends(get_current_user)
):
    """Delete user account permanently"""
    try:
        users_collection = get_users_collection()
        user = await users_collection.find_one({"_id": ObjectId(current_user_id)})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify password
        if not verify_password(password, user["hashed_password"]):
            raise HTTPException(status_code=400, detail="Incorrect password")
        
        # Delete user data
        await users_collection.delete_one({"_id": ObjectId(current_user_id)})
        
        # Delete user's messages
        from app.db.mongodb import get_messages_collection
        messages_collection = get_messages_collection()
        await messages_collection.delete_many({"user_id": current_user_id})
        
        logger.info(f"Account deleted for user {current_user_id}")
        return {"message": "Account deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting account: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete account: {str(e)}")
