'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <h1>Dashboard</h1>
      <p>Welcome! Your API Key:</p>
      {apiKey ? (
        <div>
          <code style={{ background: '#f4f4f4', padding: '10px', display: 'block' }}>
            {apiKey}
          </code>
          <p>Use this key in API requests: <code>Authorization: Bearer {apiKey}</code></p>
        </div>
      ) : (
        <p>Failed to generate API key. Try refreshing.</p>
      )}
      <button onClick={handleLogout} style={{ marginTop: '20px' }}>Logout</button>
      <br />
      <a href="/docs">View API Docs</a>
    </div>
  );
}