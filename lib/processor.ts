import { getJob, updateJob } from './jobStore';
import { normalizeInput } from './normalize';
import { downloadMedia } from './download';
import { extractAudio } from './extractAudio';
import { transcribeAudio } from './transcribe';
import { generateContent } from './generate';
import { unlink } from 'fs/promises';

export async function processJob(jobId: string): Promise<void> {
  console.log(`Starting processing for job ${jobId}`);
  // Mark as actively processing (distinguishes from queued)
  await updateJob(jobId, { status: 'processing' });
  let tempFilePath: string | null = null;
  let audioFilePath: string | null = null;

  try {
    const job = (await getJob(jobId))!;

    // ─── STEP 1: Normalise input ─────────────────────────────────
    console.log(`Normalizing input for job ${jobId}`);
    const { downloadUrl, mediaType } = await normalizeInput(job.input);

    // ─── STEP 2: Download media to /tmp ──────────────────────────
    console.log(`Downloading media for job ${jobId}`);
    tempFilePath = await downloadMedia(downloadUrl, mediaType);

    // ─── STEP 3: Extract / convert audio ─────────────────────────
    console.log(`Extracting audio for job ${jobId}`);
    audioFilePath = await extractAudio(tempFilePath, mediaType);

    // ─── STEP 4: Transcribe via Groq Whisper ─────────────────────
    console.log(`Transcribing audio for job ${jobId}`);
    const transcript = await transcribeAudio(audioFilePath);

    // ─── STEP 5: Generate content via Gemini ─────────────────────
    console.log(`Generating content for job ${jobId}`);
    const generationResult = await generateContent(transcript);

    // ─── Persist result ───────────────────────────────────────────
    console.log(`Persisting result for job ${jobId}`);
    await updateJob(jobId, {
      status: 'done',
      result: {
        transcript,
        content: generationResult.content,
        fallback: generationResult.fallback,
        fallbackReason: generationResult.fallbackReason,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown processing error';
    console.error(`Error processing job ${jobId}:`, message);
    await updateJob(jobId, { status: 'error', error: message });
  } finally {
    // ─── Cleanup temp files ───────────────────────────────────────
    await cleanupFiles([tempFilePath, audioFilePath]);
  }
}

async function cleanupFiles(paths: (string | null)[]): Promise<void> {
  await Promise.allSettled(
    paths.filter(Boolean).map(p => unlink(p!))
  );
}
