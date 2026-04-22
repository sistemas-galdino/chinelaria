import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

let cached: PostgresSaver | null = null;
let setupRan = false;

/**
 * Retorna um PostgresSaver singleton conectado a SUPABASE_DB_URL.
 * Roda `.setup()` uma vez na primeira chamada (cria tabelas LangGraph).
 */
export async function getCheckpointer(): Promise<PostgresSaver> {
  if (cached) return cached;
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) throw new Error('SUPABASE_DB_URL is required for the agent checkpointer');
  cached = PostgresSaver.fromConnString(dbUrl);
  if (!setupRan) {
    await cached.setup();
    setupRan = true;
  }
  return cached;
}
