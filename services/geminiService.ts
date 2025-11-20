
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { grade1Kanji } from './kanjiData';

// Initialize lazily to avoid global scope execution which can crash if process is undefined
let aiClient: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
  if (!aiClient) {
    let apiKey = '';

    // 1. Try Vite environment variable (VITE_API_KEY) via import.meta.env
    // This is required for Vercel/Vite deployments
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            apiKey = import.meta.env.VITE_API_KEY || '';
        }
    } catch (e) {
        // Ignore if import.meta is not supported
    }

    // 2. Fallback to process.env (for Node.js or AI Studio environment)
    if (!apiKey && typeof process !== 'undefined' && process.env) {
        apiKey = process.env.API_KEY || process.env.VITE_API_KEY || '';
    }

    if (!apiKey) {
        console.warn("API Key is missing. Please set VITE_API_KEY in your Vercel project settings.");
    }

    aiClient = new GoogleGenAI({ apiKey });
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

// Kept for reference, but TestMode now uses verifyKanji
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

// New strict verification function
export const verifyKanji = async (imageDataUrl: string, correctKanji: string): Promise<boolean> => {
    if (!imageDataUrl) return false;

    try {
        const imagePart = base64ToGenerativePart(imageDataUrl, "image/png");
        const ai = getAiClient();
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    imagePart,
                    {
                        text: `あなたは日本の小学校の先生です。画像の文字が、漢字「${correctKanji}」として正しく書かれているか、厳格に採点してください。
以下の基準で判断し、JSON形式で { "isCorrect": boolean } を返してください。

【不合格（false）とする基準】
1. 線のはみ出し（突き抜けてはいけない線が突き抜けている。例：「田」や「口」の角、「日」の真ん中の線など）。
2. 線の長さのバランスが間違っている（例：「土」と「士」の違い、「未」と「末」の違いなど）。
3. 必要な「はね」「とめ」「はらい」が欠けている、または不正確である。
4. 形が大きく崩れていて、バランスが悪い。
5. 別の漢字に見える。

子供が書いたものなので、線の多少の震えは許容しますが、字形の構造的な間違い（はみ出しや長さ）は厳しく判定してください。`
                    }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isCorrect: { type: Type.BOOLEAN, description: "Whether the kanji is written correctly according to strict standards." }
                    },
                    required: ["isCorrect"]
                }
            }
        });

        const result = JSON.parse(response.text.trim());
        return result.isCorrect;

    } catch (error) {
        console.error("Error verifying Kanji:", error);
        return false;
    }
};

export const getKanjiCorrectionStream = async (imageDataUrl: string, correctKanji: string): Promise<AsyncGenerator<GenerateContentResponse>> => {
  if (!imageDataUrl) {
    throw new Error("Image data is missing.");
  }

  const imagePart = base64ToGenerativePart(imageDataUrl, "image/png");
  
  const textPart = {
    text: `これは小学生向けの漢字練習アプリです。画像の手書き文字は「${correctKanji}」という漢字を書こうとしたものです。優しい先生のように、ひらがなで添削してください。
全体のバランスに加えて、以下の細かい部分を厳しくチェックして、具体的な改善点を指摘してください。
・線がはみ出していないか（突き抜けてはいけないところ）。
・線の長さ（上下の線の長さの違いなど）。
・「とめ」「はね」「はらい」。

良い点も忘れずに褒めてあげてください。フィードバックは親しみやすく、80文字程度でお願いします。例：「おしい！かたちのバランスはいいね。でも、よこぼうが つきぬけているよ。もういちど かいてみよう。」`,
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
