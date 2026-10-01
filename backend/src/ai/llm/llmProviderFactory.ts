import { LLMProvider } from './llmProvider';
import { OllamaProvider } from './ollamaProvider';
import { OpenAICompatibleProvider } from './openaiCompatibleProvider';
import { env } from '../../config/env';

export type ProviderKind = 'ollama' | 'openai-compatible';

/**
 * Resolves the configured LLM provider. Selection is configuration, not code:
 * `LLM_PROVIDER`, `LLM_BASE_URL` and `LLM_MODEL` in `backend/.env`.
 *
 * No key is ever hardcoded. `LLM_API_KEY` is only read from the environment and
 * is only used by the OpenAI-compatible provider.
 */
class LLMProviderFactory {
  getProvider(): LLMProvider {
    const kind = (env.llmProvider || 'ollama') as ProviderKind;
    const model = env.llmModel || (kind === 'ollama' ? 'llama3.1' : 'local-model');
    const baseUrl = env.llmBaseUrl || (kind === 'ollama' ? 'http://127.0.0.1:11434' : '');

    if (kind === 'openai-compatible') {
      if (!baseUrl) {
        throw new Error(
          'LLM_PROVIDER is "openai-compatible" but LLM_BASE_URL is not set. Add it to backend/.env.'
        );
      }
      return new OpenAICompatibleProvider(baseUrl, model, env.llmApiKey || undefined);
    }

    return new OllamaProvider(baseUrl, model);
  }
}

export const llmProviderFactory = new LLMProviderFactory();
