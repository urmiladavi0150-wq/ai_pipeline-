export default function Docs() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Async AI Pipeline API Documentation</h1>
      <p>This API processes YouTube videos, audio files, and video files to generate transcriptions and summaries.</p>

      <h2>Endpoints</h2>

      <h3>1. Create Job</h3>
      <p><strong>POST</strong> /api/create-job</p>
      <p>Creates a new processing job.</p>
      <h4>Request Body:</h4>
      <pre>{`{
  "type": "youtube" | "video" | "audio",
  "input": "URL to the media"
}`}</pre>
      <h4>Response:</h4>
      <pre>{`{
  "job_id": "uuid",
  "status": "queued"
}`}</pre>

      <h3>2. Get Job Status</h3>
      <p><strong>GET</strong> /api/job-status?job_id=uuid</p>
      <p>Retrieves the status of a job.</p>
      <h4>Response:</h4>
      <pre>{`{
  "id": "uuid",
  "status": "queued" | "processing" | "completed" | "failed",
  "result": { ... },
  "error": "error message",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}`}</pre>

      <h3>3. Health Check</h3>
      <p><strong>GET</strong> /api/health</p>
      <p>Checks the API health and configuration.</p>

      <h2>Usage Example</h2>
      <pre>{`// Create a job
fetch('/api/create-job', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'youtube',
    input: 'https://www.youtube.com/watch?v=example'
  })
}).then(res => res.json()).then(data => {
  const jobId = data.job_id;
  // Poll for status
  setInterval(() => {
    fetch(\`/api/job-status?job_id=\${jobId}\`)
      .then(res => res.json())
      .then(status => console.log(status));
  }, 5000);
});`}</pre>

      <p>For more details, contact the developer.</p>
    </div>
  );
}