# Quick Start Guide

Get the Voice API up and running in 5 minutes.

## Prerequisites

- Node.js (v14 or higher)
- MySQL database with Medvora schema
- OpenAI API key
- ElevenLabs API key

## Setup Steps

### 1. Navigate to voice_api folder

```bash
cd voice_api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy `env.example` to `.env` and update the values:

```bash
cp env.example .env
```

Edit `.env`:
```env
PORT=8001
OPENAI_API_KEY=sk-your-openai-key
ELEVEN_LABS_API_KEY=your-elevenlabs-key

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=medvora
```

### 4. Start the server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

You should see:

```
✅ DB connected successfully.
✅ Voice API Server is running on port 8001
📍 Endpoints:
   POST http://localhost:8001/api/voice/init
   POST http://localhost:8001/api/voice/start
   POST http://localhost:8001/api/voice/process
   POST http://localhost:8001/api/voice/stop
   POST http://localhost:8001/api/voice/history
   GET  http://localhost:8001/health
```

## Testing

### Option 1: Using the example client (easiest)

1. Open `example-client.html` in your browser
2. Enter an OSCE ID and select gender
3. Click through the buttons in order
4. Allow microphone access when prompted
5. Record and send your audio

### Option 2: Using Postman

1. Import `postman-collection.json` into Postman
2. Update the `osce_id` variable
3. Run the requests in order:
   - Initialize Session
   - Start Session
   - Process Audio (upload an audio file)
   - Stop Session

### Option 3: Using cURL

```bash
# 1. Initialize
SESSION_ID=$(curl -X POST http://localhost:8001/api/voice/init \
  -H "Content-Type: application/json" \
  -d '{"gender":"Male","osce_id":"your-osce-id"}' \
  | jq -r '.session_id')

echo "Session ID: $SESSION_ID"

# 2. Start session
curl -X POST http://localhost:8001/api/voice/start \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":\"$SESSION_ID\"}"

# 3. Process audio
curl -X POST http://localhost:8001/api/voice/process \
  -F "session_id=$SESSION_ID" \
  -F "audio=@your-audio-file.webm"

# 4. Stop session
curl -X POST http://localhost:8001/api/voice/stop \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":\"$SESSION_ID\"}"
```

## Troubleshooting

### "Missing OpenAI or ElevenLabs API credentials"
- Check your `.env` file exists and has the correct keys
- Restart the server after updating `.env`

### "Failed to connect db"
- Verify MySQL is running
- Check database credentials in `.env`
- Ensure the `medvora` database exists
- Ensure tables `osces` and `virtual_patient_simulations` exist

### "OSCE case not found"
- Verify the `osce_id` exists in database
- Check either `osces` or `virtual_patient_simulations` table

### "No audio file provided"
- Ensure you're using `multipart/form-data`
- File field must be named `audio`
- Audio must be in supported format (webm, wav, mp3, mp4, m4a)

### Port already in use
- Change `PORT` in `.env` to a different port
- Or stop the process using port 8001

### Session not found
- Sessions expire after 30 minutes of inactivity
- Initialize a new session if expired
- Server restart clears all sessions

## Next Steps

- Read `README.md` for complete API documentation
- Check `WS_VS_HTTP_COMPARISON.md` to understand differences from WebSocket version
- Review `index.js` to understand the implementation
- Integrate with your frontend application

## Integration Example

Here's a minimal integration example:

```javascript
class VoiceAPIClient {
  constructor(baseURL = 'http://localhost:8001') {
    this.baseURL = baseURL;
    this.sessionId = null;
  }

  async init(gender, osceId) {
    const response = await fetch(`${this.baseURL}/api/voice/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gender, osce_id: osceId })
    });
    const data = await response.json();
    if (data.success) {
      this.sessionId = data.session_id;
      return data;
    }
    throw new Error(data.message);
  }

  async start() {
    const response = await fetch(`${this.baseURL}/api/voice/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: this.sessionId })
    });
    return await response.json();
  }

  async processAudio(audioBlob) {
    const formData = new FormData();
    formData.append('session_id', this.sessionId);
    formData.append('audio', audioBlob, 'recording.webm');
    
    const response = await fetch(`${this.baseURL}/api/voice/process`, {
      method: 'POST',
      body: formData
    });
    return await response.json();
  }

  async stop() {
    const response = await fetch(`${this.baseURL}/api/voice/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: this.sessionId })
    });
    return await response.json();
  }
}

// Usage
const client = new VoiceAPIClient();
await client.init('Male', 'your-osce-id');
const greeting = await client.start();
// Play greeting.audio_base64
// ... record audio ...
const response = await client.processAudio(audioBlob);
// Play response.audio_base64
await client.stop();
```

## Production Considerations

Before deploying to production:

1. **Environment Variables**: Use proper secret management
2. **CORS**: Update CORS origins in `index.js`
3. **Session Storage**: Consider Redis instead of in-memory Map
4. **Rate Limiting**: Add rate limiting middleware
5. **Authentication**: Add authentication for API endpoints
6. **Logging**: Implement proper logging (Winston, Pino)
7. **Monitoring**: Add health checks and metrics
8. **HTTPS**: Enable SSL/TLS
9. **File Size Limits**: Adjust multer limits as needed
10. **Error Tracking**: Integrate Sentry or similar

## Support

For issues or questions:
- Check the `README.md` for detailed documentation
- Review the example client implementation
- Check the server logs for error messages

