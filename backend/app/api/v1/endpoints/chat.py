import logging
import uuid
import json
from datetime import datetime
from typing import Optional, List
import re
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from app.schemas.validation import ChatRequest, ChatResponse, ConversationType, SessionSummaryResponse, ExportRequest, ExportFormat, FileUploadValidation
from app.core.deps import get_current_user
from app.services.ai_provider import generate_response
from app.services.session_manager import get_session_manager, SessionManager
from app.services.function_calling import FunctionCallingService, AVAILABLE_TOOLS
from app.services.model_router import smart_router
from app.services.memory_service import memory_service
from app.models.mongo_models import MessageDocument, SessionCreateRequest, SessionUpdateRequest, BulkOperationRequest, MessageReactionRequest, MessageRatingRequest, MessageBranchRequest
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

        # 🧠 MEMORY INTEGRATION: Retrieve relevant memories with context awareness
        relevant_memories = []
        memory_context = ""
        try:
            # Phase 2: Detect conversation contexts for better memory retrieval
            conversation_contexts = await memory_service.detect_conversation_context(
                message=req.message,
                recent_messages=recent_messages[-5:] if len(recent_messages) >= 5 else recent_messages
            )
            logger.info(f"Detected conversation contexts: {conversation_contexts}")
            
            # Retrieve memories with context filtering
            relevant_memories = await memory_service.get_relevant_memories(
                user_id=user_id,
                context=req.message,
                limit=5,
                min_importance=0.3,
                conversation_contexts=conversation_contexts  # Phase 2: Context-aware retrieval
            )
            
            if relevant_memories:
                logger.info(f"Retrieved {len(relevant_memories)} relevant memories for user {user_id}")
                memory_lines = []
                for mem in relevant_memories:
                    memory_lines.append(f"- {mem.content} [{mem.memory_type}]")
                memory_context = "\n".join(memory_lines)
                logger.info(f"Memory context: {memory_context[:200]}...")
            else:
                logger.info(f"No relevant memories found for user {user_id}")
        except Exception as e:
            logger.warning(f"Failed to retrieve memories for user {user_id}: {e}")
            # Continue without memories if retrieval fails

        # Create enhanced prompt with context AND memories
        prompt_parts = []
        
        # Add memory context first (what we know about the user)
        if memory_context:
            prompt_parts.append(f"What I know about you:\n{memory_context}\n")
        
        # Add conversation context
        if conversation_context:
            context_prompt = "\n".join([f"{msg['role']}: {msg['content']}" for msg in conversation_context])
            prompt_parts.append(f"Conversation history:\n{context_prompt}")
        
        # Combine all parts
        if prompt_parts:
            enhanced_prompt = "\n\n".join(prompt_parts)
        else:
            enhanced_prompt = req.message

        # Calculate context length for smart routing
        context_token_estimate = sum(len(msg['content'].split()) * 1.3 for msg in conversation_context)
        if memory_context:
            context_token_estimate += len(memory_context.split()) * 1.3
        
        # Use Smart Model Router if no specific model requested
        selected_model = req.model
        routing_metadata = None
        
        if not selected_model:
            # Smart routing enabled - analyze query and select optimal model
            routing_decision = smart_router.select_model(
                query=req.message,
                request_type=conversation_type.value,
                context_length=int(context_token_estimate),
                optimize_for=req.optimize_for or "balanced"  # Use user preference
            )
            selected_model = routing_decision["model"]
            routing_metadata = routing_decision
            logger.info(
                f"Smart Router selected: {selected_model} | "
                f"Complexity: {routing_decision['complexity']} | "
                f"Reason: {routing_decision['reason']}"
            )
        else:
            logger.info(f"User specified model: {selected_model}")

        # Check if model supports function calling
        # Supported: All OpenRouter models, Gemini, Groq Llama, Qwen, DeepSeek, Grok, Nemotron, Kimi
        model_supports_functions = selected_model and any(
            model_prefix in selected_model.lower() 
            for model_prefix in [
                "gpt-oss", "gpt-4", "gpt-3.5", "claude", "gemini", "mistral", 
                "command-r", "deepseek", "qwen", "llama-3.1", "llama-3.2", "grok",
                "nemotron", "kimi", "moonshot", "openai", "x-ai", "xai"
            ]
        )

        # Enable tools for supported models
        tools = AVAILABLE_TOOLS if model_supports_functions else None
        
        if model_supports_functions:
            logger.info(f"Model {selected_model} supports function calling. Tools enabled: {len(AVAILABLE_TOOLS)} tools")
        else:
            logger.info(f"Model {selected_model} does not support function calling")
        
        # Generate AI response with function calling support
        max_iterations = 2  # Reduced from 5 to prevent rate limiting - max 2 tool calls
        iteration = 0
        final_response = None
        tool_results = []
        
        while iteration < max_iterations:
            iteration += 1
            logger.info(f"Function calling iteration {iteration}/{max_iterations}")
            
            resp = await generate_response(
                enhanced_prompt,
                request_type=conversation_type.value,
                model=selected_model,
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
            metadata={
                "model": final_response.get("model"),  # Add model to metadata for frontend display
                "tool_results": tool_results if tool_results else None,
                "routing_metadata": routing_metadata,  # Add smart router decision
                "used_memories": [
                    {
                        "id": str(mem.id),
                        "content": mem.content,
                        "type": mem.memory_type,
                        "importance": mem.importance
                    }
                    for mem in relevant_memories
                ] if relevant_memories else []
            }
        )
        ai_message_id = await session_manager.add_message(ai_message)

        logger.info(f"Chat response generated and stored for user {user_id}")

        # 🧠 AUTOMATIC MEMORY EXTRACTION: Extract with throttling to prevent duplicates
        try:
            import asyncio
            from datetime import timedelta
            
            # Get session to check extraction status
            session = await session_manager.get_session(user_id, session_id)
            
            # Calculate messages since last extraction
            messages_since_extraction = session.message_count - session.extraction_message_count
            
            # Only extract if:
            # 1. Never extracted before, OR
            # 2. 15+ messages since last extraction, OR
            # 3. 2+ hours since last extraction
            should_extract = False
            reason = None
            if session.last_memory_extraction is None:
                should_extract = messages_since_extraction >= 2  # First extraction after just 2 messages (lowered for testing)
                reason = "initial extraction"
                logger.info(f"🧠 Memory extraction check: session_id={session_id}, messages={messages_since_extraction}, threshold=2, should_extract={should_extract}")
            elif messages_since_extraction >= 15:
                should_extract = True
                reason = f"{messages_since_extraction} new messages"
            elif (datetime.utcnow() - session.last_memory_extraction) > timedelta(hours=2):
                should_extract = messages_since_extraction >= 3  # At least 3 new messages
                reason = "2+ hours elapsed"
            
            if should_extract:
                asyncio.create_task(
                    memory_service.extract_memories_from_conversation(
                        user_id=user_id,
                        session_id=session_id,
                        message_limit=20
                    )
                )
                # Update extraction tracking
                from app.db.mongodb import mongodb_manager
                sessions_collection = mongodb_manager.get_collection("sessions")
                from bson import ObjectId
                await sessions_collection.update_one(
                    {"session_id": session_id, "user_id": user_id},
                    {
                        "$set": {
                            "last_memory_extraction": datetime.utcnow(),
                            "extraction_message_count": session.message_count
                        }
                    }
                )
                logger.info(f"🧠 Triggered memory extraction for session {session_id} ({reason})")
            else:
                logger.debug(f"🧠 Skipped memory extraction (throttled): {messages_since_extraction} messages since last")
        except Exception as e:
            logger.warning(f"Memory extraction trigger failed (non-critical): {e}")

        # Format used_memories for response
        used_memories_response = [
            {
                "id": str(mem.id),
                "content": mem.content,
                "type": mem.memory_type,
                "importance": mem.importance
            }
            for mem in relevant_memories
        ] if relevant_memories else None

        return ChatResponse(
            message_id=ai_message_id,
            session_id=session_id,
            reply=final_response["reply"],
            model=final_response.get("model"),
            provider=final_response.get("provider"),
            request_type=final_response.get("request_type"),
            usage=final_response.get("usage"),
            conversation_type=conversation_type,
            used_memories=used_memories_response
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
            provider_used=resp.get("provider"),
            metadata={
                "model": resp.get("model")  # Add model to metadata for frontend display
            }
        )
        ai_message_id = await session_manager.add_message(ai_message)

        logger.info(f"Chat response with files generated and stored for user {user_id}")

        # 🧠 AUTOMATIC MEMORY EXTRACTION: Extract with throttling
        try:
            import asyncio
            from datetime import timedelta
            
            session = await session_manager.get_session(user_id, session_id)
            
            # Ensure extraction fields are initialized
            if not hasattr(session, 'extraction_message_count') or session.extraction_message_count is None:
                session.extraction_message_count = 0
            
            messages_since_extraction = session.message_count - session.extraction_message_count
            
            should_extract = False
            reason = None
            if session.last_memory_extraction is None:
                should_extract = messages_since_extraction >= 2  # Lowered for testing
                reason = "initial extraction"
                logger.info(f"🧠 Memory extraction check (with-files): {messages_since_extraction} messages, threshold: 2, should_extract: {should_extract}")
            elif messages_since_extraction >= 15:
                should_extract = True
                reason = f"{messages_since_extraction} new messages"
            elif (datetime.utcnow() - session.last_memory_extraction) > timedelta(hours=2):
                should_extract = messages_since_extraction >= 3
                reason = "2+ hours elapsed"
            
            if should_extract:
                asyncio.create_task(
                    memory_service.extract_memories_from_conversation(
                        user_id=user_id,
                        session_id=session_id,
                        message_limit=20
                    )
                )
                from app.db.mongodb import mongodb_manager
                sessions_collection = mongodb_manager.get_collection("sessions")
                from bson import ObjectId
                await sessions_collection.update_one(
                    {"session_id": session_id, "user_id": user_id},
                    {
                        "$set": {
                            "last_memory_extraction": datetime.utcnow(),
                            "extraction_message_count": session.message_count
                        }
                    }
                )
                logger.info(f"🧠 Triggered memory extraction for file session {session_id} ({reason})")
            else:
                logger.debug(f"🧠 Skipped memory extraction (throttled): {messages_since_extraction} messages")
        except Exception as e:
            logger.warning(f"Memory extraction trigger failed (non-critical): {e}")

        return ChatResponse(
            message_id=ai_message_id,
            session_id=session_id,
            reply=resp["reply"],
            model=resp.get("model"),
            provider=resp.get("provider"),
            request_type=resp.get("request_type"),
            usage=resp.get("usage"),
            conversation_type=ConversationType(conversation_type),
            used_memories=None  # TODO: Add memory retrieval to /with-files endpoint
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
    """
    Stream AI responses in real-time using Server-Sent Events (SSE).
    NOW WITH TRUE TOKEN-BY-TOKEN STREAMING!
    """
    from fastapi.responses import StreamingResponse
    from app.services.ai_provider_streaming import create_streaming_provider
    from app.services.function_calling import FunctionCallingService
    import json
    import asyncio
    
    async def generate_stream():
        try:
            logger.info(f"TRUE STREAMING: Chat request from user {user_id}: {req.message[:50]}...")

            if not req.message:
                yield f"data: {json.dumps({'type': 'error', 'error': 'Message is required'})}\n\n"
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

            # Get conversation context (moved before memory retrieval)
            recent_messages = await session_manager.get_recent_messages(user_id, session_id, limit=10)
            conversation_context = [{"role": msg.role, "content": msg.content} for msg in recent_messages]
            conversation_context.append({"role": "user", "content": req.message})

            # Retrieve relevant memories
            relevant_memories = await memory_service.get_relevant_memories(
                user_id=user_id,
                context=req.message,
                limit=5,
                min_importance=0.3
            )
            
            # Send memory info to client
            if relevant_memories:
                memory_info = {
                    "type": "memories",
                    "count": len(relevant_memories),
                    "memories": [
                        {
                            "content": mem.content,
                            "type": mem.memory_type,
                            "importance": mem.importance
                        }
                        for mem in relevant_memories
                    ]
                }
                yield f"data: {json.dumps(memory_info)}\n\n"
            
            # Format memories as context
            memory_context = ""
            if relevant_memories:
                memory_lines = [f"- {mem.content} [{mem.memory_type}]" for mem in relevant_memories]
                memory_context = "\n".join(memory_lines)

            # Build enhanced prompt with memories and context
            prompt_parts = []
            
            if memory_context:
                prompt_parts.append(f"What I know about you:\n{memory_context}\n")
            
            if len(conversation_context) > 1:
                context_prompt = "\n".join([f"{msg['role']}: {msg['content']}" for msg in conversation_context[:-1]])
                prompt_parts.append(f"Conversation history:\n{context_prompt}")
            
            prompt_parts.append(f"Current message: {req.message}")
            enhanced_prompt = "\n\n".join(prompt_parts)

            # Calculate context length for smart routing (including memories)
            context_token_estimate = sum(len(msg['content'].split()) * 1.3 for msg in conversation_context)
            if memory_context:
                context_token_estimate += len(memory_context.split()) * 1.3
            
            # Use Smart Model Router if no specific model requested
            selected_model = req.model
            routing_metadata = None
            
            if not selected_model:
                # Smart routing enabled
                routing_decision = smart_router.select_model(
                    query=req.message,
                    request_type=conversation_type.value,
                    context_length=int(context_token_estimate),
                    optimize_for=req.optimize_for or "balanced"
                )
                selected_model = routing_decision["model"]
                routing_metadata = routing_decision
                
                # Send routing info to client
                yield f"data: {json.dumps({'type': 'routing', 'routing': routing_metadata})}\n\n"
                
                logger.info(
                    f"Smart Router selected: {selected_model} | "
                    f"Complexity: {routing_decision['complexity']} | "
                    f"Reason: {routing_decision['reason']}"
                )
            else:
                logger.info(f"User specified model: {selected_model}")

            # Store user message
            user_message = MessageDocument(
                user_id=user_id,
                session_id=session_id,
                role="user",
                content=req.message,
                token_count=None,  # Will update later
                model_used=selected_model,
                provider_used=None
            )
            user_message_id = await session_manager.add_message(user_message)

            # Check if model supports function calling
            model_supports_functions = selected_model and any(
                model_prefix in selected_model.lower() 
                for model_prefix in [
                    "gpt-oss", "gpt-4", "gpt-3.5", "claude", "gemini", "mistral", 
                    "command-r", "deepseek", "qwen", "llama-3.1", "llama-3.2", "grok",
                    "nemotron", "kimi", "moonshot", "openai", "x-ai", "xai"
                ]
            )

            # Enable tools for supported models
            tools = AVAILABLE_TOOLS if model_supports_functions else None
            
            if model_supports_functions:
                logger.info(f"Model {selected_model} supports function calling. Tools enabled: {len(AVAILABLE_TOOLS)} tools")
                # Send tools info to client
                yield f"data: {json.dumps({'type': 'tools_enabled', 'tools_count': len(AVAILABLE_TOOLS)})}\n\n"

            # CRITICAL: Groq and Gemini don't support function calling in streaming mode
            # If these models are selected AND tools are needed, fallback to non-streaming endpoint
            is_groq_model = selected_model and any(
                groq_prefix in selected_model.lower() 
                for groq_prefix in ["llama-3.1", "llama-3.2", "mixtral-8x7b", "gemma", "llama3-groq"]
            )
            
            is_gemini_model = selected_model and "gemini" in selected_model.lower()
            
            # Fallback to non-streaming if tools are needed with incompatible providers
            if (is_groq_model or is_gemini_model) and tools:
                provider_name_log = "Groq" if is_groq_model else "Gemini"
                logger.warning(f"{provider_name_log} model {selected_model} with function calling detected - {provider_name_log} doesn't support tools in streaming mode")
                logger.info(f"Falling back to non-streaming mode for {provider_name_log} with function calling")
                
                # Use the non-streaming endpoint logic
                from app.services.ai_provider import generate_response
                
                # Notify client about non-streaming mode
                yield f"data: {json.dumps({'type': 'info', 'message': 'Using non-streaming mode for function calling'})}\n\n"
                
                # Generate response using non-streaming provider (with function calling support)
                max_iterations = 2
                iteration = 0
                final_response_text = ""
                
                while iteration < max_iterations:
                    iteration += 1
                    
                    resp = await generate_response(
                        enhanced_prompt,
                        request_type=conversation_type.value,
                        model=selected_model,
                        max_tokens=req.max_tokens or 1000,
                        temperature=req.temperature or 0.7,
                        tools=tools
                    )
                    
                    # Check if AI wants to call a function
                    tool_calls = resp.get("tool_calls")
                    
                    if tool_calls:
                        logger.info(f"AI requested {len(tool_calls)} tool calls: {[tc.get('function', {}).get('name') for tc in tool_calls]}")
                        
                        # Execute all requested function calls
                        for tool_call in tool_calls:
                            function_name = tool_call.get("function", {}).get("name")
                            function_args_raw = tool_call.get("function", {}).get("arguments", "{}")
                            
                            # Parse arguments
                            try:
                                if isinstance(function_args_raw, dict):
                                    function_args = function_args_raw
                                elif isinstance(function_args_raw, str):
                                    function_args = json.loads(function_args_raw)
                                else:
                                    function_args = {}
                            except json.JSONDecodeError:
                                function_args = {}
                            
                            # Execute the function
                            result = await function_calling_service.execute_function(
                                function_name, 
                                function_args
                            )
                            
                            # Notify client about tool call
                            yield f"data: {json.dumps({'type': 'tool_call', 'function': function_name, 'result': result})}\n\n"
                            
                            # Add function result to prompt for next iteration
                            enhanced_prompt += f"\n\nFunction {function_name} returned: {result}\n\nPlease provide a natural response based on this information."
                    
                    else:
                        # No function calls, we have the final response
                        final_response_text = resp.get("reply", "")
                        usage_data = resp.get("usage")
                        provider_name = resp.get("provider")
                        break
                
                # Stream the final response word-by-word for better UX
                words = final_response_text.split()
                accumulated = ""
                for i, word in enumerate(words):
                    accumulated += word + (" " if i < len(words) - 1 else "")
                    yield f"data: {json.dumps({'type': 'chunk', 'content': word + ' ', 'accumulated': accumulated})}\n\n"
                    await asyncio.sleep(0.05)  # Small delay for visual effect
                
                # Mark as complete
                yield f"data: {json.dumps({'type': 'done', 'accumulated': final_response_text, 'usage': usage_data, 'provider': provider_name})}\n\n"
                
                # Save message to database
                await session_manager.add_message(
                    user_id=user_id,
                    session_id=session_id,
                    role="user",
                    content=req.message
                )
                
                await session_manager.add_message(
                    user_id=user_id,
                    session_id=session_id,
                    role="assistant",
                    content=final_response_text,
                    model=selected_model,
                    tokens_used=usage_data.get("total_tokens", 0) if usage_data else 0
                )
                
                # Extract and save memories
                await memory_service.extract_and_save_memories(
                    user_id=user_id,
                    user_message=req.message,
                    assistant_message=final_response_text,
                    session_id=session_id
                )
                
                yield "data: [DONE]\n\n"
                return

            # Create streaming provider with automatic fallback
            try:
                streaming_provider = await create_streaming_provider(selected_model)
            except Exception as e:
                logger.error(f"Failed to create streaming provider for {selected_model}: {e}")
                # Fallback to Groq if OpenRouter fails
                logger.info("Falling back to Groq llama-3.1-8b-instant")
                selected_model = "llama-3.1-8b-instant"
                streaming_provider = await create_streaming_provider(selected_model)
                yield f"data: {json.dumps({'type': 'fallback', 'message': 'Primary model unavailable, using fast fallback model', 'model': selected_model})}\n\n"
            
            # Generate TRUE token-by-token streaming response
            accumulated_text = ""
            tool_calls_received = []
            usage_data = None
            provider_name = None
            
            try:
                async for chunk in streaming_provider.generate_stream(
                    prompt=enhanced_prompt,
                    tools=tools,
                    max_tokens=req.max_tokens or 1000,
                    temperature=req.temperature or 0.7
                ):
                    chunk_type = chunk.get("type")
                    
                    if chunk_type == "content":
                        # Stream text content token-by-token
                        content = chunk.get("content", "")
                        accumulated_text = chunk.get("accumulated", "")
                        
                        yield f"data: {json.dumps({'type': 'chunk', 'content': content, 'accumulated': accumulated_text})}\n\n"
                    
                    elif chunk_type == "tool_call":
                        # Tool call detected during streaming
                        tool_call = chunk.get("tool_call")
                        tool_calls_received.append(tool_call)
                        
                        yield f"data: {json.dumps({'type': 'tool_call', 'tool_call': tool_call})}\n\n"
                    
                    elif chunk_type == "done":
                        # Streaming complete
                        accumulated_text = chunk.get("accumulated", accumulated_text)
                        tool_calls_received = chunk.get("tool_calls") or tool_calls_received
                        usage_data = chunk.get("usage")
                        provider_name = chunk.get("provider")
                        
                        logger.info(f"Streaming completed: {len(accumulated_text)} chars, {len(tool_calls_received) if tool_calls_received else 0} tool calls")
                    
                    elif chunk_type == "error":
                        # Error during streaming
                        error_msg = chunk.get("error", "Unknown streaming error")
                        logger.error(f"Streaming error: {error_msg}")
                        yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"
                        return
            
            except httpx.HTTPStatusError as http_err:
                # Catch 502 and other HTTP errors, try fallback
                if "502" in str(http_err) or "Bad Gateway" in str(http_err):
                    logger.error(f"OpenRouter service unavailable (502), falling back to Groq")
                    yield f"data: {json.dumps({'type': 'fallback', 'message': 'Service temporarily unavailable, switching to backup...', 'model': 'llama-3.1-8b-instant'})}\n\n"
                    
                    # Fallback to Groq
                    selected_model = "llama-3.1-8b-instant"
                    streaming_provider = await create_streaming_provider(selected_model)
                    
                    # Retry with Groq
                    async for chunk in streaming_provider.generate_stream(
                        prompt=enhanced_prompt,
                        tools=tools,
                        max_tokens=req.max_tokens or 1000,
                        temperature=req.temperature or 0.7
                    ):
                        chunk_type = chunk.get("type")
                        
                        if chunk_type == "content":
                            content = chunk.get("content", "")
                            accumulated_text = chunk.get("accumulated", "")
                            yield f"data: {json.dumps({'type': 'chunk', 'content': content, 'accumulated': accumulated_text})}\n\n"
                        
                        elif chunk_type == "done":
                            accumulated_text = chunk.get("accumulated", accumulated_text)
                            tool_calls_received = chunk.get("tool_calls") or tool_calls_received
                            usage_data = chunk.get("usage")
                            provider_name = chunk.get("provider")
                            logger.info(f"Fallback streaming completed: {len(accumulated_text)} chars")
                        
                        elif chunk_type == "error":
                            error_msg = chunk.get("error", "Unknown streaming error")
                            logger.error(f"Fallback streaming error: {error_msg}")
                            yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"
                            return
                else:
                    # Other HTTP errors
                    logger.error(f"HTTP error during streaming: {http_err}")
                    yield f"data: {json.dumps({'type': 'error', 'error': str(http_err)})}\n\n"
                    return
            
            except Exception as e:
                logger.error(f"Unexpected streaming error: {e}")
                yield f"data: {json.dumps({'type': 'error', 'error': f'An unexpected error occurred: {str(e)}'})}\n\n"
                return

            # Handle function calling if tool calls were made
            final_response = accumulated_text
            tool_results = []
            
            if tool_calls_received and model_supports_functions:
                function_service = FunctionCallingService()
                logger.info(f"Processing {len(tool_calls_received)} function calls...")
                
                for tool_call in tool_calls_received:
                    try:
                        func_name = tool_call.get("function", {}).get("name", "")
                        func_args = tool_call.get("function", {}).get("arguments", {})
                        
                        # Execute function
                        result = await function_service.execute_function(func_name, func_args)
                        tool_results.append({
                            "name": func_name,
                            "result": result
                        })
                        
                        # Send tool result to client
                        yield f"data: {json.dumps({'type': 'tool_result', 'name': func_name, 'result': result})}\n\n"
                        
                    except Exception as e:
                        logger.error(f"Function call error: {e}")
                        yield f"data: {json.dumps({'type': 'tool_error', 'error': str(e)})}\n\n"
                
                # If we got tool results, append them to the response
                if tool_results:
                    tool_summary = "\n\n" + "\n".join([f"[{tr['name']}]: {tr['result']}" for tr in tool_results])
                    final_response = accumulated_text + tool_summary

            # Store AI response with all metadata
            ai_message = MessageDocument(
                user_id=user_id,
                session_id=session_id,
                role="assistant",
                content=final_response,
                token_count=usage_data.get("completion_tokens") if usage_data else None,
                model_used=selected_model,
                provider_used=provider_name,
                metadata={
                    "model": selected_model,  # Add model to metadata for frontend display
                    "tool_results": tool_results if tool_results else None,
                    "routing_metadata": routing_metadata,
                    "streaming": True,
                    "used_memories": [
                        {
                            "id": str(mem.id),
                            "content": mem.content,
                            "type": mem.memory_type,
                            "importance": mem.importance
                        }
                        for mem in relevant_memories
                    ] if relevant_memories else []
                }
            )
            ai_message_id = await session_manager.add_message(ai_message)

            # 🧠 AUTOMATIC MEMORY EXTRACTION: Extract with throttling
            try:
                import asyncio
                from datetime import timedelta
                
                session = await session_manager.get_session(user_id, session_id)
                
                # Ensure extraction fields are initialized
                if not hasattr(session, 'extraction_message_count') or session.extraction_message_count is None:
                    session.extraction_message_count = 0
                
                messages_since_extraction = session.message_count - session.extraction_message_count
                
                should_extract = False
                reason = None
                if session.last_memory_extraction is None:
                    should_extract = messages_since_extraction >= 2  # Lowered for testing
                    reason = "initial extraction"
                    logger.info(f"🧠 Memory extraction check (SSE): {messages_since_extraction} messages, threshold: 2, should_extract: {should_extract}")
                elif messages_since_extraction >= 15:
                    should_extract = True
                    reason = f"{messages_since_extraction} new messages"
                elif (datetime.utcnow() - session.last_memory_extraction) > timedelta(hours=2):
                    should_extract = messages_since_extraction >= 3
                    reason = "2+ hours elapsed"
                
                if should_extract:
                    asyncio.create_task(
                        memory_service.extract_memories_from_conversation(
                            user_id=user_id,
                            session_id=session_id,
                            message_limit=20
                        )
                    )
                    from app.db.mongodb import mongodb_manager
                    sessions_collection = mongodb_manager.get_collection("sessions")
                    from bson import ObjectId
                    await sessions_collection.update_one(
                        {"session_id": session_id, "user_id": user_id},
                        {
                            "$set": {
                                "last_memory_extraction": datetime.utcnow(),
                                "extraction_message_count": session.message_count
                            }
                        }
                    )
                    logger.info(f"🧠 Triggered memory extraction for streaming session {session_id} ({reason})")
                else:
                    logger.debug(f"🧠 Skipped memory extraction (throttled): {messages_since_extraction} messages")
            except Exception as e:
                logger.warning(f"Memory extraction trigger failed (non-critical): {e}")

            # Update user message with actual token count
            if usage_data:
                await session_manager.update_message_tokens(user_message_id, usage_data.get("prompt_tokens"))

            # Send completion event
            completion_data = {
                "type": "complete",
                "message_id": ai_message_id,
                "session_id": session_id,
                "model": selected_model,
                "provider": provider_name,
                "usage": usage_data,
                "routing": routing_metadata,
                "tool_calls": len(tool_calls_received) if tool_calls_received else 0
            }
            yield f"data: {json.dumps(completion_data)}\n\n"

        except Exception as e:
            logger.error(f"Streaming error for user {user_id}: {e}")
            import traceback
            traceback.print_exc()
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


@router.get("/routing-stats")
async def get_routing_stats(
    user_id: str = Depends(get_current_user)
):
    """
    Get Smart Model Router statistics.
    
    Returns routing decisions, cost savings, and model usage patterns.
    """
    try:
        stats = smart_router.get_routing_stats()
        logger.info(f"Retrieved routing stats for user {user_id}")
        return {
            "success": True,
            "stats": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error retrieving routing stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve routing statistics")


@router.get("/models")
async def get_available_models(
    user_id: str = Depends(get_current_user)
):
    """
    Get list of available AI models with their capabilities.
    
    Returns model information including ID, name, provider, and features.
    """
    try:
        models = [
            # General Purpose Models
            {
                "id": "openai/gpt-oss-20b:free",
                "name": "GPT-OSS 20B (Free)",
                "provider": "OpenRouter",
                "type": "general",
                "supports_streaming": True,
                "supports_function_calling": True,
                "context_window": 8192,
                "cost_per_1k_tokens": 0.0
            },
            {
                "id": "llama-3.1-8b-instant",
                "name": "Llama 3.1 8B Instant",
                "provider": "Groq",
                "type": "general",
                "supports_streaming": True,
                "supports_function_calling": True,
                "context_window": 8192,
                "cost_per_1k_tokens": 0.0
            },
            # Coding Models
            {
                "id": "qwen/qwen3-coder:free",
                "name": "Qwen3 Coder",
                "provider": "OpenRouter",
                "type": "coding",
                "supports_streaming": True,
                "supports_function_calling": True,
                "context_window": 32768,
                "cost_per_1k_tokens": 0.0
            },
            {
                "id": "x-ai/grok-2:free",
                "name": "Grok 2",
                "provider": "OpenRouter",
                "type": "coding",
                "supports_streaming": True,
                "supports_function_calling": True,
                "context_window": 32768,
                "cost_per_1k_tokens": 0.0
            },
            # Reasoning Models
            {
                "id": "moonshotai/kimi-k2:free",
                "name": "Kimi K2",
                "provider": "OpenRouter",
                "type": "reasoning",
                "supports_streaming": True,
                "supports_function_calling": True,
                "context_window": 128000,
                "cost_per_1k_tokens": 0.0
            },
            {
                "id": "deepseek/deepseek-r1:free",
                "name": "DeepSeek R1",
                "provider": "OpenRouter",
                "type": "reasoning",
                "supports_streaming": True,
                "supports_function_calling": True,
                "context_window": 64000,
                "cost_per_1k_tokens": 0.0
            },
            # Vision/Image Models
            {
                "id": "google/gemma-3-27b-it:free",
                "name": "Gemma 3 27B",
                "provider": "OpenRouter",
                "type": "image",
                "supports_streaming": True,
                "supports_function_calling": True,
                "context_window": 8192,
                "cost_per_1k_tokens": 0.0
            },
            {
                "id": "qwen/qwen2.5-vl-32b-instruct:free",
                "name": "Qwen2.5 VL 32B",
                "provider": "OpenRouter",
                "type": "image",
                "supports_streaming": True,
                "supports_function_calling": True,
                "context_window": 32768,
                "cost_per_1k_tokens": 0.0
            },
            {
                "id": "nvidia/nemotron-nano-12b-v2-vl:free",
                "name": "Nemotron Nano 12B V2 VL",
                "provider": "OpenRouter",
                "type": "image",
                "supports_streaming": True,
                "supports_function_calling": True,
                "context_window": 8192,
                "cost_per_1k_tokens": 0.0
            },
            # Text Processing Models
            {
                "id": "gemini-2.5-flash",
                "name": "Gemini 2.5 Flash",
                "provider": "Google",
                "type": "text",
                "supports_streaming": True,
                "supports_function_calling": True,
                "context_window": 1000000,
                "cost_per_1k_tokens": 0.0
            },
        ]
        
        logger.info(f"Retrieved {len(models)} available models for user {user_id}")
        return {
            "success": True,
            "models": models,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error retrieving available models: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve available models")
