import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import ThreadView from './_components/thread-view';

export const dynamic = 'force-dynamic';

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const [{ data: conversation }, { data: messages }] = await Promise.all([
    supabase
      .from('conversations')
      .select('*, customer_profiles(*)')
      .eq('id', id)
      .single(),
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(500),
  ]);

  if (!conversation) notFound();

  // marca como lida
  if (conversation.unread_count > 0) {
    await supabase.from('conversations').update({ unread_count: 0 }).eq('id', id);
  }

  return <ThreadView conversation={conversation} initialMessages={messages ?? []} />;
}
