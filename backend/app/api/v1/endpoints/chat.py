import logging
import uuid
import json
from datetime import datetime
from typing import Optional, List
import re
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from app.schemas.validation import ChatRequest, ChatResponse, ConversationType, SessionUpdateRequest, SessionSummaryResponse, ExportRequest, ExportFormat, FileUploadValidation
from app.core.deps import get_current_user
from app.services.ai_provider import generate_response
from app.services.session_manager import get_session_manager, SessionManager
from app.services.function_calling import FunctionCallingService, AVAILABLE_TOOLS
from app.models.mongo_models import MessageDocument, SessionCreateRequest, BulkOperationRequest, MessageReactionRequest, MessageRatingRequest, MessageBranchRequest
from app.utils.exceptions import (
    DatabaseConnectionError, 
    DatabaseTimeoutError, 
    DatabaseValidationError, 
    DatabaseDuplicateError,
    DatabaseError,
    SessionNotFoundError,
    MessageValidationError,
    ValidationError,
    ResourceNotFoundError,
    ExternalServiceError
)
from app.middleware.rate_limit import limiter
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

# Initialize function calling service
function_calling_service = FunctionCallingService()


@router.post("/", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    user_id: str = Depends(get_current_user),
    session_manager: SessionManager = Depends(get_session_manager)
):
    try:
        logger.info(f"Chat request from user {user_id}: {req.message[:50]}...")

        if not req.message:
            logger.warning(f"Empty message from user {user_id}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message is required")

        # Get session_id from request body (not query parameter)
        session_id = req.session_id
        conversation_type = req.conversation_type or ConversationType.general

        # Check if session exists, create if not provided or doesn't exist
        if session_id:
            logger.info(f"Looking for existing session: {session_id}")
            session = await session_manager.get_session(user_id, session_id)
            if session:
                logger.info(f"Using existing session: {session_id}")
            else:
                logger.warning(f"Session {session_id} not found, creating new one")
                session_req = SessionCreateRequest(title=f"Chat {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}")
                session = await session_manager.create_session(user_id, session_req)
                session_id = session.session_id
                logger.info(f"Created new session: {session_id}")
        else:
            logger.info("No session_id provided, creating new session")
            session_req = SessionCreateRequest(title=f"Chat {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}")
            session = await session_manager.create_session(user_id, session_req)
            session_id = session.session_id
            logger.info(f"Created new session: {session_id}")

        # Get conversation context (last 10 messages from this session)
        recent_messages = await session_manager.get_recent_messages(user_id, session_id, limit=10)

        # Build conversation context
        conversation_context = []
        for msg in recent_messages:
            conversation_context.append({
                "role": msg.role,
                "content": msg.content
            })

        # Add current message
        conversation_context.append({
            "role": "user",
            "content": req.message
        })

        # Create enhanced prompt with context
        if conversation_context:
            context_prompt = "\n".join([f"{msg['role']}: {msg['content']}" for msg in conversation_context])
            enhanced_prompt = f"Conversation context:\n{context_prompt}\n\nCurrent message: {req.message}"
        else:
            enhanced_prompt = req.message

        # Check if model supports function calling
        # Supported: GPT-4, GPT-3.5, Claude, Gemini, Mistral, Command R, DeepSeek, Qwen
        model_supports_functions = req.model and any(
            model_prefix in req.model.lower() 
            for model_prefix in [
                "gpt-4", "gpt-3.5", "claude", "gemini", "mistral", 
                "command-r", "deepseek", "qwen", "llama-3.1", "llama-3.2"
            ]
        )

        # Enable tools for supported models
        tools = AVAILABLE_TOOLS if model_supports_functions else None
        
        if model_supports_functions:
            logger.info(f"Model {req.model} supports function calling. Tools enabled: {len(AVAILABLE_TOOLS)} tools")
        else:
            logger.info(f"Model {req.model} does not support function calling")
        
        # Generate AI response with function calling support
        max_iterations = 5  # Prevent infinite loops
        iteration = 0
        final_response = None
        tool_results = []
        
        while iteration < max_iterations:
            iteration += 1
            logger.info(f"Function calling iteration {iteration}/{max_iterations}")
            
            resp = await generate_response(
                enhanced_prompt,
                request_type=conversation_type.value,
                model=req.model,
                max_tokens=req.max_tokens or 1000,
                temperature=req.temperature or 0.7,
                tools=tools
            )
            
            # Check if AI wants to call a function
            tool_calls = resp.get("tool_calls")
            
            if tool_calls:
                logger.info(f"AI requested {len(tool_calls)} tool calls: {[tc.get('function', {}).get('name') for tc in tool_calls]}")
            
            if not tool_calls:
                # No function calls, we have the final response
                final_response = resp
                break
            
            # Execute all requested function calls
            logger.info(f"AI requested {len(tool_calls)} tool calls")
            function_results = []
            
            for tool_call in tool_calls:
                function_name = tool_call.get("function", {}).get("name")
                function_args_raw = tool_call.get("function", {}).get("arguments", "{}")
                tool_call_id = tool_call.get("id", str(uuid.uuid4()))
                
                logger.info(f"Executing tool: {function_name} with args: {function_args_raw}")
                
                # Parse arguments - handle both dict and JSON string formats
                try:
                    if isinstance(function_args_raw, dict):
                        # Already a dict (e.g., from Gemini)
                        function_args = function_args_raw
                    elif isinstance(function_args_raw, str):
                        # JSON string (e.g., from OpenAI)
                        function_args = json.loads(function_args_raw)
                    else:
                        logger.error(f"Unexpected argument type: {type(function_args_raw)}")
                        function_args = {}
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse function arguments: {function_args_raw}, error: {e}")
                    function_args = {}
                
                # Execute the function
                result = await function_calling_service.execute_function(
                    function_name, 
                    function_args
                )
                
                tool_results.append({
                    "name": function_name,
                    "arguments": function_args,  # Store as dict for consistency
                    "result": result
                })
                
                # Add function result to context for next iteration
                function_results.append({
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "name": function_name,
                    "content": str(result.get("result") if result.get("success") else result.get("error"))
                })
            
            # Update prompt with function results for next iteration
            if function_results:
                results_text = "\n\n".join([
                    f"Tool: {fr['name']}\nResult: {fr['content']}"
                    for fr in function_results
                ])
                enhanced_prompt = f"{enhanced_prompt}\n\nTool Results:\n{results_text}\n\nPlease provide a final response using these results."
            else:
                # No results, break to avoid loop
                final_response = resp
                break
        
        if not final_response:
            # Max iterations reached, use last response
            final_response = resp
            logger.warning(f"Max function calling iterations reached for user {user_id}")
        
        # Store metadata about tool usage
        if tool_results:
            logger.info(f"Tools used in conversation: {[t['name'] for t in tool_results]}")

        # Store metadata about tool usage
        if tool_results:
            logger.info(f"Tools used in conversation: {[t['name'] for t in tool_results]}")

        # Store user message in MongoDB
        user_message = MessageDocument(
            user_id=user_id,
            session_id=session_id,
            role="user",
            content=req.message,
            token_count=final_response.get("usage", {}).get("prompt_tokens"),
            model_used=final_response.get("model"),
            provider_used=final_response.get("provider")
        )
        user_message_id = await session_manager.add_message(user_message)

        # Store AI response in MongoDB with tool usage metadata
        ai_message_content = final_response["reply"]
        
        # If tools were used, append a summary to the content
        if tool_results:
            tools_summary = "\n\n[Tools Used: " + ", ".join([t["name"] for t in tool_results]) + "]"
            ai_message_content = ai_message_content + tools_summary if ai_message_content else str(tool_results)
        
        ai_message = MessageDocument(
            user_id=user_id,
            session_id=session_id,
            role="assistant",
            content=ai_message_content,
            token_count=final_response.get("usage", {}).get("completion_tokens"),
            model_used=final_response.get("model"),
            provider_used=final_response.get("provider"),
            metadata={"tool_results": tool_results} if tool_results else None
        )
        ai_message_id = await session_manager.add_message(ai_message)

        logger.info(f"Chat response generated and stored for user {user_id}")

        return ChatResponse(
            message_id=ai_message_id,
            session_id=session_id,
            reply=final_response["reply"],
            model=final_response.get("model"),
            provider=final_response.get("provider"),
            request_type=final_response.get("request_type"),
            usage=final_response.get("usage"),
            conversation_type=conversation_type
        )

    except HTTPException:
        raise
    except DatabaseConnectionError as e:
        logger.error(f"Database connection error for user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database temporarily unavailable. Please try again later.")
    except DatabaseTimeoutError as e:
        logger.error(f"Database timeout error for user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="Request timed out. Please try again.")
    except (DatabaseValidationError, MessageValidationError) as e:
        logger.error(f"Validation error for user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except SessionNotFoundError as e:
        logger.error(f"Session not found error for user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session {e.session_id} not found")
    except ExternalServiceError as e:
        logger.error(f"External service error for user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI service temporarily unavailable. Please try again later.")
    except Exception as e:
        logger.error(f"Unexpected chat error for user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred. Please try again.")


@router.post("/with-files", response_model=ChatResponse)
async def chat_with_files(
    message: str = Form(..., description="Chat message"),
    session_id: Optional[str] = Form(None, description="Optional session identifier"),
    conversation_type: str = Form("general", description="Type of conversation"),
    model: Optional[str] = Form(None, description="Specific AI model to use"),
    files: List[UploadFile] = File(None, description="Optional file attachments"),
    user_id: str = Depends(get_current_user),
    session_manager: SessionManager = Depends(get_session_manager)
):
    try:
        logger.info(f"Chat request with files from user {user_id}: {message[:50]}...")

        if not message and (not files or len(files) == 0):
            logger.warning(f"Empty message and no files from user {user_id}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message or files are required")

        # Check if session exists, create if not provided or doesn't exist
        if session_id:
            logger.info(f"Looking for existing session: {session_id}")
            session = await session_manager.get_session(user_id, session_id)
            if session:
                logger.info(f"Using existing session: {session_id}")
            else:
                logger.warning(f"Session {session_id} not found, creating new one")
                session_req = SessionCreateRequest(title=f"Chat with files {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}")
                session = await session_manager.create_session(user_id, session_req)
                session_id = session.session_id
                logger.info(f"Created new session: {session_id}")
        else:
            logger.info("No session_id provided, creating new session")
            session_req = SessionCreateRequest(title=f"Chat with files {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}")
            session = await session_manager.create_session(user_id, session_req)
            session_id = session.session_id
            logger.info(f"Created new session: {session_id}")

        # Process file attachments with better error handling
        file_info = []
        enhanced_message = message or ""
        image_data = None

        if files:
            for file in files:
                if not file.filename:
                    continue

                try:
                    # Read file info for validation
                    file_size = len(await file.read())
                    file_type = file.content_type or "unknown"

                    # Validate file
                    FileUploadValidation.validate_file(file.filename, file_size, file_type)

                    # Sanitize filename
                    safe_filename = FileUploadValidation.sanitize_filename(file.filename)

                    file_info.append({
                        "name": safe_filename,
                        "original_name": file.filename,  # Keep original for reference
                        "size": file_size,
                        "type": file_type
                    })

                    # Reset file pointer for processing
                    await file.seek(0)

                    # Handle different file types
                    if file_type.startswith('image/'):
                        # For image files, read and encode as base64 for vision AI
                        try:
                            image_bytes = await file.read()
                            import base64
                            image_data = base64.b64encode(image_bytes).decode('utf-8')
                            enhanced_message += f"\n\n[Image attached: {safe_filename} - analyzing with vision AI]"
                        except Exception as e:
                            logger.warning(f"Failed to process image file {safe_filename}: {e}")
                            enhanced_message += f"\n\n[Image file: {safe_filename} - could not process]"
                    
                    elif file_type.startswith('text/'):
                        # For text files, try to read content
                        try:
                            content = await file.read()
                            content_str = content.decode('utf-8', errors='ignore')[:2000]  # Limit content
                            enhanced_message += f"\n\n[Text File: {safe_filename}]\n{content_str}"
                        except Exception as e:
                            logger.warning(f"Failed to read text file {safe_filename}: {e}")
                            enhanced_message += f"\n\n[Text File: {safe_filename} - could not read content]"
                    
                    else:
                        # For other binary files, just acknowledge attachment
                        enhanced_message += f"\n\n[File attached: {safe_filename} ({file_type})]"

                except ValidationError as e:
                    logger.warning(f"File validation failed for {file.filename}: {e}")
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
                except Exception as e:
                    logger.error(f"Error processing file {file.filename}: {e}")
                    enhanced_message += f"\n\n[File: {file.filename} - processing failed]"

        # Get conversation context (last 10 messages from this session)
        recent_messages = await session_manager.get_recent_messages(user_id, session_id, limit=10)

        # Build conversation context
        conversation_context = []
        for msg in recent_messages:
            conversation_context.append({
                "role": msg.role,
                "content": msg.content
            })

        # Add current message with file content
        conversation_context.append({
            "role": "user",
            "content": enhanced_message
        })

        # Create enhanced prompt with context
        if conversation_context:
            context_prompt = "\n".join([f"{msg['role']}: {msg['content']}" for msg in conversation_context])
            enhanced_prompt = f"Conversation context:\n{context_prompt}\n\nCurrent message: {enhanced_message}"
        else:
            enhanced_prompt = enhanced_message

        # Determine conversation type based on content and attachments
        conversation_type = "general"
        if image_data:
            conversation_type = "image"
        elif any(f.get('type', '').startswith('text/') for f in file_info):
            conversation_type = "text"
        elif "code" in enhanced_message.lower() or "function" in enhanced_message.lower():
            conversation_type = "coding"

        # Generate AI response
        resp = await generate_response(
            enhanced_prompt,
            request_type=conversation_type,
            model=model,
            max_tokens=1000,
            temperature=0.7,
            image_data=image_data,
            image_format=file_info[0].get('type') if image_data else None
        )

        # Store user message in MongoDB (include file info in content)
        message_content = enhanced_message
        if file_info:
            message_content += f"\n\n[Attachments: {', '.join([f['name'] for f in file_info])}]"

        user_message = MessageDocument(
            user_id=user_id,
            session_id=session_id,
            role="user",
            content=message_content,
            attachments=file_info,
            token_count=resp.get("usage", {}).get("prompt_tokens"),
            model_used=resp.get("model"),
            provider_used=resp.get("provider")
        )
        user_message_id = await session_manager.add_message(user_message)

        # Store AI response in MongoDB
        ai_message = MessageDocument(
            user_id=user_id,
            session_id=session_id,
            role="assistant",
            content=resp["reply"],
            token_count=resp.get("usage", {}).get("completion_tokens"),
            model_used=resp.get("model"),
            provider_used=resp.get("provider")
        )
        ai_message_id = await session_manager.add_message(ai_message)

        logger.info(f"Chat response with files generated and stored for user {user_id}")

        return ChatResponse(
            message_id=ai_message_id,
            session_id=session_id,
            reply=resp["reply"],
            model=resp.get("model"),
            provider=resp.get("provider"),
            request_type=resp.get("request_type"),
            usage=resp.get("usage"),
            conversation_type=ConversationType(conversation_type)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat with files error for user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Chat failed")


@router.get("/history/{session_id}")
async def get_conversation_history(
    session_id: str,
    limit: int = Query(50, ge=1, le=100),
    user_id: str = Depends(get_current_user),
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Get conversation history for a session."""
    try:
        # Validate session_id format
        import re
        uuid_pattern = r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
        if not re.match(uuid_pattern, session_id, re.IGNORECASE):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session ID format")

        # Get messages from MongoDB
        messages = await session_manager.get_messages(user_id, session_id, limit=limit)

        return {
            "session_id": session_id,
            "messages": [
                {
                    "id": str(msg.id),
                    "role": msg.role,
                    "content": msg.content,
                    "created_at": msg.created_at.isoformat(),
                    "attachments": msg.attachments,
                    "metadata": msg.metadata
                }
                for msg in messages
            ]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving conversation history: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve history")


@router.get("/sessions")
async def get_user_sessions(
    limit: int = Query(20, ge=1, le=100),
    query: Optional[str] = Query(None, description="Search query for title, content, or tags"),
    search_mode: str = Query("all", description="Search mode: 'title', 'content', or 'all'"),
    date_from: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    status: str = Query("active", description="Filter by status: 'active', 'archived', or 'all'"),
    sort_by: str = Query("last_activity", description="Sort by: 'last_activity', 'created', 'title', 'message_count'"),
    sort_order: str = Query("desc", description="Sort order: 'asc' or 'desc'"),
    user_id: str = Depends(get_current_user),
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Get user's conversation sessions with advanced search and filtering."""
    try:
        from app.models.mongo_models import SessionSearchRequest
        from datetime import datetime

        # Validate and sanitize query parameters
        if query:
            # Sanitize search query
            query = query.strip()
            if len(query) > 200:  # Reasonable limit for search queries
                raise HTTPException(status_code=400, detail="Search query too long (max 200 characters)")
            # Remove potentially harmful characters
            query = re.sub(r'[<>]', '', query)

        # Validate date formats
        date_from_parsed = None
        date_to_parsed = None
        if date_from:
            try:
                date_from_parsed = datetime.fromisoformat(date_from)
                if date_from_parsed > datetime.utcnow():
                    raise HTTPException(status_code=400, detail="date_from cannot be in the future")
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date_from format. Use YYYY-MM-DD")
        if date_to:
            try:
                date_to_parsed = datetime.fromisoformat(date_to)
                if date_to_parsed > datetime.utcnow():
                    raise HTTPException(status_code=400, detail="date_to cannot be in the future")
                # Set to end of day
                date_to_parsed = date_to_parsed.replace(hour=23, minute=59, second=59, microsecond=999999)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date_to format. Use YYYY-MM-DD")

        # Build search request
        search_request = SessionSearchRequest(
            query=query,
            status=status if status != "all" else None,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order
        )

        # Get sessions with advanced filtering
        sessions = await session_manager.get_user_sessions_with_content_search(
            user_id, 
            search_request, 
            search_mode=search_mode,
            date_from=date_from_parsed,
            date_to=date_to_parsed
        )

        return {
            "sessions": [
                {
                    "session_id": session.session_id,
                    "title": session.title,
                    "category": session.category,
                    "tags": session.tags,
                    "status": session.status,
                    "is_pinned": session.is_pinned,
                    "is_favorite": session.is_favorite,
                    "message_count": session.message_count,
                    "last_activity": session.last_activity.isoformat(),
                    "created_at": session.created_at.isoformat()
                }
                for session in sessions
            ]
        }

    except HTTPException:
        raise
    except DatabaseConnectionError as e:
        logger.warning(f"MongoDB connection error while retrieving sessions for user {user_id}: {e}")
        # Return empty sessions list instead of error when DB is unavailable
        return {"sessions": []}
    except DatabaseTimeoutError as e:
        logger.error(f"Database timeout error while retrieving sessions for user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="Request timed out. Please try again.")
    except Exception as e:
        logger.error(f"Error retrieving user sessions: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve sessions")


@router.delete("/sessions/{session_id}")
async def delete_conversation_session(
    session_id: str,
    user_id: str = Depends(get_current_user),
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Delete a conversation session and all its messages."""
    try:
        # Validate session_id format
        import re
        uuid_pattern = r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
        if not re.match(uuid_pattern, session_id, re.IGNORECASE):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session ID format")

        logger.info(f"Session deletion request for session {session_id} by user {user_id}")

        success = await session_manager.delete_session(user_id, session_id)

        if not success:
            logger.warning(f"Session deletion failed: session {session_id} not found for user {user_id}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

        logger.info(f"Session {session_id} deleted successfully for user {user_id}")
        return {"message": "Session deleted successfully"}

    except HTTPException:
        raise
    except DatabaseConnectionError as e:
        logger.error(f"Database connection error during session deletion for user {user_id}, session {session_id}: {e}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database temporarily unavailable. Please try again later.")
    except DatabaseTimeoutError as e:
        logger.error(f"Database timeout error during session deletion for user {user_id}, session {session_id}: {e}")
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="Request timed out. Please try again.")
    except Exception as e:
        logger.error(f"Session deletion error for user {user_id}, session {session_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete session")


@router.put("/sessions/{session_id}")
async def update_conversation_session(
    session_id: str,
    request: SessionUpdateRequest,
    user_id: str = Depends(get_current_user),
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Update conversation session metadata."""
    try:
        # Validate session_id format
        import re
        uuid_pattern = r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
        if not re.match(uuid_pattern, session_id, re.IGNORECASE):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session ID format")

        logger.info(f"Session update request for session {session_id} by user {user_id}")

        success = await session_manager.update_session(user_id, session_id, request)

        if not success:
            logger.warning(f"Session update failed: session {session_id} not found for user {user_id}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

        logger.info(f"Session {session_id} updated successfully for user {user_id}")
        return {"message": "Session updated successfully", "session_id": session_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Session update error for user {user_id}, session {session_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update session")


@router.get("/sessions/{session_id}/summary", response_model=SessionSummaryResponse)
async def get_conversation_summary(
    session_id: str,
    user_id: str = Depends(get_current_user),
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Get summary statistics for a conversation session."""
    try:
        # Validate session_id format
        import re
        uuid_pattern = r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
        if not re.match(uuid_pattern, session_id, re.IGNORECASE):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session ID format")

        logger.info(f"Session summary request for session {session_id} by user {user_id}")

        summary = await session_manager.get_session_summary(user_id, session_id)

        if not summary:
            logger.warning(f"Session summary failed: session {session_id} not found for user {user_id}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

        return summary

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Session summary error for user {user_id}, session {session_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get session summary")


@router.post("/sessions/{session_id}/export")
async def export_conversation(
    session_id: str,
    request: ExportRequest,
    user_id: str = Depends(get_current_user),
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Export conversation in specified format."""
    try:
        # Validate session_id format
        import re
        uuid_pattern = r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
        if not re.match(uuid_pattern, session_id, re.IGNORECASE):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session ID format")

        logger.info(f"Conversation export request for session {session_id} by user {user_id}")

        # Get messages from MongoDB
        messages = await session_manager.get_messages(user_id, session_id)

        if not messages:
            logger.warning(f"Export failed: session {session_id} not found for user {user_id}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

        # Format the conversation based on requested format
        if request.format == ExportFormat.json:
            conversation_data = {
                "session_id": session_id,
                "exported_at": datetime.utcnow().isoformat(),
                "message_count": len(messages),
                "messages": [
                    {
                        "id": str(msg.id),
                        "role": msg.role,
                        "content": msg.content,
                        "created_at": msg.created_at.isoformat(),
                        "timestamp": msg.created_at.timestamp(),
                        "attachments": msg.attachments,
                        "metadata": msg.metadata
                    } for msg in messages
                ] if request.include_metadata else [
                    {
                        "role": msg.role,
                        "content": msg.content
                    } for msg in messages
                ]
            }
            return conversation_data

        elif request.format == ExportFormat.txt:
            lines = [f"Conversation Export - Session: {session_id}"]
            lines.append(f"Exported at: {datetime.utcnow().isoformat()}")
            lines.append(f"Total messages: {len(messages)}")
            lines.append("-" * 50)

            for msg in messages:
                timestamp = msg.created_at.strftime("%Y-%m-%d %H:%M:%S")
                lines.append(f"[{timestamp}] {msg.role.title()}: {msg.content}")
                lines.append("")

            return {"format": "text", "content": "\n".join(lines)}

        elif request.format == ExportFormat.markdown:
            lines = [f"# Conversation Export\n"]
            lines.append(f"**Session ID:** {session_id}")
            lines.append(f"**Exported at:** {datetime.utcnow().isoformat()}")
            lines.append(f"**Total messages:** {len(messages)}\n")
            lines.append("---\n")

            for msg in messages:
                timestamp = msg.created_at.strftime("%Y-%m-%d %H:%M:%S")
                role_emoji = "👤" if msg.role == "user" else "🤖"
                lines.append(f"**{role_emoji} {msg.role.title()}** ({timestamp}):")
                lines.append(f"{msg.content}\n")

            return {"format": "markdown", "content": "\n".join(lines)}

        logger.info(f"Conversation exported successfully for session {session_id}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Export error for user {user_id}, session {session_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to export conversation")


@router.post("/sessions/bulk")
async def bulk_session_operations(
    request: BulkOperationRequest,
    user_id: str = Depends(get_current_user),
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Perform bulk operations on multiple sessions."""
    try:
        logger.info(f"Bulk operation request: {request.operation} on {len(request.session_ids)} sessions by user {user_id}")

        if not request.session_ids:
            raise HTTPException(status_code=400, detail="No session IDs provided")

        # Validate that all requested sessions exist and belong to the user
        user_sessions = []
        for session_id in request.session_ids:
            session = await session_manager.get_session(user_id, session_id)
            if not session:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Session {session_id} not found or does not belong to user"
                )
            user_sessions.append(session)

        results = []
        
        if request.operation == "archive":
            for session in user_sessions:
                success = await session_manager.archive_session(user_id, session.session_id)
                results.append({"session_id": session.session_id, "success": success})
                
        elif request.operation == "delete":
            for session in user_sessions:
                success = await session_manager.delete_session(user_id, session.session_id)
                results.append({"session_id": session.session_id, "success": success})
                
        elif request.operation == "tag":
            if not request.tag:
                raise HTTPException(status_code=400, detail="Tag name required for tag operation")
            for session in user_sessions:
                try:
                    success = await session_manager.tag_session(user_id, session.session_id, request.tag)
                    results.append({"session_id": session.session_id, "success": success})
                except Exception as e:
                    logger.error(f"Error tagging session {session.session_id}: {e}")
                    results.append({"session_id": session.session_id, "success": False, "error": str(e)})
                
        elif request.operation == "untag":
            if not request.tag:
                raise HTTPException(status_code=400, detail="Tag name required for untag operation")
            for session in user_sessions:
                try:
                    success = await session_manager.untag_session(user_id, session.session_id, request.tag)
                    results.append({"session_id": session.session_id, "success": success})
                except Exception as e:
                    logger.error(f"Error untagging session {session.session_id}: {e}")
                    results.append({"session_id": session.session_id, "success": False, "error": str(e)})
                
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported operation: {request.operation}")

        successful = sum(1 for r in results if r["success"])
        logger.info(f"Bulk operation completed: {successful}/{len(results)} successful")
        
        return {
            "operation": request.operation,
            "total_requested": len(request.session_ids),
            "successful": successful,
            "failed": len(results) - successful,
            "results": results
        }

    except HTTPException:
        raise
    except DatabaseConnectionError as e:
        logger.error(f"Database connection error during bulk operation for user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database temporarily unavailable. Please try again later.")
    except DatabaseTimeoutError as e:
        logger.error(f"Database timeout error during bulk operation for user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="Request timed out. Please try again.")
    except Exception as e:
        logger.error(f"Bulk operation error for user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to perform bulk operation")


# ============= NEW FEATURES =============

@router.post("/stream")
async def chat_stream(
    req: ChatRequest,
    user_id: str = Depends(get_current_user),
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Stream AI responses in real-time using Server-Sent Events (SSE)."""
    from fastapi.responses import StreamingResponse
    import json
    import asyncio
    
    async def generate_stream():
        try:
            logger.info(f"Streaming chat request from user {user_id}: {req.message[:50]}...")

            if not req.message:
                yield f"data: {json.dumps({'error': 'Message is required'})}\n\n"
                return

            # Get or create session
            session_id = req.session_id
            conversation_type = req.conversation_type or ConversationType.general

            if session_id:
                session = await session_manager.get_session(user_id, session_id)
                if not session:
                    session_req = SessionCreateRequest(title=f"Chat {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}")
                    session = await session_manager.create_session(user_id, session_req)
                    session_id = session.session_id
            else:
                session_req = SessionCreateRequest(title=f"Chat {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}")
                session = await session_manager.create_session(user_id, session_req)
                session_id = session.session_id

            # Send session_id first
            yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id})}\n\n"

            # Get conversation context
            recent_messages = await session_manager.get_recent_messages(user_id, session_id, limit=10)
            conversation_context = [{"role": msg.role, "content": msg.content} for msg in recent_messages]
            conversation_context.append({"role": "user", "content": req.message})

            # Generate AI response (simulate streaming by chunking)
            resp = await generate_response(
                req.message,
                request_type=conversation_type.value,
                model=req.model,
                max_tokens=req.max_tokens or 1000,
                temperature=req.temperature or 0.7
            )

            # Store user message
            user_message = MessageDocument(
                user_id=user_id,
                session_id=session_id,
                role="user",
                content=req.message,
                token_count=resp.get("usage", {}).get("prompt_tokens"),
                model_used=resp.get("model"),
                provider_used=resp.get("provider")
            )
            user_message_id = await session_manager.add_message(user_message)

            # Stream the response in chunks (word by word simulation)
            full_response = resp["reply"]
            words = full_response.split()
            accumulated_text = ""
            
            for i, word in enumerate(words):
                accumulated_text += word + " "
                chunk_data = {
                    "type": "chunk",
                    "content": word + " ",
                    "accumulated": accumulated_text.strip(),
                    "index": i
                }
                yield f"data: {json.dumps(chunk_data)}\n\n"
                await asyncio.sleep(0.05)  # Small delay for streaming effect

            # Store AI response
            ai_message = MessageDocument(
                user_id=user_id,
                session_id=session_id,
                role="assistant",
                content=full_response,
                token_count=resp.get("usage", {}).get("completion_tokens"),
                model_used=resp.get("model"),
                provider_used=resp.get("provider")
            )
            ai_message_id = await session_manager.add_message(ai_message)

            # Send completion event
            completion_data = {
                "type": "complete",
                "message_id": ai_message_id,
                "session_id": session_id,
                "model": resp.get("model"),
                "provider": resp.get("provider"),
                "usage": resp.get("usage")
            }
            yield f"data: {json.dumps(completion_data)}\n\n"

        except Exception as e:
            logger.error(f"Streaming error for user {user_id}: {e}")
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/messages/{message_id}/reaction")
async def add_message_reaction(
    message_id: str,
    request: MessageReactionRequest,
    user_id: str = Depends(get_current_user),
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Add or update a reaction to a message."""
    from bson import ObjectId
    
    try:
        logger.info(f"Reaction request from user {user_id} for message {message_id}: {request.reaction_type}")
        
        # Validate reaction type
        valid_reactions = ["like", "dislike", "love", "laugh", "confused"]
        if request.reaction_type not in valid_reactions:
            raise HTTPException(status_code=400, detail=f"Invalid reaction type. Must be one of: {valid_reactions}")
        
        # Get MongoDB collection
        db = session_manager.db
        messages_collection = db["messages"]
        
        # Find message
        message = await messages_collection.find_one({"_id": ObjectId(message_id)})
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        # Check if user already reacted
        user_reactions = message.get("user_reactions", {})
        previous_reaction = user_reactions.get(user_id)
        
        # Update reactions count
        reactions = message.get("reactions", {"like": 0, "dislike": 0})
        
        # Remove previous reaction if exists
        if previous_reaction and previous_reaction in reactions:
            reactions[previous_reaction] = max(0, reactions.get(previous_reaction, 0) - 1)
        
        # Add new reaction
        reactions[request.reaction_type] = reactions.get(request.reaction_type, 0) + 1
        user_reactions[user_id] = request.reaction_type
        
        # Update message
        await messages_collection.update_one(
            {"_id": ObjectId(message_id)},
            {
                "$set": {
                    "reactions": reactions,
                    "user_reactions": user_reactions,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"Reaction added successfully for message {message_id}")
        return {
            "message_id": message_id,
            "reactions": reactions,
            "user_reaction": request.reaction_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding reaction for message {message_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to add reaction")


@router.get("/messages/{message_id}/reactions")
async def get_message_reactions(
    message_id: str,
    user_id: str = Depends(get_current_user),
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Get reactions for a message."""
    from bson import ObjectId
    
    try:
        # Get MongoDB collection
        db = session_manager.db
        messages_collection = db["messages"]
        
        # Find message
        message = await messages_collection.find_one({"_id": ObjectId(message_id)})
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        reactions = message.get("reactions", {"like": 0, "dislike": 0})
        user_reactions = message.get("user_reactions", {})
        user_reaction = user_reactions.get(user_id)
        
        return {
            "message_id": message_id,
            "reactions": reactions,
            "user_reaction": user_reaction,
            "total_reactions": sum(reactions.values())
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting reactions for message {message_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get reactions")


@router.post("/messages/{message_id}/rating")
async def rate_message(
    message_id: str,
    request: MessageRatingRequest,
    user_id: str = Depends(get_current_user),
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Rate a message (1-5 stars)."""
    from bson import ObjectId
    
    try:
        logger.info(f"Rating request from user {user_id} for message {message_id}: {request.rating} stars")
        
        # Get MongoDB collection
        db = session_manager.db
        messages_collection = db["messages"]
        
        # Find message
        message = await messages_collection.find_one({"_id": ObjectId(message_id)})
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        # Update rating
        await messages_collection.update_one(
            {"_id": ObjectId(message_id)},
            {
                "$set": {
                    "rating": request.rating,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"Rating added successfully for message {message_id}")
        return {
            "message_id": message_id,
            "rating": request.rating
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rating message {message_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to rate message")


@router.post("/messages/{message_id}/branch")
async def create_message_branch(
    message_id: str,
    request: MessageBranchRequest,
    user_id: str = Depends(get_current_user),
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Create a conversation branch from a specific message."""
    from bson import ObjectId
    import uuid
    
    try:
        logger.info(f"Branch request from user {user_id} for message {message_id}")
        
        # Get MongoDB collections
        db = session_manager.db
        messages_collection = db["messages"]
        sessions_collection = db["sessions"]
        
        # Find parent message
        parent_message = await messages_collection.find_one({"_id": ObjectId(message_id)})
        if not parent_message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        session_id = parent_message["session_id"]
        
        # Get session
        session = await sessions_collection.find_one({"user_id": user_id, "session_id": session_id})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Create new branch
        branch_id = str(uuid.uuid4())
        branch_name = request.branch_name or f"Branch {len(session.get('branches', [])) + 1}"
        
        # Create edited user message with branch info
        edited_message = MessageDocument(
            user_id=user_id,
            session_id=session_id,
            role="user",
            content=request.new_content,
            parent_message_id=message_id,
            branch_id=branch_id,
            is_edited=True
        )
        edited_message_id = await session_manager.add_message(edited_message)
        
        # Generate new AI response for the branch
        resp = await generate_response(
            request.new_content,
            request_type="general",
            max_tokens=1000,
            temperature=0.7
        )
        
        # Store branched AI response
        branch_ai_message = MessageDocument(
            user_id=user_id,
            session_id=session_id,
            role="assistant",
            content=resp["reply"],
            parent_message_id=message_id,
            branch_id=branch_id,
            token_count=resp.get("usage", {}).get("completion_tokens"),
            model_used=resp.get("model"),
            provider_used=resp.get("provider")
        )
        branch_ai_message_id = await session_manager.add_message(branch_ai_message)
        
        # Update session with branch metadata
        branch_metadata = {
            "branch_id": branch_id,
            "branch_name": branch_name,
            "parent_message_id": message_id,
            "created_at": datetime.utcnow().isoformat(),
            "message_count": 2
        }
        
        await sessions_collection.update_one(
            {"user_id": user_id, "session_id": session_id},
            {
                "$push": {"branches": branch_metadata},
                "$set": {"active_branch_id": branch_id, "updated_at": datetime.utcnow()}
            }
        )
        
        logger.info(f"Branch {branch_id} created successfully from message {message_id}")
        return {
            "branch_id": branch_id,
            "branch_name": branch_name,
            "parent_message_id": message_id,
            "edited_message_id": edited_message_id,
            "ai_response_id": branch_ai_message_id,
            "ai_response": resp["reply"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating branch for message {message_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to create branch")


@router.get("/sessions/{session_id}/branches")
async def get_session_branches(
    session_id: str,
    user_id: str = Depends(get_current_user),
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Get all branches for a session."""
    try:
        # Get MongoDB collection
        db = session_manager.db
        sessions_collection = db["sessions"]
        messages_collection = db["messages"]
        
        # Get session
        session = await sessions_collection.find_one({"user_id": user_id, "session_id": session_id})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        branches = session.get("branches", [])
        active_branch_id = session.get("active_branch_id")
        
        # Enrich branch data with message counts
        enriched_branches = []
        for branch in branches:
            branch_messages = await messages_collection.count_documents({
                "session_id": session_id,
                "branch_id": branch["branch_id"]
            })
            enriched_branches.append({
                **branch,
                "message_count": branch_messages,
                "is_active": branch["branch_id"] == active_branch_id
            })
        
        return {
            "session_id": session_id,
            "branches": enriched_branches,
            "active_branch_id": active_branch_id,
            "total_branches": len(branches)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting branches for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get branches")


@router.put("/sessions/{session_id}/branch/{branch_id}/activate")
async def activate_branch(
    session_id: str,
    branch_id: str,
    user_id: str = Depends(get_current_user),
    session_manager: SessionManager = Depends(get_session_manager)
):
    """Switch to a different conversation branch."""
    try:
        # Get MongoDB collection
        db = session_manager.db
        sessions_collection = db["sessions"]
        
        # Update active branch
        result = await sessions_collection.update_one(
            {"user_id": user_id, "session_id": session_id},
            {"$set": {"active_branch_id": branch_id, "updated_at": datetime.utcnow()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        
        logger.info(f"Branch {branch_id} activated for session {session_id}")
        return {
            "session_id": session_id,
            "active_branch_id": branch_id,
            "message": "Branch activated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error activating branch {branch_id} for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to activate branch")
