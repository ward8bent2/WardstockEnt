
import { GoogleGenAI, Type } from "@google/genai";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const summarizeUsage = async (usageData: string) => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `สรุปการเบิกใช้ยาหรืออุปกรณ์เหล่านี้ให้สั้นๆ สำหรับรายงานจบเวร: ${usageData}`,
      config: {
        systemInstruction: "You are a professional medical ward assistant. Provide concise summaries in Thai."
      }
    });
    return response.text;
  } catch (error) {
    console.error("AI summarization failed", error);
    return usageData;
  }
};
