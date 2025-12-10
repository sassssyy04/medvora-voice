# Medvora Voice API - HTTP Version

A standalone HTTP-based voice API for virtual patient simulations. This is a REST API alternative to the WebSocket implementation.

## Features

- 🎤 Audio transcription using OpenAI Whisper
- 🤖 AI-powered patient responses using GPT-4
- 🔊 Text-to-speech using ElevenLabs
- 🔄 Session-based conversation management
- 📦 Completely self-contained with no external dependencies

## Setup

### 1. Install Dependencies

```bash
cd voice_api
npm install
```

### 2. Configure Environment

Create a `.env` file in the `voice_api` directory:

```env
PORT=8001
OPENAI_API_KEY=your_openai_api_key
ELEVEN_LABS_API_KEY=your_elevenlabs_api_key

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=medvora
```

### 3. Start the Server

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## API Endpoints

### Health Check
```
GET /health
```

Response:
```json
{
  "status": "ok",
  "activeSessions": 0,
  "timestamp": "2025-12-03T10:00:00.000Z"
}
```

### 1. Initialize Session
```
POST /api/voice/init
Content-Type: application/json

{
  "gender": "Male" | "Female",
  "osce_id": "uuid-of-osce-case"
}
```

Response:
```json
{
  "success": true,
  "session_id": "unique-session-id",
  "message": "Session initialized successfully"
}
```

### 2. Start Session
```
POST /api/voice/start
Content-Type: application/json

{
  "session_id": "session-id-from-init"
}
```

Response:
```json
{
  "success": true,
  "audio_base64": "base64-encoded-audio",
  "text": "Hello Doctor, I'm here for my appointment.",
  "message": "Session started successfully"
}
```

### 3. Process Audio
```
POST /api/voice/process
Content-Type: multipart/form-data

session_id: session-id-from-init
audio: (audio file - webm, wav, mp3, mp4, or m4a)
```

Response:
```json
{
  "success": true,
  "transcription": "What brings you in today?",
  "response_text": "I've been having chest pain for the past two days.",
  "audio_base64": "base64-encoded-audio-response"
}
```

### 4. Get Conversation History
```
POST /api/voice/history
Content-Type: application/json

{
  "session_id": "session-id-from-init"
}
```

Response:
```json
{
  "success": true,
  "history": [
    {
      "role": "assistant",
      "content": "Hello Doctor, I'm here for my appointment."
    },
    {
      "role": "user",
      "content": "What brings you in today?"
    },
    {
      "role": "assistant",
      "content": "I've been having chest pain."
    }
  ]
}
```

### 5. Stop Session
```
POST /api/voice/stop
Content-Type: application/json

{
  "session_id": "session-id-from-init"
}
```

Response:
```json
{
  "success": true,
  "message": "Session stopped successfully"
}
```

## Usage Flow

### Complete Conversation Flow

```javascript
// 1. Initialize session
const initResponse = await fetch('http://localhost:8001/api/voice/init', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    gender: 'Male',
    osce_id: 'your-osce-id'
  })
});
const { session_id } = await initResponse.json();

// 2. Start session and get initial greeting
const startResponse = await fetch('http://localhost:8001/api/voice/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ session_id })
});
const { audio_base64, text } = await startResponse.json();
// Play audio_base64 to user

// 3. Record user audio and send for processing
const formData = new FormData();
formData.append('session_id', session_id);
formData.append('audio', audioBlob, 'recording.webm');

const processResponse = await fetch('http://localhost:8001/api/voice/process', {
  method: 'POST',
  body: formData
});
const { transcription, response_text, audio_base64: responseAudio } = await processResponse.json();
// Display transcription and play responseAudio

// 4. Repeat step 3 for each turn in conversation

// 5. Stop session when done
await fetch('http://localhost:8001/api/voice/stop', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ session_id })
});
```

## Input/Output Mapping (WebSocket vs HTTP)

### WebSocket → HTTP Mapping

| WebSocket Event | HTTP Endpoint | Input | Output |
|----------------|---------------|-------|--------|
| `type: "init"` | `POST /api/voice/init` | `{gender, osce_id}` | `{session_id}` |
| `type: "start"` | `POST /api/voice/start` | `{session_id}` | `{audio_base64, text}` |
| Binary + `type: "audio_complete"` | `POST /api/voice/process` | `FormData(session_id, audio)` | `{transcription, response_text, audio_base64}` |
| `type: "stop"` | `POST /api/voice/stop` | `{session_id}` | `{success}` |

### Audio Format Support

The API supports multiple audio formats:
- WebM (recommended for web browsers)
- WAV
- MP3
- MP4
- M4A

## Session Management

- Sessions are stored in memory with automatic cleanup
- Inactive sessions (no activity for 30 minutes) are automatically cleaned up every 5 minutes
- Each session maintains its own conversation history
- Sessions are isolated and thread-safe

## Error Handling

All endpoints return a consistent error format:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad request (missing parameters, invalid input)
- `404` - Session or resource not found
- `500` - Internal server error

## Performance Considerations

- Audio files are processed in memory (no disk writes except for temporary transcription files)
- Sessions are stored in memory (consider Redis for production with multiple instances)
- Automatic cleanup prevents memory leaks from abandoned sessions
- File size limit: 50MB per audio upload

## Database

The API requires access to the Medvora database to fetch OSCE case descriptions. Make sure:
1. Database is running and accessible
2. Database credentials in `.env` are correct
3. Tables `osces` and `virtual_patient_simulations` exist

## Comparison with WebSocket Version

### Advantages of HTTP API:
- ✅ Simpler client implementation
- ✅ Better for RESTful architectures
- ✅ Easier debugging and testing
- ✅ Works with standard HTTP tools (Postman, curl)
- ✅ Better load balancer compatibility

### Advantages of WebSocket:
- ✅ Lower latency for real-time streaming
- ✅ Persistent connection reduces overhead
- ✅ Better for continuous audio streaming

## Testing with cURL

```bash
# 1. Initialize
curl -X POST http://localhost:8001/api/voice/init \
  -H "Content-Type: application/json" \
  -d '{"gender":"Male","osce_id":"your-osce-id"}'

# 2. Start session
curl -X POST http://localhost:8001/api/voice/start \
  -H "Content-Type: application/json" \
  -d '{"session_id":"your-session-id"}'

# 3. Process audio
curl -X POST http://localhost:8001/api/voice/process \
  -F "session_id=your-session-id" \
  -F "audio=@recording.webm"

# 4. Stop session
curl -X POST http://localhost:8001/api/voice/stop \
  -H "Content-Type: application/json" \
  -d '{"session_id":"your-session-id"}'
```

## License

ISC


