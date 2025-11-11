
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

function base64ToGenerativePart(base64: string, mimeType: string) {
  return {
    inlineData: {
      data: base64.split(',')[1],
      mimeType
    },
  };
}

export const recognizeKanji = async (imageDataUrl: string): Promise<string> => {
  if (!imageDataUrl || !process.env.API_KEY) {
    console.error("Image data or API key is missing.");
    return "";
  }
  
  try {
    const imagePart = base64ToGenerativePart(imageDataUrl, "image/png");
    
    const textPart = {
      text: "Identify the single Japanese Kanji character in this image. Respond with only the character itself and no other text or explanation.",
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] }
    });

    const text = response.text.trim();
    // Return only the first character to be safe
    return text.length > 0 ? text[0] : "";
    
  } catch (error) {
    console.error("Error recognizing Kanji:", error);
    return "";
  }
};
