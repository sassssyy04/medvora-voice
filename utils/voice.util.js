const axios = require("axios");
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

let openai = null;

function getOpenAIClient() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

function getElevenLabsApiKey() {
  return process.env.ELEVEN_LABS_API_KEY;
}

const ELEVENLABS_VOICES = {
  Male: "pNInz6obpgDQGcFmaJgB",
  Female: "EXAVITQu4vr4xnSDxMaL",
};

function getPatientPrompt(caseDescription) {
  return `You are a virtual patient in a clinical simulation. Use only the facts in the provided patient profile.

Start of interaction:
- Greet the doctor politely and briefly introduce yourself using the name from the profile. Example: "Hello Doctor, I'm [profile.name]." 
- Never greet the doctor with "How can I help you?" or any phrasing that sounds like the patient is offering help. The patient is here to seek help.

Behavior rules (must be strictly followed):
1. The patient is a layperson seeking care. Do NOT act like a medical professional, give medical explanations, or teach the doctor anything.
2. Only mention your main complaint if the doctor asks a direct question such as "What brings you in today?" or "Why are you here?" Otherwise wait for the doctor to ask.
3. Answer only with facts present in the patient profile. If the profile does not state something, say "I'm not sure" or "I don't know."
4. If asked to define or explain medical terms (for example "What is high cholesterol?"), respond with one of these short replies: 
   - "I'm not sure." 
   - "I don't know much about that." 
   - "I haven't been told that." 
   Do NOT explain the term or provide medical definitions.
5. Do not volunteer additional symptoms, history, or test results unless the doctor specifically asks about them.
6. Do not analyze symptoms, suggest diagnoses, recommend treatments, or offer medical advice.
7. Use plain, natural language and first-person voice ("I ..."). Keep answers brief and realistic.
8. If asked something outside the profile, reply honestly: "I'm not sure."
9. Never say or imply that you are a simulation or acting.

Here is your patient profile:
${JSON.stringify(caseDescription, null, 2)}`;
}

async function transcribeAudio(audioBuffer) {
  const supportedFormats = ['webm', 'wav', 'mp3', 'mp4', 'm4a'];
  let tempFilePath = null;
  
  for (const format of supportedFormats) {
    try {
      const audioId = uuidv4();
      tempFilePath = path.join(__dirname, `../temp_audio_${audioId}.${format}`);
      fs.writeFileSync(tempFilePath, audioBuffer);

      console.log(`📝 Attempting transcription with .${format} format...`);
      const transcription = await getOpenAIClient().audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: "whisper-1",
        language: "en",
      });

      console.log("✅ Transcription successful with format:", format);
      fs.unlinkSync(tempFilePath);
      return transcription.text;
    } catch (formatError) {
      console.log(`⚠️  Failed with .${format}:`, formatError.message);
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      if (format === supportedFormats[supportedFormats.length - 1]) {
        throw new Error("All audio formats failed. Audio data may be corrupted.");
      }
    }
  }
  
  throw new Error("Failed to transcribe audio");
}

async function getChatCompletion(messages) {
  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.8,
      max_tokens: 150,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error getting chat completion:", error);
    throw error;
  }
}

async function generateSpeech(text, gender = "Male") {
  try {
    const voiceId = ELEVENLABS_VOICES[gender] || ELEVENLABS_VOICES.Male;

    const response = await axios({
      method: "post",
      url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      headers: {
        "xi-api-key": getElevenLabsApiKey(),
        "Content-Type": "application/json",
      },
      data: {
        text: text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      responseType: "arraybuffer",
    });

    return Buffer.from(response.data);
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
}

module.exports = {
  transcribeAudio,
  getChatCompletion,
  generateSpeech,
  getPatientPrompt,
  ELEVENLABS_VOICES,
};

