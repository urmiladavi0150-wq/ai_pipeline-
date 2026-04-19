# Async AI Pipeline Backend - Setup Guide

## Overview

This is a production-ready backend for the Async AI Content Pipeline. It accepts audio or video source material (YouTube URL, direct video file URL, or raw audio file URL), extracts and transcribes the audio via the Groq Whisper API, then generates structured social-media content via the Google Gemini API.

The pipeline is non-blocking: the client receives a `job_id` immediately upon request submission, then polls a status endpoint until processing completes.

## Prerequisites

- Node.js 20 LTS or higher
- npm or yarn
- A Supabase account and project
- Groq API key (from console.groq.com)
- Google Gemini API key (from aistudio.google.com)

## Installation

### 1. Clone or extract the project

```bash
cd async-ai-pipeline-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

#### Create the `jobs` table

Log in to your Supabase project and execute the following SQL in the SQL editor:

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL,
  input JSONB NOT NULL,
  result JSONB,
  error TEXT,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON jobs FOR SELECT USING (TRUE);
CREATE POLICY "Allow public insert access" ON jobs FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Allow public update access" ON jobs FOR UPDATE USING (TRUE);
```

#### Get your Supabase credentials

1. Navigate to your Supabase project settings
2. Go to **API** section
3. Copy your **Project URL** and **Anon Key**

### 4. Configure environment variables

Create a `.env.local` file in the project root and add the following:

```env
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For production deployment, prefer using server-side environment variables:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

If you use a service role key for Supabase, set:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Important:** Never commit `.env.local` to version control. It's already in `.gitignore`.

## Development

### Start the development server

```bash
npm run dev
```

The server will start at `http://localhost:3000`.

### Build for production

```bash
npm run build
npm start
```

## API Endpoints

### POST /api/create-job

Creates a new job to process media content.

**Request:**
```json
{
  "type": "youtube" | "video" | "audio",
  "input": "https://example.com/video.mp4"
}
```

**Response (202 Accepted):**
```json
{
  "job_id": "a3f7bc12",
  "status": "queued"
}
```

**Error Response (400/422):**
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

### GET /api/job-status

Retrieves the status of a job.

**Query Parameters:**
- `job_id` (required): The job ID returned from `/api/create-job`

**Response (200 OK) - Processing:**
```json
{
  "id": "a3f7bc12",
  "status": "processing",
  "result": null,
  "error": null,
  "createdAt": 1714000000000,
  "updatedAt": 1714000012000
}
```

**Response (200 OK) - Done:**
```json
{
  "id": "a3f7bc12",
  "status": "done",
  "result": {
    "transcript": "Full plain-text transcript...",
    "content": {
      "linkedInPosts": ["Post 1...", "Post 2...", "Post 3..."],
      "twitterThread": ["Tweet 1 (hook)", "Tweet 2", "... CTA"],
      "summary": "100-150 word executive summary..."
    }
  },
  "error": null,
  "createdAt": 1714000000000,
  "updatedAt": 1714000085000
}
```

**Error Response (404):**
```json
{
  "error": "No job found with id: a3f7bc12",
  "code": "JOB_NOT_FOUND"
}
```

## Project Structure

```
/
├── app/
│   ├── api/
│   │   ├── create-job/
│   │   │   └── route.ts          ← POST handler
│   │   └── job-status/
│   │       └── route.ts          ← GET handler
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── supabase.ts               ← Supabase client initialization
│   ├── jobStore.ts               ← Supabase job management
│   ├── processor.ts              ← Orchestrator (steps 1–5)
│   ├── normalize.ts              ← Input type detection & URL resolution
│   ├── download.ts               ← Binary download + temp file management
│   ├── extractAudio.ts           ← ffmpeg wrapper
│   ├── transcribe.ts             ← Groq Whisper client
│   └── generate.ts               ← Gemini content client
├── types/
│   └── index.ts                  ← All shared TypeScript interfaces
├── .env.local                    ← Environment variables (not committed)
├── next.config.js
├── tsconfig.json
├── vercel.json
└── package.json
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 LTS (ESM modules) |
| Framework | Next.js 14 — App Router |
| Language | TypeScript 5.4 (strict mode) |
| Database | Supabase (PostgreSQL) |
| Transcription | Groq API — whisper-large-v3 |
| Content Generation | Google Gemini API — gemini-1.5-flash |
| Media Processing | ffmpeg-static (bundled binary) |
| HTTP Client | Native fetch() (Node.js 20 built-in) |

## Deployment to Vercel

### 1. Connect your repository

Push your code to GitHub and connect it to Vercel.

### 2. Set environment variables

In your Vercel project settings, add the following environment variables:

- `GROQ_API_KEY`: Your Groq API key
- `GEMINI_API_KEY`: Your Google Gemini API key
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key

### 3. Deploy

```bash
npx vercel --prod
```

Or push to your connected GitHub repository to trigger automatic deployment.

**Note:** Vercel Pro plan is required for jobs longer than 60 seconds. The Pro plan allows up to 300 seconds of background execution.

## Error Codes

| Code | Cause | Resolution |
|------|-------|-----------|
| `INVALID_JSON` | Request body cannot be parsed as JSON | Send Content-Type: application/json and valid JSON |
| `INVALID_BODY` | Body is not a JSON object | Send a plain object, not array or primitive |
| `INVALID_TYPE` | type field is not youtube/video/audio | Check spelling; use one of the three exact values |
| `MISSING_INPUT` | input field is missing or empty | Include a non-empty URL string |
| `INVALID_URL` | input cannot be parsed as a URL | Include the full URL schema (https://) |
| `INVALID_YOUTUBE_URL` | YouTube type but URL is not youtube.com/youtu.be | Use a proper YouTube video URL |
| `MISSING_JOB_ID` | GET /job-status called without job_id param | Append ?job_id=your-id to the URL |
| `JOB_NOT_FOUND` | job_id does not exist in the store | Check ID; job may have expired (>1hr) or server restarted |
| `YOUTUBE_UNAVAILABLE` | yt-dlp could not resolve the video URL | Check if video is region-locked or age-gated |
| `DOWNLOAD_TIMEOUT` | Binary download exceeded 2-minute timeout | Try a shorter video or direct CDN URL |
| `FILE_TOO_LARGE` | Downloaded file exceeds 500 MB | Use a shorter clip |
| `FFMPEG_ERROR` | ffmpeg exited non-zero | Check input file is valid audio/video format |
| `FFMPEG_TIMEOUT` | ffmpeg processing exceeded 3 minutes | File may be corrupt or extremely long |
| `GROQ_API_ERROR` | Groq API returned non-200 status | Check GROQ_API_KEY; verify Groq service status |
| `EMPTY_TRANSCRIPT` | Groq returned empty text | Audio may be silent, too short, or corrupted |
| `GEMINI_API_ERROR` | Gemini API returned non-200 status | Check GEMINI_API_KEY; verify Gemini service status |
| `CONTENT_INVALID` | Gemini JSON did not match expected schema | Prompt engineering failure — report as bug |

## Testing

### Test 1: Valid YouTube job creation

```bash
curl -X POST http://localhost:3000/api/create-job \
  -H "Content-Type: application/json" \
  -d '{"type":"youtube","input":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

Expected response: HTTP 202 with `{ job_id: string, status: 'queued' }`

### Test 2: Invalid type

```bash
curl -X POST http://localhost:3000/api/create-job \
  -H "Content-Type: application/json" \
  -d '{"type":"podcast","input":"https://example.com/a.mp3"}'
```

Expected response: HTTP 400 with `{ error: '...', code: 'INVALID_TYPE' }`

### Test 3: Poll status — immediate poll

```bash
curl 'http://localhost:3000/api/job-status?job_id=REPLACE_WITH_REAL_ID'
```

Expected response: HTTP 200 with `{ status: 'queued'|'processing', result: null }`

### Test 4: Non-existent job

```bash
curl 'http://localhost:3000/api/job-status?job_id=doesnotexist'
```

Expected response: HTTP 404 with `{ code: 'JOB_NOT_FOUND' }`

### Test 5: Full pipeline — valid audio URL

```bash
curl -X POST http://localhost:3000/api/create-job \
  -H "Content-Type: application/json" \
  -d '{"type":"audio","input":"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"}'
```

Then poll until `status === 'done'`. Result must have transcript and content.

## Frontend Polling Algorithm

The frontend should implement the following polling algorithm:

```javascript
async function submitAndPoll(type, inputUrl) {
  // 1. Submit job
  const { job_id } = await POST('/api/create-job', { type, input: inputUrl });

  // 2. Poll with exponential backoff
  const MAX_POLLS = 60;
  const INITIAL_INTERVAL_MS = 2000;
  const MAX_INTERVAL_MS = 5000;
  let interval = INITIAL_INTERVAL_MS;
  let polls = 0;

  while (polls < MAX_POLLS) {
    await sleep(interval);
    const job = await GET(`/api/job-status?job_id=${job_id}`);
    if (job.status === 'done') return job.result;
    if (job.status === 'error') throw new Error(job.error);
    
    interval = Math.min(interval * 1.2, MAX_INTERVAL_MS);
    polls++;
  }

  throw new Error('Job timed out — exceeded maximum polling duration');
}
```

## Post-MVP Upgrade Path

The MVP architecture has known limitations that are acceptable for idea validation:

| Limitation | Problem | Upgrade Strategy |
|-----------|---------|------------------|
| Supabase | Data persists but no queue | Add BullMQ with Redis as queue backend |
| No auth | Any user can create jobs | Add NextAuth.js with userId attachment |
| /tmp filesystem | Lost on function cold start | Use AWS S3 / Cloudflare R2 for storage |
| Single Gemini call | May hit token limits | Chunk transcript into segments |
| No file upload | Users must provide public URLs | Add presigned S3 upload endpoint |
| No rate limiting | Single user can flood API | Add Upstash Ratelimit middleware |

## Troubleshooting

### "GROQ_API_KEY environment variable is not set"

Ensure `GROQ_API_KEY` is set in your `.env.local` file and the development server has been restarted.

### "GEMINI_API_KEY environment variable is not set"

Ensure `GEMINI_API_KEY` is set in your `.env.local` file and the development server has been restarted.

### "Missing Supabase URL or Anon Key"

Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in your `.env.local` file.

### "ffmpeg-static binary not found"

Ensure `ffmpeg-static` is installed: `npm install ffmpeg-static`

### "YouTube audio extraction failed"

Ensure `youtube-dl-exec` is installed: `npm install youtube-dl-exec`

## Support

For issues or questions, please refer to the PRD documentation or contact the development team.

---

**Version:** 1.0.0  
**Last Updated:** 2026-04-17
