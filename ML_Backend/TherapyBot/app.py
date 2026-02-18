from flask import Flask, Response, request, jsonify
from flask_cors import CORS
import json

# from chatbot_stream import Chatbot
from agent_stream import TherapyAgent
import os
import asyncio
import threading
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


async def process_chat_async(message, session_id, user_id, queue):
    """Process chat messages asynchronously"""
    try:
        async for chunk in chatbot.chat(message, session_id, user_id):
            await asyncio.sleep(0)  # Give other tasks a chance to run
            queue.put(chunk)
    except Exception as e:
        logger.error(f"Error in chat processing: {e}", exc_info=True)
        queue.put({"error": str(e)})
    finally:
        queue.put(None)  # Signal completion


def generate_response(message, session_id, user_id):
    queue = Queue()

    # Start process_chat_async in a separate thread to fill the queue concurrently.
    threading.Thread(
        target=run_in_loop,
        args=(process_chat_async(message, session_id, user_id, queue),),
        daemon=True,
    ).start()

    while True:
        chunk = queue.get()
        if chunk is None:  # Completion signal
            break
        if isinstance(chunk, dict) and "error" in chunk:
            yield f"data: {json.dumps({'error': chunk['error']})}\n\n"
            break
        yield f"data: {json.dumps({'content': chunk})}\n\n"


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
        "sessionId": str|int,
        "userId": str|int
    }
    
    Returns: text/event-stream with JSON chunks
    
    Future: Add authentication by checking Authorization header:
    # auth_header = request.headers.get('Authorization')
    # if auth_header and auth_header.startswith('Bearer '):
    #     token = auth_header.split(' ')[1]
    #     # Validate token here
    """
    try:
        data = request.json
        message = data.get("message")
        session_id = data.get("sessionId") or 0
        user_id = data.get("userId") or 0

        if not message or not session_id:
            return jsonify({"error": "Missing required fields"}), 400

        return Response(
            generate_response(message, session_id, user_id),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",  # Disable nginx buffering if you're using it
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
