import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { grade1Kanji } from './kanjiData';

// Initialize lazily to avoid global scope execution which can crash if process is undefined
let aiClient: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
  if (!aiClient) {
    // Safe access to process.env to prevent ReferenceError in browsers
    const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
    aiClient = new GoogleGenAI({ apiKey: apiKey as string });
  }
  return aiClient;
};

function base64ToGenerativePart(base64: string, mimeType: string) {
  return {
    inlineData: {
      data: base64.split(',')[1],
      mimeType
    },
  };
}

export const recognizeKanji = async (imageDataUrl: string): Promise<string> => {
  if (!imageDataUrl) {
    console.error("Image data is missing.");
    return "";
  }
  
  try {
    const imagePart = base64ToGenerativePart(imageDataUrl, "image/png");
    
    const textPart = {
      text: "Identify the single Japanese Kanji character in this image. Respond with only the character itself and no other text or explanation.",
    };

    const ai = getAiClient();
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

export const getKanjiCorrectionStream = async (imageDataUrl: string, correctKanji: string): Promise<AsyncGenerator<GenerateContentResponse>> => {
  if (!imageDataUrl) {
    throw new Error("Image data is missing.");
  }

  const imagePart = base64ToGenerativePart(imageDataUrl, "image/png");
  
  const textPart = {
    text: `これは小学生向けの漢字練習アプリです。画像の手書き文字は「${correctKanji}」という漢字を書こうとしたものです。優しい先生のように、ひらがなで添削してください。全体のバランスに加えて、「とめ」「はね」「はらい」などの細かい部分もよく見て、改善点を具体的に指摘してください。良い点も忘れずに褒めてあげてください。フィードバックは親しみやすく、80文字程度でお願いします。例：「ぜんたいのバランスはいいね！さいごのはねをしっかりかくともっとじょうずになるよ。」`,
  };

  try {
    const ai = getAiClient();
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] }
    });
    return responseStream;
  } catch (error) {
    console.error("Error getting Kanji correction stream:", error);
    // Return a stream that yields an error message
    async function* errorStream() {
      yield { text: "ごめんなさい、うまく みれませんでした。もういちど やってみてね。" } as any;
    }
    return errorStream() as unknown as AsyncGenerator<GenerateContentResponse>;
  }
};


export const getKanjiExamples = async (kanji: string): Promise<string[]> => {
    if (!kanji) {
        console.error("Kanji is missing.");
        return [];
    }

    const grade1KanjiList = grade1Kanji.map(k => k.character).join(', ');

    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `日本の小学生向けの国語の先生として振る舞ってください。与えられた漢字「${kanji}」を使った単語や短い例文を3つ生成してください。
単語と例文は、小学1年生が理解できるレベルでお願いします。
生成する文章では、以下の小学1年生で習う漢字だけを、ふりがな付きの漢字（例：山（やま））で表記してください。
【小学1年生の漢字リスト：${grade1KanjiList}】
リストにない漢字は、ひらがなで書いてください。
例えば、「一年生」という単語の場合、「一」と「年」はリストにあるので漢字で、「生」はリストにないのでひらがなで、「一ねんせい（いちねんせい）」のように表記します。`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        examples: {
                            type: Type.ARRAY,
                            description: "The list of words or short sentences.",
                            items: {
                                type: Type.STRING,
                                description: "A word or short sentence using the kanji with furigana (reading in parenthesis)."
                            }
                        }
                    },
                    required: ["examples"]
                }
            }
        });

        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        return result.examples || [];

    } catch (error) {
        console.error("Error getting Kanji examples:", error);
        return ["例文をうまく作れませんでした。"];
    }
};

export const getKanjiQuiz = async (kanji: string): Promise<{ quizSentence: string; answer: string; }> => {
    if (!kanji) {
        console.error("Kanji is missing.");
        return { quizSentence: "問題を作れませんでした。", answer: kanji };
    }

    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `日本の小学1年生向けの漢字テストの問題を1つ作ってください。
与えられた漢字「${kanji}」が答えになるような、短い単語や文を考えます。
その単語や文をすべてひらがなで表記し、答えとなる漢字の読みの部分を括弧（）で囲んだ問題文を生成してください。
例えば、「${kanji}」が「日」の場合、答えの読みが「ひ」になる「（ひ）が のぼる」や、読みが「び」になる「にちよう（び）」のような問題文を生成します。`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        quizSentence: {
                            type: Type.STRING,
                            description: "The quiz sentence in hiragana, with the part to be written in kanji enclosed in parentheses."
                        },
                        answer: {
                            type: Type.STRING,
                            description: "The correct kanji character."
                        }
                    },
                    required: ["quizSentence", "answer"]
                }
            }
        });

        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        return result;

    } catch (error) {
        console.error("Error getting Kanji quiz:", error);
        return { quizSentence: "もんだいを うまく つくれませんでした。", answer: kanji };
    }
};