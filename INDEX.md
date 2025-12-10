# Voice API Documentation Index

## 👋 Start Here

Welcome to the Medvora Voice API - a standalone HTTP-based API for virtual patient simulations.

## 📖 Documentation Guide

### 🚀 **I want to get it running** → [QUICK_START.md](QUICK_START.md)
5-minute setup guide to get the server running.

### 💻 **I'm building the frontend** → [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md) ⭐
Complete input/output specifications with TypeScript types and React examples.

### 📚 **I need API reference** → [README.md](README.md)
Complete API documentation with all endpoints and examples.

### 🔄 **I'm coming from WebSocket** → [WS_VS_HTTP_COMPARISON.md](WS_VS_HTTP_COMPARISON.md)
Understand the differences and migration path.

### 📋 **I want the overview** → [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
High-level project summary and structure.

## 🎯 Quick Links by Role

### Frontend Developer
1. [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md) - **Read this first!**
2. [example-client.html](example-client.html) - Working example
3. [postman-collection.json](postman-collection.json) - API testing

### Backend Developer
1. [QUICK_START.md](QUICK_START.md) - Setup
2. [README.md](README.md) - API docs
3. [index.js](index.js) - Implementation

### Project Manager
1. [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Overview
2. [WS_VS_HTTP_COMPARISON.md](WS_VS_HTTP_COMPARISON.md) - Architecture comparison

### QA / Tester
1. [postman-collection.json](postman-collection.json) - Import into Postman
2. [example-client.html](example-client.html) - Manual testing
3. [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md) - Expected behaviors

## 📁 File Structure

```
voice_api/
│
├── 📘 INDEX.md (this file)           ← You are here
├── 📗 QUICK_START.md                 ← Setup in 5 minutes
├── 📕 README.md                      ← Complete API docs
├── 📙 FRONTEND_INTEGRATION.md        ← Frontend specs ⭐
├── 📓 PROJECT_SUMMARY.md             ← Overview
├── 📔 WS_VS_HTTP_COMPARISON.md       ← WebSocket vs HTTP
│
├── 🚀 index.js                       ← Main server
├── 📦 package.json                   ← Dependencies
├── 🔒 .env                           ← Environment variables
├── 🚫 .gitignore                     ← Git ignore
│
├── 🌐 example-client.html            ← Working example
├── 📮 postman-collection.json        ← API testing
│
├── config/
│   └── db.config.js                  ← Database config
│
├── models/
│   ├── index.js                      ← Sequelize setup
│   ├── osce_stations/
│   │   └── osce_stations.model.js
│   └── virtual_patient_simulation/
│       └── virtual_patient_simulation.model.js
│
└── utils/
    └── voice.util.js                 ← Audio/AI utilities
```

## 🎬 Quick Start Command

```bash
cd voice_api
npm install
# Edit .env with your credentials
npm start
```

## 🔌 API Endpoints

```
GET  /health                    - Health check
POST /api/voice/init            - Initialize session
POST /api/voice/start           - Start conversation
POST /api/voice/process         - Process audio
POST /api/voice/history         - Get history
POST /api/voice/stop            - Stop session
```

## 📊 Input/Output Summary

### Initialize Session
**Input:** `{gender: "Male"|"Female", osce_id: string}`
**Output:** `{session_id: string}`

### Start Session
**Input:** `{session_id: string}`
**Output:** `{audio_base64: string, text: string}`

### Process Audio
**Input:** `FormData(session_id, audio_file)`
**Output:** `{transcription: string, response_text: string, audio_base64: string}`

### Stop Session
**Input:** `{session_id: string}`
**Output:** `{success: true}`

**For complete details, see [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md)**

## ✅ Features

- ✅ Standalone - No external dependencies
- ✅ Same I/O as WebSocket implementation
- ✅ OpenAI Whisper transcription
- ✅ GPT-4 powered responses
- ✅ ElevenLabs text-to-speech
- ✅ Session management
- ✅ Complete documentation
- ✅ Working examples
- ✅ TypeScript types

## 🔧 Requirements

- Node.js v14+
- MySQL database
- OpenAI API key
- ElevenLabs API key

## 🎯 Common Tasks

| I want to... | Go to... |
|--------------|----------|
| Set up the server | [QUICK_START.md](QUICK_START.md) |
| Integrate with frontend | [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md) |
| Test the API | Open [example-client.html](example-client.html) or import [postman-collection.json](postman-collection.json) |
| Understand the code | Read [index.js](index.js) and [utils/voice.util.js](utils/voice.util.js) |
| Compare with WebSocket | [WS_VS_HTTP_COMPARISON.md](WS_VS_HTTP_COMPARISON.md) |
| See what's included | [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) |

## 🆘 Help

**Issue:** Server won't start
→ Check [QUICK_START.md](QUICK_START.md) Troubleshooting section

**Issue:** API returns errors
→ Check [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md) Error Handling section

**Issue:** Don't understand the flow
→ Read [README.md](README.md) Usage Flow section

**Issue:** Coming from WebSocket version
→ Read [WS_VS_HTTP_COMPARISON.md](WS_VS_HTTP_COMPARISON.md)

## 📞 Quick Reference

**Server:** `http://localhost:8001`
**Health Check:** `GET http://localhost:8001/health`
**Max Audio Size:** 50MB
**Session Timeout:** 30 minutes
**Supported Audio:** WebM, WAV, MP3, MP4, M4A

---

**For frontend developers:** Start with [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md) ⭐

**For backend developers:** Start with [QUICK_START.md](QUICK_START.md) 🚀

**For overview:** Start with [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) 📋


