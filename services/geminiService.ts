import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { grade1Kanji } from './kanjiData';

// ---------- APIキー管理（Vite/Node.js両対応 + 複数キー） ----------

const API_KEYS: string[] = (() => {
  const keys: string[] = [];

  // 1. GEMINI_API_KEYS: カンマ区切りで複数キーを指定
  try {
    if (typeof process !== 'undefined' && process.env) {
      const multiKeys = (process.env.GEMINI_API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean);
      keys.push(...multiKeys);
    }
  } catch { /* ignore */ }

  // 2. Vite環境変数 (VITE_API_KEY)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      const viteKey = import.meta.env.VITE_API_KEY || '';
      if (viteKey && !keys.includes(viteKey)) keys.push(viteKey);
    }
  } catch { /* ignore */ }

  // 3. process.env.API_KEY フォールバック
  try {
    if (typeof process !== 'undefined' && process.env) {
      const singleKey = process.env.API_KEY || process.env.VITE_API_KEY || '';
      if (singleKey && !keys.includes(singleKey)) keys.push(singleKey);
    }
  } catch { /* ignore */ }

  if (keys.length === 0) {
    console.warn("API Key is missing. Please set VITE_API_KEY or GEMINI_API_KEYS.");
  }

  return keys;
})();

let currentKeyIndex = 0;

const getAI = (): GoogleGenAI => {
  if (API_KEYS.length === 0) throw new Error("APIキーが設定されていません");
  return new GoogleGenAI({ apiKey: API_KEYS[currentKeyIndex] });
};

// ---------- モデル自動検出 ----------

const PREFERRED_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
const MODEL_PATTERN = /^gemini-[\d.]+-flash(?:-lite|-8b|-\d+b)?$/;
const EXCLUDE_KEYWORDS = ["tts", "image", "vision", "preview"];

function parseModelVersion(name: string): [number, string] {
  const m = name.match(/^gemini-([\d.]+)-flash(.*)$/);
  return m ? [parseFloat(m[1]), m[2]] : [0, ""];
}

let cachedModels: string[] | null = null;

async function discoverModels(): Promise<string[]> {
  if (cachedModels) return cachedModels;

  const preferred = [...PREFERRED_MODELS];
  const currentVer = Math.max(...preferred.map(m => parseModelVersion(m)[0]));

  try {
    const ai = getAI();
    const apiModels: string[] = [];
    const result = await ai.models.list();
    for (const m of (result as any).models ?? result ?? []) {
      const short = ((m as any).name || "").replace("models/", "");
      if (EXCLUDE_KEYWORDS.some(kw => short.toLowerCase().includes(kw))) continue;
      if (MODEL_PATTERN.test(short) && !preferred.includes(short)) {
        apiModels.push(short);
      }
    }

    const allVersions = [
      ...new Set([...apiModels.map(m => parseModelVersion(m)[0]), currentVer]),
    ].sort((a, b) => b - a);
    const oneBack = allVersions.find(v => v < currentVer) ?? null;

    const back: string[] = [];
    const future: string[] = [];
    for (const m of apiModels) {
      const [ver] = parseModelVersion(m);
      if (oneBack !== null && ver === oneBack) back.push(m);
      else if (ver > currentVer) future.push(m);
    }

    back.sort((a, b) => parseModelVersion(a)[1].localeCompare(parseModelVersion(b)[1]) || a.localeCompare(b));
    future.sort((a, b) => parseModelVersion(b)[0] - parseModelVersion(a)[0] || parseModelVersion(a)[1].localeCompare(parseModelVersion(b)[1]));

    cachedModels = [...preferred, ...back, ...future];
    if (back.length || future.length) {
      console.log(`モデル検出 - 1つ前: [${back}], 未来: [${future}]`);
    }
  } catch {
    cachedModels = preferred;
  }

  return cachedModels;
}

// ---------- フォールバック (キー + モデル) ----------

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return msg.includes('429') || msg.includes('quota')
    || msg.includes('RESOURCE_EXHAUSTED')
    || msg.includes('503') || msg.includes('UNAVAILABLE');
}

const withFallback = async <T>(fn: (ai: GoogleGenAI, model: string) => Promise<T>): Promise<T> => {
  const models = await discoverModels();

  for (const model of models) {
    const startKeyIndex = currentKeyIndex;
    for (let keyAttempt = 0; keyAttempt < Math.max(API_KEYS.length, 1); keyAttempt++) {
      try {
        return await fn(getAI(), model);
      } catch (error: unknown) {
        if (isRetryableError(error) && API_KEYS.length > 1) {
          currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
          console.warn(`キー ${startKeyIndex + 1} が制限超過。キー ${currentKeyIndex + 1} に切り替え`);
          if (currentKeyIndex === startKeyIndex) break;
          continue;
        }
        if (isRetryableError(error)) {
          console.warn(`${model}: レート制限、次のモデルへ`);
          break;
        }
        throw error;
      }
    }
  }
  throw new Error("全てのAPIキー・モデルが利用できません。しばらく待ってから再試行してください。");
};

// ---------- ユーティリティ ----------

function base64ToGenerativePart(base64: string, mimeType: string) {
  return {
    inlineData: {
      data: base64.split(',')[1],
      mimeType
    },
  };
}

// ---------- API関数 ----------

export const recognizeKanji = async (imageDataUrl: string): Promise<string> => {
  if (!imageDataUrl || API_KEYS.length === 0) {
    console.error("Image data or API key is missing.");
    return "";
  }

  try {
    const imagePart = base64ToGenerativePart(imageDataUrl, "image/png");
    const textPart = {
      text: "Identify the single Japanese Kanji character in this image. Respond with only the character itself and no other text or explanation.",
    };

    const response = await withFallback((ai, model) => ai.models.generateContent({
      model,
      contents: { parts: [imagePart, textPart] }
    }));

    const text = response.text.trim();
    return text.length > 0 ? text[0] : "";

  } catch (error) {
    console.error("Error recognizing Kanji:", error);
    return "";
  }
};

export const verifyKanji = async (imageDataUrl: string, correctKanji: string): Promise<boolean> => {
    if (!imageDataUrl || API_KEYS.length === 0) return false;

    try {
        const imagePart = base64ToGenerativePart(imageDataUrl, "image/png");

        const response = await withFallback((ai, model) => ai.models.generateContent({
            model,
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
        }));

        const result = JSON.parse(response.text.trim());
        return result.isCorrect;

    } catch (error) {
        console.error("Error verifying Kanji:", error);
        return false;
    }
};

export const getKanjiCorrectionStream = async (imageDataUrl: string, correctKanji: string): Promise<AsyncGenerator<GenerateContentResponse>> => {
  if (!imageDataUrl || API_KEYS.length === 0) {
    throw new Error("Image data or API key is missing.");
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
    const responseStream = await withFallback((ai, model) => ai.models.generateContentStream({
      model,
      contents: { parts: [imagePart, textPart] }
    }));
    return responseStream;
  } catch (error) {
    console.error("Error getting Kanji correction stream:", error);
    async function* errorStream() {
      yield { text: "ごめんなさい、うまく みれませんでした。もういちど やってみてね。" } as any;
    }
    return errorStream() as unknown as AsyncGenerator<GenerateContentResponse>;
  }
};


export const getKanjiExamples = async (kanji: string): Promise<string[]> => {
    if (!kanji || API_KEYS.length === 0) {
        console.error("Kanji or API key is missing.");
        return [];
    }

    const grade1KanjiList = grade1Kanji.map(k => k.character).join(', ');

    try {
        const response = await withFallback((ai, model) => ai.models.generateContent({
            model,
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
        }));

        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        return result.examples || [];

    } catch (error) {
        console.error("Error getting Kanji examples:", error);
        return ["例文をうまく作れませんでした。"];
    }
};

export const getKanjiQuiz = async (kanji: string): Promise<{ quizSentence: string; answer: string; }> => {
    if (!kanji || API_KEYS.length === 0) {
        console.error("Kanji or API key is missing.");
        return { quizSentence: "問題を作れませんでした。", answer: kanji };
    }

    try {
        const response = await withFallback((ai, model) => ai.models.generateContent({
            model,
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
        }));

        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        return result;

    } catch (error) {
        console.error("Error getting Kanji quiz:", error);
        return { quizSentence: "もんだいを うまく つくれませんでした。", answer: kanji };
    }
};
