require('dotenv').config({ path: 'd:\\electrothon\\backend\\.env' });
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  try {
    const contents = [
      { role: 'user', parts: [{ text: 'Hello, testing array' }] },
      { role: 'model', parts: [{ text: 'I am here' }] },
      { role: 'user', parts: [{ text: 'Say hi back' }] }
    ];
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
