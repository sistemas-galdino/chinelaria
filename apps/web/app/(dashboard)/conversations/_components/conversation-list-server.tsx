import { getSupabaseServerClient } from '@/lib/supabase/server';
import ConversationList from './conversation-list';

export default async function ConversationListServer() {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from('conversations')
    .select('*, customer_profiles(display_name)')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(100);

  return (
    <ConversationList
      initial={(data ?? []) as Parameters<typeof ConversationList>[0]['initial']}
    />
  );
}
