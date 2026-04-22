import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  let dbStatus = {
    ok: false,
    message: 'Not checked',
  };

  try {
    const { error } = await supabase.from('jobs').select('id').limit(1);
    if (error) {
      throw error;
    }
    dbStatus = { ok: true, message: 'Supabase connection OK' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    dbStatus = { ok: false, message: `Supabase error: ${message}` };
  }

  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  const groqConfigured = Boolean(process.env.GROQ_API_KEY);
  const supabaseConfigured = Boolean(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseKeyConfigured = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  return NextResponse.json({
    ok: dbStatus.ok,
    env: {
      geminiConfigured,
      groqConfigured,
      supabaseConfigured,
      supabaseKeyConfigured,
    },
    dbStatus,
    supportedGeminiModels: [
      process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
      'gemini-2.5-flash',
      'gemini-2.0-flash-001',
    ],
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
