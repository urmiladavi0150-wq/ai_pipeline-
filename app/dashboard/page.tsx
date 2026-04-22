'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

interface Job {
  id: string;
  status: JobStatus;
  result: any;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function Dashboard() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');
  const router = useRouter();

  // Job form state
  const [inputType, setInputType] = useState<'youtube' | 'video' | 'audio'>('youtube');
  const [inputUrl, setInputUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Jobs list state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      setUserEmail(user.email || 'User');

      // Check if user has an API key
      const { data, error } = await supabase
        .from('api_keys')
        .select('key')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setApiKey(data.key);
      } else {
        // Generate new key
        const response = await fetch('/api/generate-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        });
        const result = await response.json();
        if (result.api_key) {
          setApiKey(result.api_key);
        }
      }
      setLoading(false);
    };

    checkUser();
  }, [router]);

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/create-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          type: inputType,
          input: inputUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create job');
      }

      setMessage({ type: 'success', text: `Job created! ID: ${data.job_id}` });
      setInputUrl('');
      
      // Refresh jobs list
      fetchJobs();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const fetchJobs = async () => {
    if (!apiKey) return;
    setLoadingJobs(true);

    try {
      // Fetch recent jobs from the user's jobs in Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: jobsData, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('createdAt', { ascending: false })
        .limit(10);

      if (!error && jobsData) {
        setJobs(jobsData as any);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    if (apiKey && !loading) {
      fetchJobs();
    }
  }, [apiKey, loading]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleCheckJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/job-status?job_id=${jobId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...data } : j));
        setMessage({ type: 'success', text: `Job ${jobId} status: ${data.status}` });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to check job status' });
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>AI Pipeline Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: '8px 16px' }}>Logout</button>
      </div>

      <p>Welcome, {userEmail}!</p>

      {/* Job Submission Form */}
      <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
        <h2>Create New Job</h2>
        <p>Submit a URL to process (YouTube video, video file, or audio file)</p>
        
        <form onSubmit={handleSubmitJob}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Type:</label>
            <select 
              value={inputType} 
              onChange={(e) => setInputType(e.target.value as any)}
              style={{ padding: '8px', width: '200px', fontSize: '14px' }}
            >
              <option value="youtube">YouTube Video</option>
              <option value="video">Video File</option>
              <option value="audio">Audio File</option>
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>URL:</label>
            <input 
              type="url" 
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder={inputType === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://example.com/video.mp4'}
              required
              style={{ padding: '8px', width: '100%', maxWidth: '400px', fontSize: '14px' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={submitting || !apiKey}
            style={{ 
              padding: '10px 20px', 
              fontSize: '16px',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1
            }}
          >
            {submitting ? 'Processing...' : 'Submit Job'}
          </button>
        </form>

        {message && (
          <div style={{ 
            marginTop: '15px', 
            padding: '10px',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            borderRadius: '5px',
            color: message.type === 'success' ? '#155724' : '#721c24'
          }}>
            {message.text}
          </div>
        )}
      </div>

      {/* Jobs List */}
      <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
        <h2>Your Jobs</h2>
        
        {loadingJobs ? (
          <p>Loading jobs...</p>
        ) : jobs.length === 0 ? (
          <p>No jobs yet. Submit your first job above!</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <th style={{ textAlign: 'left', padding: '10px' }}>ID</th>
                <th style={{ textAlign: 'left', padding: '10px' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '10px' }}>Created</th>
                <th style={{ textAlign: 'left', padding: '10px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px', fontSize: '12px', wordBreak: 'break-all' }}>
                    {job.id.substring(0, 8)}...
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px',
                      backgroundColor: job.status === 'completed' ? '#d4edda' : 
                                    job.status === 'failed' ? '#f8d7da' : 
                                    job.status === 'processing' ? '#fff3cd' : '#e2e3e5',
                      color: job.status === 'completed' ? '#155724' : 
                             job.status === 'failed' ? '#721c24' : 
                             job.status === 'processing' ? '#856404' : '#383d41'
                    }}>
                      {job.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    {new Date(job.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <button 
                      onClick={() => handleCheckJob(job.id)}
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      Refresh
                    </button>
                    {job.result && (
                      <button 
                        onClick={() => {
                          const blob = new Blob([JSON.stringify(job.result, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `job-${job.id}.json`;
                          a.click();
                        }}
                        style={{ padding: '4px 8px', fontSize: '12px', marginLeft: '5px' }}
                      >
                        Download Result
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: '20px' }}>
        <a href="/docs">View API Docs</a>
      </div>
    </div>
  );
}