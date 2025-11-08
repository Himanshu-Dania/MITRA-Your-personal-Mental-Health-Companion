from flask import Flask, render_template, Response, request
import json
from chatbot_stream import Chatbot
import os
import asyncio
import threading
from queue import Queue
from functools import partial
import logging
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create a single instance of Chatbot
chatbot = Chatbot()

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
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.json
        message = data.get("message")
        session_id = data.get("sessionId")
        user_id = data.get("userId", "default-user")

        if not message or not session_id:
            return {"error": "Missing required fields"}, 400

        return Response(
            generate_response(message, session_id, user_id),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",  # Disable nginx buffering if you're using it
            },
        )
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}", exc_info=True)
        return {"error": str(e)}, 500


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
