import { readFile } from 'fs/promises';
import { basename } from 'path';

const GROQ_TRANSCRIPTION_URL =
  'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_MODEL = 'whisper-large-v3';
const TIMEOUT_MS = 60_000;

export async function transcribeAudio(audioFilePath: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY environment variable is not set');

  const fileBuffer = await readFile(audioFilePath);
  const filename = basename(audioFilePath);

  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer], { type: 'audio/mpeg' }), filename);
  formData.append('model', GROQ_MODEL);
  formData.append('response_format', 'json');
  formData.append('language', 'en'); // Remove for auto-detection (slower)

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(GROQ_TRANSCRIPTION_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error ${response.status}: ${errText}`);
  }

  const data = await response.json() as { text: string };
  if (!data.text || data.text.trim() === '') {
    throw new Error('Groq returned an empty transcript — audio may be silent or corrupted');
  }

  return data.text.trim();
}
