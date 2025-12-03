# Frontend Integration Guide

This guide provides complete input/output specifications for frontend developers integrating with the Voice API.

## Base URL

```
http://localhost:8001
```

For production, replace with your deployed API URL.

---

## API Endpoints

### 1. Initialize Session

**Endpoint:** `POST /api/voice/init`

**Purpose:** Create a new voice session before starting conversation

#### Input

```typescript
{
  gender: "Male" | "Female",     // Required: Voice gender for TTS
  osce_id: string                // Required: UUID of OSCE case
}
```

**Content-Type:** `application/json`

**Example Request:**
```javascript
const response = await fetch('http://localhost:8001/api/voice/init', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    gender: 'Male',
    osce_id: '123e4567-e89b-12d3-a456-426614174000'
  })
});
```

#### Output

**Success Response (200):**
```typescript
{
  success: true,                 // Boolean: Always true on success
  session_id: string,            // UUID: Use in all subsequent requests
  message: string                // Human-readable success message
}
```

**Example Success Response:**
```json
{
  "success": true,
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "message": "Session initialized successfully"
}
```

**Error Response (400/404/500):**
```typescript
{
  success: false,                // Boolean: Always false on error
  message: string                // Error description
}
```

**Example Error Responses:**
```json
{
  "success": false,
  "message": "Missing required parameters: gender and osce_id"
}

{
  "success": false,
  "message": "OSCE case not found"
}
```

**What to do with output:**
- Store `session_id` for use in all subsequent API calls
- Display error message to user if `success` is false
- Enable the "Start Session" button if successful

---

### 2. Start Session

**Endpoint:** `POST /api/voice/start`

**Purpose:** Begin the conversation and receive initial greeting

#### Input

```typescript
{
  session_id: string             // Required: Session ID from init
}
```

**Content-Type:** `application/json`

**Example Request:**
```javascript
const response = await fetch('http://localhost:8001/api/voice/start', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    session_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
});
```

#### Output

**Success Response (200):**
```typescript
{
  success: true,                 // Boolean: Always true on success
  audio_base64: string,          // Base64-encoded MP3 audio
  text: string,                  // Text of the greeting
  message: string                // Success message
}
```

**Example Success Response:**
```json
{
  "success": true,
  "audio_base64": "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAA...",
  "text": "Hello Doctor, I'm here for my appointment.",
  "message": "Session started successfully"
}
```

**Error Response (400/404/500):**
```typescript
{
  success: false,
  message: string
}
```

**What to do with output:**
- Decode and play `audio_base64` as audio
- Display `text` in the chat UI
- Enable recording controls
- Store this as the first message in conversation history

**Playing the audio:**
```javascript
const data = await response.json();
if (data.success) {
  const audio = new Audio(`data:audio/mp3;base64,${data.audio_base64}`);
  await audio.play();
  
  // Add to chat UI
  addMessageToChat('assistant', data.text);
}
```

---

### 3. Process Audio

**Endpoint:** `POST /api/voice/process`

**Purpose:** Send user's audio, receive transcription and AI response

#### Input

**Content-Type:** `multipart/form-data`

```typescript
{
  session_id: string,            // Required: Session ID
  audio: File                    // Required: Audio file
}
```

**Supported Audio Formats:**
- WebM (recommended for web)
- WAV
- MP3
- MP4
- M4A

**Maximum File Size:** 50MB

**Example Request:**
```javascript
// Assuming you have a Blob from MediaRecorder
const formData = new FormData();
formData.append('session_id', sessionId);
formData.append('audio', audioBlob, 'recording.webm');

const response = await fetch('http://localhost:8001/api/voice/process', {
  method: 'POST',
  body: formData  // No Content-Type header needed, browser sets it automatically
});
```

#### Output

**Success Response (200):**
```typescript
{
  success: true,                 // Boolean: Always true on success
  transcription: string,         // What the user said (from Whisper)
  response_text: string,         // AI patient's response (from GPT-4)
  audio_base64: string          // Base64-encoded MP3 of response
}
```

**Example Success Response:**
```json
{
  "success": true,
  "transcription": "What brings you in today?",
  "response_text": "I've been having chest pain for the past two days.",
  "audio_base64": "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAA..."
}
```

**Error Response (400/404/500):**
```typescript
{
  success: false,
  message: string
}
```

**Example Error Responses:**
```json
{
  "success": false,
  "message": "No audio file provided"
}

{
  "success": false,
  "message": "Session not found or expired"
}

{
  "success": false,
  "message": "Session not active. Call /start first."
}
```

**What to do with output:**
- Display `transcription` as user's message in chat
- Display `response_text` as assistant's message in chat
- Decode and play `audio_base64`
- Store both in conversation history
- Enable recording for next turn

**Complete Example:**
```javascript
const data = await response.json();
if (data.success) {
  // Show what user said
  addMessageToChat('user', data.transcription);
  
  // Show AI response
  addMessageToChat('assistant', data.response_text);
  
  // Play AI audio response
  const audio = new Audio(`data:audio/mp3;base64,${data.audio_base64}`);
  await audio.play();
  
  // Ready for next recording
  enableRecordingButton();
}
```

---

### 4. Get Conversation History (Optional)

**Endpoint:** `POST /api/voice/history`

**Purpose:** Retrieve full conversation history for the session

#### Input

```typescript
{
  session_id: string             // Required: Session ID
}
```

**Content-Type:** `application/json`

**Example Request:**
```javascript
const response = await fetch('http://localhost:8001/api/voice/history', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    session_id: sessionId
  })
});
```

#### Output

**Success Response (200):**
```typescript
{
  success: true,
  history: Array<{
    role: "user" | "assistant",  // Who said this
    content: string              // What was said
  }>
}
```

**Example Success Response:**
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
      "content": "I've been having chest pain for the past two days."
    },
    {
      "role": "user",
      "content": "When did the pain start?"
    },
    {
      "role": "assistant",
      "content": "It started two days ago in the morning."
    }
  ]
}
```

**What to do with output:**
- Use to reconstruct conversation if needed
- Display in a conversation log
- Export for review or grading

---

### 5. Stop Session

**Endpoint:** `POST /api/voice/stop`

**Purpose:** End the conversation and clean up the session

#### Input

```typescript
{
  session_id: string             // Required: Session ID
}
```

**Content-Type:** `application/json`

**Example Request:**
```javascript
const response = await fetch('http://localhost:8001/api/voice/stop', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    session_id: sessionId
  })
});
```

#### Output

**Success Response (200):**
```typescript
{
  success: true,
  message: string
}
```

**Example Success Response:**
```json
{
  "success": true,
  "message": "Session stopped successfully"
}
```

**What to do with output:**
- Clear session ID from state
- Disable all controls
- Show completion message
- Optionally save conversation history before stopping

---

## Complete Frontend Implementation

### React/TypeScript Example

```typescript
import { useState, useRef } from 'react';

interface VoiceSession {
  sessionId: string | null;
  isActive: boolean;
  isRecording: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function VoiceChat() {
  const [session, setSession] = useState<VoiceSession>({
    sessionId: null,
    isActive: false,
    isRecording: false
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const API_BASE = 'http://localhost:8001';

  // 1. Initialize Session
  const initSession = async (gender: 'Male' | 'Female', osceId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/voice/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender, osce_id: osceId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSession(prev => ({ ...prev, sessionId: data.session_id }));
        setError(null);
        return data.session_id;
      } else {
        setError(data.message);
        return null;
      }
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  // 2. Start Session
  const startSession = async () => {
    if (!session.sessionId) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/voice/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.sessionId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSession(prev => ({ ...prev, isActive: true }));
        setMessages([{ role: 'assistant', content: data.text }]);
        playAudio(data.audio_base64);
        setError(null);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // 3. Start Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setSession(prev => ({ ...prev, isRecording: true }));
    } catch (err) {
      setError(`Microphone error: ${err.message}`);
    }
  };

  // 4. Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setSession(prev => ({ ...prev, isRecording: false }));
    }
  };

  // 5. Process Audio
  const processAudio = async (audioBlob: Blob) => {
    if (!session.sessionId) return;
    
    const formData = new FormData();
    formData.append('session_id', session.sessionId);
    formData.append('audio', audioBlob, 'recording.webm');
    
    try {
      const response = await fetch(`${API_BASE}/api/voice/process`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Add user message
        setMessages(prev => [...prev, {
          role: 'user',
          content: data.transcription
        }]);
        
        // Add assistant message
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response_text
        }]);
        
        // Play audio response
        playAudio(data.audio_base64);
        setError(null);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // 6. Stop Session
  const stopSession = async () => {
    if (!session.sessionId) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/voice/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.sessionId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSession({ sessionId: null, isActive: false, isRecording: false });
        setError(null);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Helper: Play audio
  const playAudio = (base64Audio: string) => {
    const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
    audio.play().catch(err => {
      console.error('Error playing audio:', err);
    });
  };

  return (
    <div>
      {/* Your UI components here */}
      {error && <div className="error">{error}</div>}
      
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <strong>{msg.role === 'user' ? 'Doctor' : 'Patient'}:</strong>
            {msg.content}
          </div>
        ))}
      </div>
      
      <div className="controls">
        <button onClick={() => initSession('Male', 'your-osce-id')}>
          Initialize
        </button>
        <button onClick={startSession} disabled={!session.sessionId}>
          Start
        </button>
        <button onClick={startRecording} disabled={!session.isActive || session.isRecording}>
          🎤 Record
        </button>
        <button onClick={stopRecording} disabled={!session.isRecording}>
          ⏹ Stop
        </button>
        <button onClick={stopSession} disabled={!session.sessionId}>
          End Session
        </button>
      </div>
    </div>
  );
}
```

### Vanilla JavaScript Example

See `example-client.html` for a complete working example without frameworks.

---

## Audio Recording Best Practices

### Recording Audio from Browser

```javascript
// Request microphone permission
const stream = await navigator.mediaDevices.getUserMedia({ 
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 44100
  } 
});

// Create MediaRecorder (WebM is best supported)
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm'
});

let audioChunks = [];

mediaRecorder.ondataavailable = (event) => {
  audioChunks.push(event.data);
};

mediaRecorder.onstop = () => {
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  // Send audioBlob to API
};

mediaRecorder.start();
// ... later ...
mediaRecorder.stop();
```

### Handling Audio Playback

```javascript
function playAudio(base64Audio) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
    
    audio.onended = resolve;
    audio.onerror = reject;
    
    audio.play().catch(reject);
  });
}

// Wait for audio to finish before enabling recording
await playAudio(responseAudio);
enableRecordButton();
```

---

## Error Handling

### Expected Errors

| HTTP Status | Error | Cause | Solution |
|-------------|-------|-------|----------|
| 400 | Missing parameters | Required field not provided | Check request body |
| 400 | No audio file | Audio not included in form | Add audio to FormData |
| 400 | Session not active | /start not called | Call /start before /process |
| 404 | Session not found | Invalid/expired session | Initialize new session |
| 404 | OSCE case not found | Invalid osce_id | Check OSCE ID exists |
| 500 | Internal server error | Server/API issue | Check server logs |

### Frontend Error Handling Pattern

```javascript
async function apiCall(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (data.success) {
      return { success: true, data };
    } else {
      // API returned error
      return { 
        success: false, 
        error: data.message,
        userMessage: getUserFriendlyMessage(data.message)
      };
    }
  } catch (error) {
    // Network or parsing error
    return { 
      success: false, 
      error: error.message,
      userMessage: 'Network error. Please check your connection.'
    };
  }
}

function getUserFriendlyMessage(apiError) {
  const errorMap = {
    'Session not found': 'Your session expired. Please start a new conversation.',
    'OSCE case not found': 'The selected case is not available.',
    'No audio file provided': 'Please record audio before sending.',
    'Session not active': 'Please start the session first.'
  };
  
  return errorMap[apiError] || 'An error occurred. Please try again.';
}
```

---

## Data Flow Summary

```
Frontend State to Track:
├── sessionId: string | null
├── isSessionActive: boolean
├── isRecording: boolean
├── messages: Array<{role, content}>
├── currentAudio: HTMLAudioElement | null
└── error: string | null

Typical Flow:
1. User selects OSCE case and gender
   → POST /init {gender, osce_id}
   → Store session_id

2. User clicks "Start"
   → POST /start {session_id}
   → Play audio_base64
   → Add text to messages

3. User records and sends audio (repeat N times)
   → Start MediaRecorder
   → Stop MediaRecorder → get Blob
   → POST /process {session_id, audio}
   → Add transcription to messages (user)
   → Add response_text to messages (assistant)
   → Play audio_base64

4. User ends session
   → POST /stop {session_id}
   → Clear session_id
   → Reset state
```

---

## TypeScript Types

```typescript
// Request Types
interface InitRequest {
  gender: 'Male' | 'Female';
  osce_id: string;
}

interface SessionRequest {
  session_id: string;
}

// Response Types
interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  [key: string]: any;
}

interface InitResponse extends ApiResponse {
  session_id: string;
}

interface StartResponse extends ApiResponse {
  audio_base64: string;
  text: string;
}

interface ProcessResponse extends ApiResponse {
  transcription: string;
  response_text: string;
  audio_base64: string;
}

interface HistoryResponse extends ApiResponse {
  history: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

// Message Type
interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}
```

---

## Testing Checklist

- [ ] Initialize with valid OSCE ID → Success
- [ ] Initialize with invalid OSCE ID → Error message
- [ ] Start without initializing → Error handled
- [ ] Record and send audio → Transcription appears
- [ ] AI response appears and plays
- [ ] Multiple turn conversation works
- [ ] Stop session cleans up state
- [ ] Session timeout (30 min) handled
- [ ] Microphone permission denied handled
- [ ] Network error handled gracefully
- [ ] Audio playback error handled

---

## Performance Tips

1. **Preload Audio Context**: Initialize audio context on user interaction to avoid autoplay restrictions
2. **Show Loading States**: Display spinners during API calls
3. **Disable Controls**: Prevent double-clicks during processing
4. **Cache Session ID**: Store in sessionStorage to survive page refresh
5. **Cleanup**: Always call /stop when unmounting component

---

## Security Considerations

1. **HTTPS in Production**: Always use HTTPS for API calls
2. **Validate OSCE ID**: Ensure user has access to the OSCE case
3. **Session Timeout**: Sessions expire after 30 minutes
4. **File Size**: Maximum 50MB audio file
5. **CORS**: Update API CORS settings for your domain

---

For more examples, see:
- `example-client.html` - Complete working example
- `postman-collection.json` - API testing collection
- `README.md` - Full API documentation

