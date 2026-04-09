require('dotenv').config({ path: 'd:\\electrothon\\backend\\.env' });
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  try {
    const SYSTEM_PROMPT = `You are OptiSync AI — an expert AI health assistant embedded inside OptiSync OS... Keep answers short (2-4 sentences) unless the user asks for details.`;
    const systemMessage = SYSTEM_PROMPT + `\n\nTask: The user wants an analysis of their daily eye strain today and specific recommendations for therapy to prevent strain. Respond clearly and format it beautifully with Markdown. Keep it brief but professional.\n\nToday's Metrics:
- Average Strain: 60%
- Max Strain reached: 85%
- Average Blink Rate: 10 BPM
- Number of data points: 150`;

    const contents = [];
    contents.push({ role: 'user', parts: [{ text: systemMessage + '\n\nPlease provide your analysis and best therapy module suggestions.' }] });

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
