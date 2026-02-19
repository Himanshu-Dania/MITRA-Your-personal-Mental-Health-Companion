from flask import Flask, Response, request, jsonify
from flask_cors import CORS
import json
import threading

# from chatbot_stream import Chatbot
from agent_stream import TherapyAgent
import os
import asyncio
from queue import Queue
from functools import partial
import logging
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Enable CORS for all routes to allow external frontend clients
CORS(app, resources={
    r"/*": {
        "origins": "*",  # Configure specific origins in production
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],  # Ready for Bearer tokens
        "expose_headers": ["Content-Type"],
        "supports_credentials": True
    }
})

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# DB persistence helper (runs in a background thread after streaming ends)
# ---------------------------------------------------------------------------

def _save_conversation_to_db(
    user_id: str,
    conversation_id: str,
    user_message: str,
    bot_response: str,
    metadata: dict,
):
    """Persist user + companion messages after a chat turn completes."""
    try:
        from db_client import ensure_conversation, save_message

        ensure_conversation(user_id, conversation_id, user_message)

        # User message (no metadata)
        save_message(conversation_id, "user", user_message)

        # Companion message with captured metadata
        emotions     = metadata.get("emotions", [])
        strategies   = metadata.get("strategies", [])
        tool_events  = metadata.get("tool_events", [])
        rag_sources  = metadata.get("rag_sources", [])
        # Store as { toolName: {name, args, result} } for easy lookup in frontend
        tool_calls_obj = (
            {ev.get("name"): ev for ev in tool_events if ev.get("name")}
            if tool_events
            else {}
        )
        save_message(
            conversation_id,
            "companion",
            bot_response,
            emotion=emotions,
            strategy_used=strategies,
            tool_calls=tool_calls_obj,
            rag_sources=rag_sources,
        )
        logger.info("[DB] Saved turn for user=%s conversation=%s", user_id, conversation_id)
    except Exception as exc:
        logger.error("[DB] Failed to save conversation turn: %s", exc)

# Create a single instance of Chatbot
chatbot = TherapyAgent(task_debug=True, agent_debug=False)

# Create a single event loop for async operations
loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)


def run_in_loop(coroutine):
    """Run a coroutine in the main event loop"""
    future = asyncio.run_coroutine_threadsafe(coroutine, loop)
    try:
        return future.result()
    except Exception as e:
        logger.error(f"Error running coroutine: {e}", exc_info=True)
        raise


async def process_chat_async(message, conversation_id, user_id, queue, metadata_holder):
    """Process chat messages asynchronously"""
    try:
        async for chunk in chatbot.chat(message, conversation_id, user_id):
            await asyncio.sleep(0)  # Give other tasks a chance to run
            if isinstance(chunk, dict) and "__metadata__" in chunk:
                metadata_holder.update(chunk["__metadata__"])
            else:
                queue.put(chunk)
    except Exception as e:
        logger.error(f"Error in chat processing: {e}", exc_info=True)
        queue.put({"error": str(e)})
    finally:
        queue.put(None)  # Signal completion


def generate_response(message, conversation_id, user_id):
    queue = Queue()
    metadata_holder: dict = {}
    full_response: list = []

    # Start process_chat_async in a separate thread to fill the queue concurrently.
    threading.Thread(
        target=run_in_loop,
        args=(process_chat_async(message, conversation_id, user_id, queue, metadata_holder),),
        daemon=True,
    ).start()

    while True:
        chunk = queue.get()
        if chunk is None:  # Completion signal
            break
        if isinstance(chunk, dict) and "error" in chunk:
            yield f"data: {json.dumps({'error': chunk['error']})}\n\n"
            break
        full_response.append(chunk)
        yield f"data: {json.dumps({'content': chunk})}\n\n"

    # Forward tool events to the client as a special SSE frame
    tool_events = metadata_holder.get("tool_events", [])
    if tool_events:
        yield f"data: {json.dumps({'toolEvents': tool_events})}\n\n"

    # Persist the full turn to MongoDB in a background thread
    threading.Thread(
        target=_save_conversation_to_db,
        args=(
            user_id,
            conversation_id,
            message,
            "".join(full_response),
            metadata_holder,
        ),
        daemon=True,
    ).start()


@app.route("/")
def home():
    """API root endpoint - returns basic API information"""
    return jsonify({
        "name": "TherapyBot API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "/": "API information",
            "/health": "Health check endpoint",
            "/chat": "Chat endpoint (POST) - accepts message, sessionId, userId"
        }
    })


@app.route("/health")
def health():
    """Health check endpoint for monitoring"""
    return jsonify({"status": "healthy", "service": "TherapyBot API"}), 200


@app.route("/chat", methods=["POST"])
def chat():
    """
    Chat endpoint - streams responses via Server-Sent Events

    Expects JSON body:
    {
        "message": str,
        "conversationId": str,   -- MongoDB _id of the conversation
        "userId": str|int
    }

    Returns: text/event-stream with JSON chunks
    """
    try:
        data = request.json
        message = data.get("message")
        conversation_id = data.get("conversationId")
        user_id = data.get("userId")

        if not message or not conversation_id:
            return jsonify({"error": "Missing required fields: message and conversationId"}), 400

        return Response(
            generate_response(message, conversation_id, user_id),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
            },
        )
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


def run_event_loop():
    """Run the event loop in a separate thread"""
    asyncio.set_event_loop(loop)
    loop.run_forever()


if __name__ == "__main__":
    # Start the event loop in a separate thread
    thread = threading.Thread(target=run_event_loop, daemon=True)
    thread.start()

    try:
        port = int(os.environ.get("PORT", 5000))
        # Use threaded=True to handle multiple requests simultaneously
        app.run(
            host="0.0.0.0", port=port, debug=True, use_reloader=False, threaded=True
        )
    finally:
        # Clean up when the application exits
        loop.call_soon_threadsafe(loop.stop)
        thread.join()
        loop.close()
