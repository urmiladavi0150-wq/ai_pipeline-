import { GeneratedContent, GeneratedContentResult } from "@/types";

const DEFAULT_GEMINI_MODELS = [
  process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash-001",
];
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 90_000;

const SYSTEM_PROMPT = `You are a professional social media content strategist. Given a transcript,
you generate high-engagement content for LinkedIn and Twitter/X.
You MUST respond with ONLY a valid JSON object — no explanation, no markdown,
no code fences. The JSON must conform exactly to this schema:
{
"linkedInPosts": [string, string, string],
"twitterThread": string[],
"summary": string
}
Rules:
- linkedInPosts: array of EXACTLY 3 strings. Each post 150-300 words.
Each post must have a hook (first line), insight body, and a CTA.
- twitterThread: array of 5-8 tweets. First tweet is the hook (< 240 chars).
Last tweet is a clear call-to-action. Each tweet < 280 chars.
- summary: single string, 100-150 words, plain prose, no bullet points.`;

export async function generateContent(transcript: string): Promise<GeneratedContentResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return generateFallbackContent(transcript, 'GEMINI_API_KEY is not configured');
  }

  const models = DEFAULT_GEMINI_MODELS.filter(Boolean);
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const content = await generateContentWithModel(transcript, apiKey, model);
      return { content };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const message = lastError.message.toLowerCase();
      if (
        message.includes("quota") ||
        message.includes("resource_exhausted") ||
        message.includes("rate limit") ||
        message.includes("not supported") ||
        message.includes("not found") ||
        message.includes("invalid argument") ||
        message.includes("chat is not enabled") ||
        message.includes("not valid json") ||
        message.includes("unexpected structure") ||
        message.includes("returned an empty response")
      ) {
        continue;
      }
      break;
    }
  }

  if (lastError && /quota|resource_exhausted|rate limit|not valid json|unexpected structure|returned an empty response|invalid argument|chat is not enabled/i.test(lastError.message)) {
    return generateFallbackContent(transcript, lastError.message);
  }

  throw lastError ?? new Error("Gemini generation failed for all configured models");
}

function generateFallbackContent(transcript: string, reason: string): GeneratedContentResult {
  const excerpt = transcript.trim().replace(/\s+/g, " ").slice(0, 400);
  const summary = `This transcript covers the following points: ${excerpt}. The content emphasizes key ideas and creates a concise recap for professional social media audiences.`;
  const linkedInPosts = [
    `Post 1: ${summary} This highlights the main insight and ends with a clear call to action to engage with the ideas presented.`,
    `Post 2: ${summary} The post frames the transcript as a source of valuable lessons and invites discussion from the audience.`,
    `Post 3: ${summary} It encourages readers to reflect on the core message and apply it to their own work.`,
  ];
  const twitterThread = [
    `Hook: Key insights from the transcript are worth sharing with your network.`,
    `Tweet 2: The transcript offers a fresh perspective on modern professional communication.`,
    `Tweet 3: It emphasizes practical takeaways and how to use them in daily work.`,
    `Tweet 4: This thread is designed to spark curiosity and prompt engagement.`,
    `Tweet 5: The summary ties the ideas together with a strong final call to action.`,
  ];

  return {
    content: {
      linkedInPosts,
      twitterThread,
      summary,
    },
    fallback: true,
    fallbackReason: reason,
  };
}

async function generateContentWithModel(
  transcript: string,
  apiKey: string,
  geminiModel: string
): Promise<GeneratedContent> {
  const url = `${GEMINI_BASE_URL}/${geminiModel}:generateContent?key=${apiKey}`;
  const requestBody = {
    contents: [
      { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
      { role: "model", parts: [{ text: "Understood. I will respond only with valid JSON." }] },
      { role: "user", parts: [{ text: `Transcript:\n${transcript}` }] },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status} on ${geminiModel}: ${errText}`);
  }

  const data = await response.json();
  const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("Gemini returned an empty response or unexpected structure");
  }

  const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = tryParseJsonFromText(cleaned);
  }

  return validateGeneratedContent(parsed);
}

function tryParseJsonFromText(text: string): unknown {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Gemini response was not valid JSON: ${text.substring(0, 400)}`);
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`Gemini response was not valid JSON: ${text.substring(0, 400)}`);
  }
}

function validateGeneratedContent(raw: unknown): GeneratedContent {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Generated content is not an object");
  }
  const obj = raw as Record<string, unknown>;

  if (!Array.isArray(obj.linkedInPosts) || obj.linkedInPosts.length !== 3 || obj.linkedInPosts.some(p => typeof p !== "string")) {
    throw new Error("linkedInPosts must be an array of exactly 3 strings");
  }
  if (!Array.isArray(obj.twitterThread) || obj.twitterThread.length < 3 || obj.twitterThread.some(t => typeof t !== "string")) {
    throw new Error("twitterThread must be an array of at least 3 strings");
  }
  if (typeof obj.summary !== "string" || obj.summary.trim() === "") {
    throw new Error("summary must be a non-empty string");
  }

  return {
    linkedInPosts: obj.linkedInPosts as string[],
    twitterThread: obj.twitterThread as string[],
    summary: obj.summary as string,
  };
}
