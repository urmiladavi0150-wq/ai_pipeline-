import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Check if user already has a key
  const { data: existingKey } = await supabase
    .from('api_keys')
    .select('key')
    .eq('user_id', user.id)
    .single();

  if (existingKey) {
    return NextResponse.json({ api_key: existingKey.key });
  }

  // Generate new key
  const key = uuidv4();
  const { error: insertError } = await supabase
    .from('api_keys')
    .insert({ user_id: user.id, key });

  if (insertError) {
    return NextResponse.json({ error: 'Failed to generate key' }, { status: 500 });
  }

  return NextResponse.json({ api_key: key });
}