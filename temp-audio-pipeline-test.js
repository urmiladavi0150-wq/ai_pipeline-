const base = 'http://localhost:3000';
const audioUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

(async () => {
  try {
    console.log('Creating audio job...');
    const createResp = await fetch(`${base}/api/create-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'audio', input: audioUrl }),
    });
    const createBody = await createResp.text();
    console.log('create status', createResp.status, createBody);
    if (createResp.status !== 202) {
      throw new Error(`create-job failed: ${createResp.status} ${createBody}`);
    }
    const jobId = JSON.parse(createBody).job_id;
    console.log('jobId', jobId);

    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const statusResp = await fetch(`${base}/api/job-status?job_id=${jobId}`);
      const statusBody = await statusResp.text();
      console.log('polled', statusResp.status, statusBody);
      if (statusResp.status !== 200) {
        console.log('status endpoint returned non-200');
        break;
      }
      const statusJson = JSON.parse(statusBody);
      if (statusJson.status === 'done' || statusJson.status === 'error') {
        console.log('final status', statusJson.status);
        console.log(JSON.stringify(statusJson, null, 2));
        return;
      }
    }
    console.log('timed out waiting for job completion');
  } catch (e) {
    console.error('ERROR', e);
    process.exit(1);
  }
})();
