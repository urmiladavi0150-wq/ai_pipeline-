export default function Home() {
  return (
    <main>
      <h1>Async AI Pipeline Backend</h1>
      <p>API endpoints are available at:</p>
      <ul>
        <li><code>POST /api/create-job</code> - Create a new job</li>
        <li><code>GET /api/job-status?job_id=&lt;id&gt;</code> - Get job status</li>
      </ul>
    </main>
  );
}
