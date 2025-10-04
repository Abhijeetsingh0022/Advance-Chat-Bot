import logging
import random
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Form
from app.core.deps import get_current_user
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.services.email import send_otp_verification_email, send_token_verification_email
from app.schemas.validation import (
    RegisterRequest, LoginRequest, OTPVerificationRequest, UserResponse, 
    ForgotPasswordRequest, ResetPasswordRequest, ResendVerificationRequest
)
from app.schemas.error import ErrorResponse
from pydantic import EmailStr
from typing import Optional
from app.utils.exceptions import ValidationError
from jose import jwt as jose_jwt
from fastapi import Request
from app.core.config import settings
from app.db.mongodb import get_users_collection, get_revoked_tokens_collection
from app.models.mongo_models import UserDocument, RevokedTokenDocument
from bson import ObjectId

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
async def register(request: RegisterRequest):
    """Register a new user with MongoDB."""
    try:
        logger.info(f"Register attempt for email: {request.email} with method: {request.verification_method}")
        email = request.email
        password = request.password
        verification_method = request.verification_method

        users_collection = get_users_collection()
        
        # Check if user already exists
        existing_user = await users_collection.find_one({"email": email})
        if existing_user:
            logger.warning(f"Registration failed: email {email} already exists")
            logger.warning(f"SECURITY: Registration attempt with existing email {email}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        # Create new user document
        hashed = get_password_hash(password)
        user_doc = {
            "email": email,
            "hashed_password": hashed,
            "is_active": True,
            "is_verified": False,
            "is_admin": False,
            "verification_method": verification_method,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        # Add verification data based on method
        if verification_method == "otp":
            otp = str(random.randint(100000, 999999))
            otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
            user_doc["otp"] = otp
            user_doc["otp_expires_at"] = otp_expires_at
            
            # Send verification email
            try:
                send_otp_verification_email(email, otp)
                logger.info(f"OTP verification email sent to {email}")
            except Exception as e:
                logger.warning(f"Failed to send OTP verification email to {email}: {e}. Registration will continue.")
                logger.warning(f"SECURITY: OTP email failure for {email}")
                
        elif verification_method == "token":
            token = create_access_token(subject=email, expires_delta=timedelta(hours=24))
            user_doc["verification_token"] = token
            
            # Send verification email
            try:
                verification_link = f"{settings.BASE_URL}/api/auth/verify?token={token}"
                send_token_verification_email(email, verification_link)
                logger.info(f"Token verification email sent to {email}")
            except Exception as e:
                logger.warning(f"Failed to send token verification email to {email}: {e}. Registration will continue.")
                logger.warning(f"SECURITY: Token email failure for {email}")

        # Insert user into database
        result = await users_collection.insert_one(user_doc)
        user_id = str(result.inserted_id)
        
        logger.info(f"User {user_id} registered successfully, verification email sent via {verification_method}")
        return {
            "id": user_id,
            "email": email,
            "created_at": user_doc["created_at"].isoformat(),
            "verification_method": verification_method,
            "message": "Verification email sent"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error for {request.email}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Registration failed")


@router.post("/verify-otp")
async def verify_otp(request: OTPVerificationRequest):
    """Verify user account with OTP."""
    try:
        logger.info(f"OTP verification attempt for email: {request.email}")
        logger.info(f"Received OTP: {request.otp} (type: {type(request.otp)}, length: {len(request.otp)})")
        email = request.email
        otp = request.otp
        
        users_collection = get_users_collection()
        user = await users_collection.find_one({"email": email})
        
        if not user:
            logger.warning(f"OTP verification failed: email {email} not found")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
            
        if user.get("is_verified"):
            logger.warning(f"OTP verification failed: email {email} already verified")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account already verified")
        
        # Log stored OTP for debugging
        stored_otp = user.get("otp")
        stored_expires = user.get("otp_expires_at")
        logger.info(f"Stored OTP: {stored_otp} (type: {type(stored_otp)})")
        logger.info(f"OTP expires at: {stored_expires}, Current time: {datetime.utcnow()}")
        logger.info(f"Verification method: {user.get('verification_method')}")
        
        if user.get("verification_method") != "otp":
            logger.warning(f"OTP verification failed: wrong verification method for {email}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This account uses a different verification method")
            
        if not stored_otp:
            logger.warning(f"OTP verification failed: no OTP stored for {email}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No OTP found. Please request a new one")
            
        if stored_otp != otp:
            logger.warning(f"OTP verification failed: OTP mismatch for {email}. Expected: {stored_otp}, Got: {otp}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP")
            
        if not stored_expires or stored_expires < datetime.utcnow():
            logger.warning(f"OTP verification failed: expired OTP for {email}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP has expired. Please request a new one")
        
        # Update user as verified
        await users_collection.update_one(
            {"email": email},
            {
                "$set": {
                    "is_verified": True,
                    "updated_at": datetime.utcnow()
                },
                "$unset": {"otp": "", "otp_expires_at": ""}
            }
        )
        
        logger.info(f"User {user['_id']} verified successfully via OTP")
        return {"message": "Account verified successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OTP verification error for {request.email}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Verification failed")


@router.get("/verify")
async def verify_token(token: str):
    """Verify user account with token."""
    try:
        logger.info("Token verification attempt")
        payload = decode_access_token(token)
        
        if not payload:
            logger.warning("Token verification failed: invalid token")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")
            
        email = payload.get("sub")
        if not email:
            logger.warning("Token verification failed: no email in token")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")
        
        users_collection = get_users_collection()
        user = await users_collection.find_one({"email": email})
        
        if not user:
            logger.warning(f"Token verification failed: user {email} not found")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
            
        if user.get("is_verified"):
            logger.warning(f"Token verification failed: email {email} already verified")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account already verified")
            
        if user.get("verification_method") != "token" or user.get("verification_token") != token:
            logger.warning(f"Token verification failed: invalid token for {email}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")
        
        # Update user as verified
        await users_collection.update_one(
            {"email": email},
            {
                "$set": {
                    "is_verified": True,
                    "updated_at": datetime.utcnow()
                },
                "$unset": {"verification_token": ""}
            }
        )
        
        logger.info(f"User {user['_id']} verified successfully via token")
        return {"message": "Account verified successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Verification failed")


@router.post("/login")
async def login(request: LoginRequest):
    """User login with MongoDB."""
    try:
        logger.info(f"Login attempt for email: {request.email}")
        email = request.email
        password = request.password
        
        users_collection = get_users_collection()
        user = await users_collection.find_one({"email": email})
        
        if not user or not verify_password(password, user["hashed_password"]):
            logger.warning(f"Login failed for {email}: invalid credentials")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
            
        if not user.get("is_verified"):
            logger.warning(f"Login failed for {email}: account not verified")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Account not verified. Please verify your email first."
            )
        
        # Create access token with user ID
        user_id = str(user["_id"])
        token = create_access_token(subject=user_id)
        
        logger.info(f"User {user_id} logged in successfully")
        return {
            "access_token": token,
            "token_type": "bearer",
            "expires_in": 60 * 30
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error for {request.email}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Login failed")


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(user_id: str = Depends(get_current_user)):
    """Get current user profile information."""
    try:
        logger.info(f"Profile request for user {user_id}")
        
        users_collection = get_users_collection()
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            logger.warning(f"Profile request failed: user {user_id} not found")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        return UserResponse(
            id=int(user_id, 16) % (10**9),  # Convert ObjectId to int for response
            email=user["email"],
            is_active=user.get("is_active", True),
            is_verified=user.get("is_verified", False),
            created_at=user["created_at"].isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile retrieval error for user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve profile")


@router.put("/me", response_model=UserResponse)
async def update_user_profile(
    email: Optional[EmailStr] = None,
    is_active: Optional[bool] = None,
    user_id: str = Depends(get_current_user)
):
    """Update current user profile."""
    try:
        logger.info(f"Profile update request for user {user_id}")
        
        users_collection = get_users_collection()
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            logger.warning(f"Profile update failed: user {user_id} not found")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        update_data = {"updated_at": datetime.utcnow()}
        
        # Check if email is being changed and if it's already taken
        if email and email != user["email"]:
            existing_user = await users_collection.find_one({"email": email})
            if existing_user:
                logger.warning(f"Profile update failed: email {email} already exists")
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
            update_data["email"] = email

        if is_active is not None:
            update_data["is_active"] = is_active

        # Update user
        await users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        # Fetch updated user
        updated_user = await users_collection.find_one({"_id": ObjectId(user_id)})

        logger.info(f"User {user_id} profile updated successfully")
        return UserResponse(
            id=int(user_id, 16) % (10**9),
            email=updated_user["email"],
            is_active=updated_user.get("is_active", True),
            is_verified=updated_user.get("is_verified", False),
            created_at=updated_user["created_at"].isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile update error for user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update profile")


@router.post("/change-password")
async def change_password(
    current_password: str = Form(...),
    new_password: str = Form(...),
    user_id: str = Depends(get_current_user)
):
    """Change user password."""
    try:
        logger.info(f"Password change request for user {user_id}")
        
        users_collection = get_users_collection()
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            logger.warning(f"Password change failed: user {user_id} not found")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Verify current password
        if not verify_password(current_password, user["hashed_password"]):
            logger.warning(f"Password change failed: invalid current password for user {user_id}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

        # Hash and update new password
        new_hashed = get_password_hash(new_password)
        await users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"hashed_password": new_hashed, "updated_at": datetime.utcnow()}}
        )

        logger.info(f"Password changed successfully for user {user_id}")
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password change error for user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to change password")


@router.delete("/me")
async def delete_user_account(
    password: str = Form(...),
    user_id: str = Depends(get_current_user)
):
    """Delete user account permanently."""
    try:
        logger.info(f"Account deletion request for user {user_id}")
        
        users_collection = get_users_collection()
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            logger.warning(f"Account deletion failed: user {user_id} not found")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Verify password before deletion
        if not verify_password(password, user["hashed_password"]):
            logger.warning(f"Account deletion failed: invalid password for user {user_id}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is incorrect")

        # Delete user's messages from MongoDB
        from app.db.mongodb import get_messages_collection, get_sessions_collection
        messages_collection = get_messages_collection()
        sessions_collection = get_sessions_collection()
        
        await messages_collection.delete_many({"user_id": user_id})
        await sessions_collection.delete_many({"user_id": user_id})

        # Delete user
        await users_collection.delete_one({"_id": ObjectId(user_id)})

        logger.info(f"Account deleted successfully for user {user_id}")
        return {"message": "Account deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Account deletion error for user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete account")


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Request password reset token."""
    try:
        logger.info(f"Password reset request for email: {request.email}")
        
        users_collection = get_users_collection()
        user = await users_collection.find_one({"email": request.email})

        if not user:
            # Don't reveal if email exists or not for security
            logger.warning(f"Password reset request for non-existent email: {request.email}")
            return {"message": "If the email exists, a password reset link has been sent"}

        if not user.get("is_verified"):
            logger.warning(f"Password reset request for unverified user: {request.email}")
            return {"message": "Please verify your email first"}

        # Generate reset token
        user_id = str(user["_id"])
        reset_token = create_access_token(subject=user_id, expires_delta=timedelta(hours=1))
        
        # Store reset token
        await users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"verification_token": reset_token, "updated_at": datetime.utcnow()}}
        )

        # Send reset email
        reset_link = f"{settings.BASE_URL}/api/auth/reset-password?token={reset_token}"
        # Note: You'd implement send_password_reset_email function
        # send_password_reset_email(user["email"], reset_link)

        logger.info(f"Password reset token generated for user {user_id}")
        return {"message": "If the email exists, a password reset link has been sent"}
        
    except Exception as e:
        logger.error(f"Password reset request error for {request.email}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to process request")


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using token."""
    try:
        logger.info("Password reset attempt with token")
        payload = decode_access_token(request.token)
        
        if not payload:
            logger.warning("Password reset failed: invalid token")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")

        user_id = payload.get("sub")
        if not user_id:
            logger.warning("Password reset failed: no user ID in token")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")

        users_collection = get_users_collection()
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            logger.warning(f"Password reset failed: user {user_id} not found")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        if user.get("verification_token") != request.token:
            logger.warning(f"Password reset failed: token mismatch for user {user_id}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")

        # Update password
        new_hashed = get_password_hash(request.new_password)
        await users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {"hashed_password": new_hashed, "updated_at": datetime.utcnow()},
                "$unset": {"verification_token": ""}
            }
        )

        logger.info(f"Password reset successfully for user {user_id}")
        return {"message": "Password reset successfully"}
        
    except HTTPException:
        raise
    except ValidationError as e:
        logger.warning(f"Password validation failed during reset: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Password reset error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to reset password")


@router.post("/resend-verification")
async def resend_verification(request: ResendVerificationRequest):
    """Resend verification using OTP or token."""
    try:
        logger.info(f"Resend verification requested for {request.email}")
        
        users_collection = get_users_collection()
        user = await users_collection.find_one({"email": request.email})
        
        if not user:
            logger.warning(f"Resend verification requested for non-existent email: {request.email}")
            # Don't reveal existence
            return {"message": "If the email exists, a verification message has been sent"}

        if user.get("is_verified"):
            logger.info(f"Resend verification requested but user already verified: {request.email}")
            return {"message": "Account already verified"}

        method = request.verification_method or user.get("verification_method") or "token"

        if method == "otp":
            otp = str(random.randint(100000, 999999))
            otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
            
            await users_collection.update_one(
                {"_id": user["_id"]},
                {
                    "$set": {
                        "otp": otp,
                        "otp_expires_at": otp_expires_at,
                        "verification_method": "otp",
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            try:
                send_otp_verification_email(user["email"], otp)
                logger.info(f"Resent OTP email to {user['email']}")
            except Exception as e:
                logger.warning(f"Failed to send OTP email during resend to {user['email']}: {e}")
        else:
            # token flow
            token = create_access_token(subject=user["email"], expires_delta=timedelta(hours=24))
            
            await users_collection.update_one(
                {"_id": user["_id"]},
                {
                    "$set": {
                        "verification_token": token,
                        "verification_method": "token",
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            try:
                verification_link = f"{settings.BASE_URL}/api/auth/verify?token={token}"
                send_token_verification_email(user["email"], verification_link)
                logger.info(f"Resent token verification email to {user['email']}")
            except Exception as e:
                logger.warning(f"Failed to send token verification email during resend to {user['email']}: {e}")

        return {"message": "If the email exists, a verification message has been sent"}
        
    except Exception as e:
        logger.error(f"Resend verification error for {request.email}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to process request")


@router.post("/logout")
async def logout(request: Request):
    """Revoke the provided bearer token.
    
    The token is stored in MongoDB with its expiry.
    Subsequent calls to protected endpoints will fail because `get_current_user`
    checks this collection.
    """
    try:
        auth = request.headers.get("authorization") or request.headers.get("Authorization")
        token = None
        
        if auth:
            parts = auth.split()
            if len(parts) == 2 and parts[0].lower() == "bearer":
                token = parts[1]

        # Allow token to be provided in body as fallback
        if not token:
            body = None
            try:
                body = await request.json()
            except Exception:
                body = None
            if body and isinstance(body, dict):
                token = body.get("token")

        if not token:
            # Be idempotent - returning success for no token
            return {"message": "No token provided; nothing to revoke"}

        # Try to decode token to get expiry
        expires_at = None
        try:
            payload = jose_jwt.get_unverified_claims(token)
            exp = payload.get("exp")
            if exp:
                # jose returns numeric epoch seconds
                expires_at = datetime.utcfromtimestamp(int(exp))
        except Exception:
            logger.exception("Failed to parse token expiry; proceeding without expires_at")

        # Store revoked token in MongoDB
        revoked_tokens_collection = get_revoked_tokens_collection()
        revoked_doc = {
            "token": token,
            "expires_at": expires_at,
            "revoked_at": datetime.utcnow()
        }
        
        await revoked_tokens_collection.insert_one(revoked_doc)
        
        logger.info("Token revoked successfully via logout")
        return {"message": "Logged out"}
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Logout failed")
