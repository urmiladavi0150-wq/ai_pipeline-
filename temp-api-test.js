const base = 'http://localhost:3000';

(async () => {
  try {
    const root = await fetch(base);
    console.log('root', root.status);

    const bad = await fetch(`${base}/api/create-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'podcast', input: 'https://example.com/audio.mp3' }),
    });
    console.log('bad type', bad.status, await bad.text());

    const create = await fetch(`${base}/api/create-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'youtube', input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
    });
    const createText = await create.text();
    console.log('create', create.status, createText);
    const jobId = JSON.parse(createText).job_id;

    const status = await fetch(`${base}/api/job-status?job_id=${jobId}`);
    console.log('status', status.status, await status.text());

    const missing = await fetch(`${base}/api/job-status?job_id=nonexistent`);
    console.log('missing', missing.status, await missing.text());
  } catch (e) {
    console.error('ERROR', e);
    process.exit(1);
  }
})();
