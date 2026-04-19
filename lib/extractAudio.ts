import { spawn } from 'child_process';
import { join } from 'path';
import ffmpegStatic from 'ffmpeg-static';
import { MediaType } from '@/types';

const FFMPEG_TIMEOUT_MS = 180_000; // 3 minutes

export async function extractAudio(
  inputPath: string,
  mediaType: MediaType
): Promise<string> {
  const outputPath = inputPath.replace(/\.[^.]+$/, '_audio.mp3');

  const args = [
    '-i', inputPath,
    '-vn',
    '-ar', '16000',
    '-ac', '1',
    '-codec:a', 'libmp3lame',
    '-q:a', '2',
    '-y',
    outputPath,
  ];

  await runFfmpeg(args);
  return outputPath;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegStatic) {
      return reject(new Error('ffmpeg-static binary not found'));
    }

    const proc = spawn(ffmpegStatic, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const stderr: string[] = [];
    proc.stderr.on('data', (data: Buffer) => stderr.push(data.toString()));

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('ffmpeg timed out after 3 minutes'));
    }, FFMPEG_TIMEOUT_MS);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}. Stderr: ${stderr.slice(-5).join('')}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`ffmpeg spawn error: ${err.message}`));
    });
  });
}
