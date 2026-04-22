import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/jobStore';
import { JobStatusResponse, ApiError } from '@/types';

export const maxDuration = 5;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const jobId = req.nextUrl.searchParams.get('job_id');

  if (!jobId || jobId.trim() === '') {
    return NextResponse.json<ApiError>(
      { error: 'job_id query parameter is required', code: 'MISSING_JOB_ID' },
      { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }

  const trimmedJobId = jobId.trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(trimmedJobId)) {
    return NextResponse.json<ApiError>(
      { error: 'job_id must be a valid UUID', code: 'INVALID_JOB_ID' },
      { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }

  const job = await getJob(trimmedJobId);

  if (!job) {
    return NextResponse.json<ApiError>(
      { error: `No job found with id: ${jobId}`, code: 'JOB_NOT_FOUND' },
      { 
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }

  const response: JobStatusResponse = {
    id: job.id,
    status: job.status,
    result: job.result,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };

  return NextResponse.json<JobStatusResponse>(response, {
    status: 200,
    headers: { 
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
