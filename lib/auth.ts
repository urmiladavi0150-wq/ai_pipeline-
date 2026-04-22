import { supabase } from './supabase';

export async function validateApiKey(apiKey: string): Promise<{ valid: boolean; userId?: string }> {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('user_id')
      .eq('key', apiKey)
      .single();

    if (error || !data) {
      return { valid: false };
    }

    return { valid: true, userId: data.user_id };
  } catch (err) {
    console.error('API key validation error:', err);
    return { valid: false };
  }
}