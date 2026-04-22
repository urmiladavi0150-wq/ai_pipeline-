import { NextRequest, NextResponse } from 'next/server';
import { createJob, pruneJobs } from '@/lib/jobStore';
import { addJobToQueue } from '@/lib/queue';
import { InputType, CreateJobResponse, ApiError } from '@/types';

export const maxDuration = 10; // Seconds — this route returns immediately

const VALID_TYPES: InputType[] = ['youtube', 'video', 'audio'];

export async function POST(req: NextRequest): Promise<NextResponse> {
  void pruneJobs();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ApiError>(
      { error: 'Request body must be valid JSON', code: 'INVALID_JSON' },
      { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return error400('Body must be a JSON object', 'INVALID_BODY');
  }

const { type, input } = body as Record<string, unknown>;

if (!type || !VALID_TYPES.includes(type as InputType)) {
  return error400(`type must be one of: ${VALID_TYPES.join(', ')}`, 'INVALID_TYPE');
}

if (!input || typeof input !== 'string' || input.trim() === '') {
  return error400('input must be a non-empty string URL', 'MISSING_INPUT');
}

try {
  new URL(input);
} catch {
  return NextResponse.json<ApiError>(
    { error: 'input is not a valid URL', code: 'INVALID_URL' },
    { 
      status: 422,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    }
  );
}

if (type === 'youtube') {
  const host = new URL(input).hostname.replace('www.', '');
  if (!['youtube.com', 'youtu.be'].includes(host)) {
    return NextResponse.json<ApiError>(
      { error: 'For type youtube, input must be a youtube.com or youtu.be URL', code: 'INVALID_YOUTUBE_URL' },
      { 
        status: 422,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}

const jobId = await createJob({ type: type as InputType, input: input.trim() });

// Add to queue for background processing
addJobToQueue(jobId);

return NextResponse.json<CreateJobResponse>(
  { job_id: jobId, status: 'queued' },
  { 
    status: 202,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  }
);
}

function error400(message: string, code: string): NextResponse {
  return NextResponse.json<ApiError>({ error: message, code }, { 
    status: 400,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
