'use server';

import { generateAIContent, AIContentRequest } from '@/lib/n8n/client';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createAIContentAct(data: AIContentRequest) {
  // 1. Authenticate user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized. Please check your Supabase instance authentication setup.' };
  }

  // 2. Trigger N8N Workflow (which calls Claude API)
  const result = await generateAIContent(data);

  if (!result.success) {
    return { error: result.error || 'Failed to generate content' };
  }

  // 3. Save to Supabase (Optional: N8N could also save directly to DB)
  const { error: dbError } = await supabase
    .from('content')
    .insert({
      user_id: user.id,
      topic: data.topic,
      generated_text: result.data?.text,
      created_at: new Date().toISOString(),
    });

  if (dbError) {
    console.error('Database error:', dbError);
    return { error: 'Failed to save content in DB' };
  }

  revalidatePath('/');
  return { success: true, data: result.data };
}
