require('dotenv').config({ path: 'd:\\electrothon\\backend\\.env' });
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  try {
    const SYSTEM_PROMPT = "You are OptiSync AI...";
    const contents = [];
    contents.push({ role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\nPlease acknowledge you are ready.' }] });
    contents.push({ role: 'model', parts: [{ text: 'I\'m OptiSync AI, ready to help you with your eye health and digital wellness. How can I help you today? 👁️' }] });
    contents.push({ role: 'user', parts: [{ text: 'What is eye strain?' }] });

    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        temperature: 0.7,
      }
    });
    console.log(res.text);
  } catch (e) {
    console.error("FAIL:", e);
  }
}
test();
