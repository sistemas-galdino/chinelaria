import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { getCheckpointer } from './checkpointer.ts';
import { buildMagazordTools } from './tools.ts';

export interface AgentRuntime {
  /** Modelo (default: gpt-5). */
  model?: string;
  /** Temperature (default: 0.7). */
  temperature?: number;
  /** Max tokens (default: 2000). */
  maxTokens?: number;
}

/**
 * Constrói o agente reativo (LLM + tools + checkpointer).
 * Sem prompt fixo — o prompt é passado em runtime para cada invocação
 * via `messages: [SystemMessage, HumanMessage, ...]`.
 */
export async function buildAgent(runtime: AgentRuntime = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is required');

  const llm = new ChatOpenAI({
    apiKey,
    model: runtime.model ?? process.env.OPENAI_MODEL ?? 'gpt-5',
    temperature: runtime.temperature ?? 0.7,
    maxTokens: runtime.maxTokens ?? 2000,
  });

  const tools = buildMagazordTools();
  const checkpointer = await getCheckpointer();

  return createReactAgent({
    llm,
    tools,
    checkpointSaver: checkpointer,
  });
}
