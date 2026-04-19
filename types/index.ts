export type InputType = 'youtube' | 'video' | 'audio';
export type JobStatus = 'queued' | 'processing' | 'done' | 'error';

export interface JobInput {
  type: InputType;
  input: string; // URL string (YouTube URL, video URL, or audio URL)
}

export interface GeneratedContent {
  linkedInPosts: string[]; // array of exactly 3 posts
  twitterThread: string[]; // array of tweets (first is hook, last is CTA)
  summary: string; // 100–150 word executive summary
}

export interface GeneratedContentResult {
  content: GeneratedContent;
  fallback?: boolean;
  fallbackReason?: string;
}

export interface JobResult {
  transcript: string;
  content: GeneratedContent;
  fallback?: boolean;
  fallbackReason?: string;
}

export interface Job {
  id: string;
  status: JobStatus;
  input: JobInput;
  result: JobResult | null;
  error: string | null;
  createdAt: number; // Unix timestamp ms
  updatedAt: number;
}

export type MediaType = 'audio' | 'video';

export interface NormaliseResult {
  downloadUrl: string; // Direct binary-downloadable URL
  mediaType: MediaType; // Determines ffmpeg extraction strategy
}

// API response shapes
export interface CreateJobResponse {
  job_id: string;
  status: 'queued';
}

export interface JobStatusResponse {
  id: string;
  status: JobStatus;
  result: JobResult | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ApiError {
  error: string;
  code: string;
}
