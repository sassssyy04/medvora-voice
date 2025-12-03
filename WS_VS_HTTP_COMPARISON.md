# WebSocket vs HTTP Voice API Comparison

This document compares the original WebSocket implementation with the new HTTP-based Voice API.

## Architecture Comparison

### WebSocket Implementation
- **Location**: `index.js` (integrated with main server)
- **Port**: Shares port with main Express app (8000)
- **Protocol**: WebSocket (ws://)
- **State Management**: Per-connection state in closure
- **Connection**: Persistent bidirectional connection

### HTTP Implementation
- **Location**: `voice_api/` (standalone folder)
- **Port**: Separate port (8001)
- **Protocol**: REST over HTTP
- **State Management**: Session-based using in-memory Map
- **Connection**: Stateless HTTP requests

## API Comparison

### WebSocket Events → HTTP Endpoints

| Feature | WebSocket | HTTP |
|---------|-----------|------|
| **Initialize** | `{type: "init", gender, osce_id}` | `POST /api/voice/init` |
| **Start Session** | `{type: "start"}` | `POST /api/voice/start` |
| **Send Audio** | Binary message + `{type: "audio_complete"}` | `POST /api/voice/process` (multipart/form-data) |
| **Stop Session** | `{type: "stop"}` | `POST /api/voice/stop` |
| **Get History** | N/A | `POST /api/voice/history` |

## Data Flow Comparison

### WebSocket Flow

```
1. Client opens WebSocket connection
2. Client sends: {type: "init", gender: "Male", osce_id: "..."}
3. Server fetches case from DB
4. Client sends: {type: "start"}
5. Server sends: {type: "audio_response", audio_base64: "...", text: "..."}
6. Loop:
   a. Client sends: Binary audio data
   b. Client sends: {type: "audio_complete"}
   c. Server sends: {type: "transcription", text: "..."}
   d. Server sends: {type: "audio_response", audio_base64: "...", text: "..."}
7. Client sends: {type: "stop"}
8. Connection closes
```

### HTTP Flow

```
1. Client POST /api/voice/init {gender, osce_id}
   Response: {session_id}
   
2. Client POST /api/voice/start {session_id}
   Response: {audio_base64, text}
   
3. Loop:
   a. Client POST /api/voice/process (FormData: session_id, audio file)
   b. Response: {transcription, response_text, audio_base64}
   
4. Client POST /api/voice/stop {session_id}
   Response: {success}
```

## Code Structure Comparison

### WebSocket Implementation

```
index.js (400 lines)
├── Express server setup
├── Database models
├── All routes
├── WebSocket server
│   ├── Connection handler
│   ├── Message handler (JSON + Binary)
│   ├── Session state (in closure)
│   └── Audio processing logic
└── app/utils/voice.util.js (helper functions)
```

### HTTP Implementation

```
voice_api/
├── index.js (main server, ~280 lines)
│   ├── Express server setup
│   ├── Session management (Map)
│   ├── REST endpoints
│   └── Error handling
├── utils/voice.util.js (audio/AI functions)
├── models/
│   ├── index.js
│   ├── osce_stations/
│   └── virtual_patient_simulation/
├── config/
│   └── db.config.js
├── package.json (minimal dependencies)
├── README.md
└── example-client.html
```

## Functional Differences

### Input Handling

**WebSocket:**
- Audio sent as raw binary message
- Metadata sent as separate JSON messages
- Two-step process: send audio, then signal completion

**HTTP:**
- Audio uploaded as multipart/form-data
- Metadata in form fields or request body
- Single request contains everything

### Output Format

**WebSocket:**
```javascript
// Multiple messages
{type: "transcription", text: "..."}
{type: "audio_response", audio_base64: "...", text: "..."}
```

**HTTP:**
```javascript
// Single response
{
  success: true,
  transcription: "...",
  response_text: "...",
  audio_base64: "..."
}
```

### Session Management

**WebSocket:**
- Session exists for the duration of the connection
- State stored in connection closure
- Automatic cleanup on disconnect
- One session per connection

**HTTP:**
- Session identified by UUID
- State stored in server Map
- Manual cleanup after 30 minutes of inactivity
- Multiple concurrent sessions per client possible

### Error Handling

**WebSocket:**
```javascript
clientSocket.send(JSON.stringify({
  type: "error",
  message: "Error description"
}));
```

**HTTP:**
```javascript
res.status(400).json({
  success: false,
  message: "Error description"
});
```

## Dependencies Comparison

### WebSocket Version (from main package.json)
```json
{
  "ws": "^8.18.3",
  "express": "^5.1.0",
  "openai": "^5.6.0",
  "axios": "^1.13.2",
  "sequelize": "^6.35.2",
  "mysql2": "^3.6.5",
  "multer": "^1.4.5-lts.1",
  "uuid": "^11.1.0",
  // ... plus 30+ other dependencies
}
```

### HTTP Version (voice_api/package.json)
```json
{
  "express": "^5.1.0",
  "openai": "^5.6.0",
  "axios": "^1.13.2",
  "sequelize": "^6.35.2",
  "mysql2": "^3.6.5",
  "multer": "^1.4.5-lts.1",
  "uuid": "^11.1.0",
  "cors": "^2.8.5",
  "dotenv": "^16.6.1"
}
```

## Performance Characteristics

### WebSocket
- ✅ Lower latency (persistent connection)
- ✅ Real-time bidirectional communication
- ✅ Less overhead for multiple messages
- ❌ More complex to scale horizontally
- ❌ Requires sticky sessions with load balancers
- ❌ Connection limits per server

### HTTP
- ✅ Easier to scale horizontally
- ✅ Standard load balancing works out-of-box
- ✅ Better caching opportunities
- ✅ Easier to debug (standard HTTP tools)
- ❌ Higher latency per interaction
- ❌ More overhead per request

## Use Cases

### When to Use WebSocket Version
- Real-time streaming applications
- Low-latency requirements
- Continuous audio streaming
- Client supports WebSocket well
- Single server deployment

### When to Use HTTP Version
- RESTful architecture preferred
- Multi-server deployment
- Standard load balancing needed
- Integration with API gateways
- Mobile apps with unreliable connections
- Easier testing and debugging needed

## Testing Comparison

### WebSocket Testing
```javascript
const ws = new WebSocket('ws://localhost:8000');
ws.onopen = () => {
  ws.send(JSON.stringify({type: 'init', gender: 'Male', osce_id: '...'}));
};
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle response
};
```

### HTTP Testing
```bash
# Using cURL
curl -X POST http://localhost:8001/api/voice/init \
  -H "Content-Type: application/json" \
  -d '{"gender":"Male","osce_id":"..."}'

# Using Postman - import postman-collection.json
# Using example-client.html - open in browser
```

## Migration Path

### Frontend Changes Required

**From WebSocket:**
```javascript
const ws = new WebSocket(`ws://localhost:8000?gender=Male&osce_id=${osceId}`);
ws.send(JSON.stringify({type: 'init', ...}));
ws.send(audioBlob);
ws.send(JSON.stringify({type: 'audio_complete'}));
```

**To HTTP:**
```javascript
const {session_id} = await fetch('/api/voice/init', {
  method: 'POST',
  body: JSON.stringify({gender: 'Male', osce_id: osceId})
}).then(r => r.json());

const formData = new FormData();
formData.append('session_id', session_id);
formData.append('audio', audioBlob);
await fetch('/api/voice/process', {method: 'POST', body: formData});
```

## Deployment Differences

### WebSocket
- Single server deployment
- Requires WebSocket-aware reverse proxy (nginx, Apache)
- Load balancing needs sticky sessions
- Port forwarding for ws:// protocol

### HTTP
- Can run on separate server/port
- Standard HTTP reverse proxy
- No sticky session requirements
- Standard HTTPS/SSL termination
- Can be behind API Gateway

## Summary

| Aspect | WebSocket | HTTP |
|--------|-----------|------|
| **Complexity** | Medium | Low |
| **Scalability** | Harder | Easier |
| **Latency** | Lower | Higher |
| **Integration** | Custom client | Standard REST |
| **Debugging** | Harder | Easier |
| **Dependencies** | Shared with main app | Standalone |
| **Best For** | Real-time streaming | Standard API architecture |

Both implementations provide the same functionality with identical input/output. Choose based on your architecture and requirements.

