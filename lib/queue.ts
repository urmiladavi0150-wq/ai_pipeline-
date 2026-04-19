import { processJob } from './processor';

const jobQueue: string[] = [];

let isProcessing = false;

async function processQueue() {
  if (isProcessing || jobQueue.length === 0) return;
  isProcessing = true;
  while (jobQueue.length > 0) {
    const jobId = jobQueue.shift()!;
    try {
      await processJob(jobId);
    } catch (err) {
      console.error(`Error processing job ${jobId}:`, err);
    }
  }
  isProcessing = false;
}

export async function addJobToQueue(jobId: string) {
  jobQueue.push(jobId);
  setTimeout(processQueue, 0); // Start processing in next tick
}