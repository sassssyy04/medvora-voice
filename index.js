const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const {
  transcribeAudio,
  getChatCompletion,
  generateSpeech,
  getPatientPrompt,
} = require("./utils/voice.util");

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://40.81.242.167",
    "https://40.81.242.167",
    "http://app.medvora.ai",
    "https://app.medvora.ai"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
}));

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

const db = require("./models");

db.sequelize
  .sync()
  .then(() => {
    console.log("✅ DB connected successfully.");
  })
  .catch((err) => {
    console.log("❌ Failed to connect db: " + err.message);
  });

const PORT = process.env.PORT || 8001;

if (!process.env.OPENAI_API_KEY || !process.env.ELEVEN_LABS_API_KEY) {
  throw new Error("Missing OpenAI or ElevenLabs API credentials in .env");
}

const sessions = new Map();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

function cleanupOldSessions() {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000;
  
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastActivity > maxAge) {
      sessions.delete(sessionId);
      console.log(`🧹 Cleaned up inactive session: ${sessionId}`);
    }
  }
}

setInterval(cleanupOldSessions, 5 * 60 * 1000);

app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    activeSessions: sessions.size,
    timestamp: new Date().toISOString()
  });
});

app.post("/api/voice/init", async (req, res) => {
  try {
    const { gender, osce_id } = req.body;

    if (!gender || !osce_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: gender and osce_id",
      });
    }

    console.log(`🔌 Initializing session for osce_id: ${osce_id}, gender: ${gender}`);

    let osceExists = await db.osces.findOne({
      where: { osce_id: osce_id },
      attributes: ["case_description"],
    });
    
    if (!osceExists) {
      osceExists = await db.virtual_patient_simulations.findOne({
        where: { id: osce_id },
        attributes: ["case_description"],
      });
    }

    if (!osceExists) {
      return res.status(404).json({
        success: false,
        message: "OSCE case not found",
      });
    }

    const sessionId = uuidv4();
    const conversationHistory = [
      {
        role: "system",
        content: getPatientPrompt(osceExists.case_description),
      },
    ];

    sessions.set(sessionId, {
      gender,
      osce_id,
      conversationHistory,
      active: false,
      lastActivity: Date.now(),
    });

    console.log(`✅ Session initialized: ${sessionId}`);

    res.json({
      success: true,
      session_id: sessionId,
      message: "Session initialized successfully",
    });
  } catch (error) {
    console.error("❌ Init error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

app.post("/api/voice/start", async (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameter: session_id",
      });
    }

    const session = sessions.get(session_id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found or expired",
      });
    }

    console.log(`🎤 Starting voice session: ${session_id}`);

    session.active = true;
    session.lastActivity = Date.now();

    const initialGreeting = "Hello Doctor, I'm here for my appointment.";
    session.conversationHistory.push({
      role: "assistant",
      content: initialGreeting,
    });

    const audioBuffer = await generateSpeech(initialGreeting, session.gender);
    const audioBase64 = audioBuffer.toString("base64");

    console.log(`✅ Initial greeting generated for session: ${session_id}`);

    res.json({
      success: true,
      audio_base64: audioBase64,
      text: initialGreeting,
      message: "Session started successfully",
    });
  } catch (error) {
    console.error("❌ Start error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

app.post("/api/voice/process", upload.single("audio"), async (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameter: session_id",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No audio file provided",
      });
    }

    const session = sessions.get(session_id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found or expired",
      });
    }

    if (!session.active) {
      return res.status(400).json({
        success: false,
        message: "Session not active. Call /start first.",
      });
    }

    console.log(`🎤 Processing audio for session: ${session_id}, size: ${req.file.buffer.length} bytes`);

    session.lastActivity = Date.now();

    const transcription = await transcribeAudio(req.file.buffer);
    console.log(`✅ Transcription: ${transcription}`);

    session.conversationHistory.push({
      role: "user",
      content: transcription,
    });

    const aiResponse = await getChatCompletion(session.conversationHistory);
    console.log(`✅ AI Response: ${aiResponse}`);

    session.conversationHistory.push({
      role: "assistant",
      content: aiResponse,
    });

    const audioBuffer = await generateSpeech(aiResponse, session.gender);
    const audioBase64 = audioBuffer.toString("base64");

    console.log(`✅ Audio response generated for session: ${session_id}`);

    res.json({
      success: true,
      transcription: transcription,
      response_text: aiResponse,
      audio_base64: audioBase64,
    });
  } catch (error) {
    console.error("❌ Process error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

app.post("/api/voice/stop", (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameter: session_id",
      });
    }

    const session = sessions.get(session_id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    console.log(`🛑 Stopping voice session: ${session_id}`);

    sessions.delete(session_id);

    res.json({
      success: true,
      message: "Session stopped successfully",
    });
  } catch (error) {
    console.error("❌ Stop error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

app.post("/api/voice/history", (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameter: session_id",
      });
    }

    const session = sessions.get(session_id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    const history = session.conversationHistory
      .filter(msg => msg.role !== "system")
      .map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

    res.json({
      success: true,
      history: history,
    });
  } catch (error) {
    console.error("❌ History error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`✅ Voice API Server is running on port ${PORT}`);
  console.log(`📍 Endpoints:`);
  console.log(`   POST http://localhost:${PORT}/api/voice/init`);
  console.log(`   POST http://localhost:${PORT}/api/voice/start`);
  console.log(`   POST http://localhost:${PORT}/api/voice/process`);
  console.log(`   POST http://localhost:${PORT}/api/voice/stop`);
  console.log(`   POST http://localhost:${PORT}/api/voice/history`);
  console.log(`   GET  http://localhost:${PORT}/health`);
});


