# TherapyBot API Server

A pure REST API server for the TherapyBot backend, separated from the frontend. This Flask application provides endpoints for chat functionality using Server-Sent Events (SSE) for real-time streaming responses.

## Architecture

```
Frontend (JS/React)
    ↓ HTTP POST
Backend (Flask API)
    ↓
TherapyAgent (Python)
    ↓ Streams via SSE
Frontend receives chunks
```

## Setup

### 1. Install Dependencies

```bash
cd /home/himanshu/ML/Therapy/ML_Backend
pip install -r requirements.txt
```

### 2. Configure Environment

Ensure your `.env` file contains all necessary API keys and configuration:

```env
PORT=5000
# Add your API keys and other configs here
```

### 3. Run the Server

```bash
cd TherapyBot
python app.py
```

The server will start on `http://localhost:5000` (or the port specified in your `.env` file).

## API Endpoints

### GET `/`

Returns basic API information and available endpoints.

**Response:**

```json
{
    "name": "TherapyBot API",
    "version": "1.0.0",
    "status": "running",
    "endpoints": {
        "/": "API information",
        "/health": "Health check endpoint",
        "/chat": "Chat endpoint (POST) - accepts message, sessionId, userId"
    }
}
```

### GET `/health`

Health check endpoint for monitoring and load balancers.

**Response:**

```json
{
    "status": "healthy",
    "service": "TherapyBot API"
}
```

### POST `/chat`

Main chat endpoint that streams responses using Server-Sent Events.

**Request Headers:**

- `Content-Type: application/json`
- `Authorization: Bearer <token>` _(optional, for future use)_

**Request Body:**

```json
{
    "message": "I'm feeling anxious today",
    "sessionId": "user123-session456",
    "userId": "user123"
}
```

**Response:**

- Content-Type: `text/event-stream`
- Streams JSON chunks in SSE format

**Stream Format:**

```
data: {"content": "I understand"}
data: {"content": " that"}
data: {"content": " you're"}
data: {"content": " feeling anxious"}
```

**Error Format:**

```
data: {"error": "Error message here"}
```

## CORS Configuration

The API is configured with CORS enabled to accept requests from external frontend applications:

- **Origins:** `*` (configure specific origins in production)
- **Methods:** `GET`, `POST`, `OPTIONS`
- **Headers:** `Content-Type`, `Authorization`
- **Credentials:** Supported

**Production Note:** Update the CORS `origins` setting in [app.py](app.py) to restrict access to your specific frontend domain(s).

## Frontend Integration

### JavaScript Example (Fetch API)

```javascript
const eventSource = new EventSource("http://localhost:5000/chat", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        message: "Hello, I need help",
        sessionId: "session-123",
        userId: "user-456",
    }),
});

eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.content) {
        console.log("Received chunk:", data.content);
        // Update UI with streamed content
    } else if (data.error) {
        console.error("Error:", data.error);
        eventSource.close();
    }
};

eventSource.onerror = (error) => {
    console.error("Connection error:", error);
    eventSource.close();
};
```

### Using fetch with SSE (for POST)

Since EventSource doesn't support POST, use fetch:

```javascript
async function chatWithBot(message, sessionId, userId) {
    const response = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            message,
            sessionId,
            userId,
        }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
            if (line.startsWith("data: ")) {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                    console.log("Chunk:", data.content);
                    // Update UI
                } else if (data.error) {
                    console.error("Error:", data.error);
                }
            }
        }
    }
}

// Usage
chatWithBot("I need help with anxiety", "session-123", "user-456");
```

### React Example

```jsx
import { useState, useEffect } from "react";

function ChatComponent() {
    const [response, setResponse] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);

    const sendMessage = async (message) => {
        setIsStreaming(true);
        setResponse("");

        try {
            const res = await fetch("http://localhost:5000/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message,
                    sessionId: "session-" + Date.now(),
                    userId: "user-123",
                }),
            });

            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const data = JSON.parse(line.slice(6));
                        if (data.content) {
                            setResponse((prev) => prev + data.content);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsStreaming(false);
        }
    };

    return (
        <div>
            <button onClick={() => sendMessage("Hello")}>Send Message</button>
            <div>{response}</div>
        </div>
    );
}
```

## Authentication (Future Implementation)

The API is prepared for token-based authentication. To implement:

1. Uncomment the authentication code in the `/chat` endpoint
2. Implement token validation logic
3. Frontend should include the token in requests:

```javascript
fetch('http://localhost:5000/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  },
  body: JSON.stringify({ ... })
});
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200 OK` - Successful request
- `400 Bad Request` - Missing required fields (message or sessionId)
- `500 Internal Server Error` - Server-side error

Error responses use JSON format:

```json
{
    "error": "Error description"
}
```

## Technical Details

### Threading Model

- **Main Thread**: Runs the Flask application
- **Event Loop Thread**: Handles async operations for the TherapyAgent
- **Request Threads**: Each chat request spawns a thread to process responses

### Session Management

- Sessions are identified by `sessionId`
- Users are identified by `userId`
- The agent maintains conversation history per session

### Streaming

- Uses Server-Sent Events (SSE) for real-time streaming
- Each response chunk is sent as a separate `data:` event
- Connection remains open until streaming completes
- `Connection: keep-alive` header ensures stable streaming

## Development

### Running in Development Mode

```bash
python app.py
```

The server runs with:

- `debug=True` for auto-reload on code changes
- `use_reloader=False` to prevent duplicate event loops
- `threaded=True` for concurrent request handling

### Production Deployment

For production, use a production WSGI server:

```bash
gunicorn -w 4 -k gevent -b 0.0.0.0:5000 app:app
```

Or use the provided configuration in your hosting platform.

## Important Notes

1. **No HTML Rendering**: This is a pure API server. It does not serve any HTML files or templates.

2. **CORS Enabled**: The API accepts requests from any origin by default. Configure this properly for production.

3. **Stateless API**: Each request is independent. Session state is managed by the TherapyAgent.

4. **Async Architecture**: The async/threading model is preserved from the original implementation.

5. **Frontend Separation**: The frontend must be hosted separately (e.g., as a static React app, on Vercel, Netlify, etc.).

## Next Steps

1. **Deploy Backend**: Deploy this API to a service like Heroku, AWS, or DigitalOcean
2. **Deploy Frontend**: Host your frontend separately on Vercel, Netlify, or similar
3. **Configure CORS**: Update allowed origins to match your frontend domain
4. **Add Authentication**: Implement JWT or OAuth for secure access
5. **Environment Config**: Set proper environment variables for production
6. **Monitoring**: Add logging, error tracking, and performance monitoring

## Troubleshooting

### CORS Issues

If you encounter CORS errors:

1. Check that `flask-cors` is installed
2. Verify the frontend origin is allowed in the CORS config
3. Ensure credentials are properly handled if using cookies

### Streaming Not Working

If responses aren't streaming:

1. Check that nginx/proxy isn't buffering responses
2. Verify the `X-Accel-Buffering: no` header is present
3. Ensure the client is reading the stream progressively

### Connection Timeout

If connections drop:

1. Increase server timeout settings
2. Implement keep-alive pings in the stream
3. Check network/proxy timeout settings
