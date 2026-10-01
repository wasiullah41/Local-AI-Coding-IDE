import axios, { AxiosError } from 'axios';
import { LLMProvider, ChatMessage, ChatResponse } from './llmProvider';

/**
 * Works with any OpenAI-compatible `/v1/chat/completions` endpoint, which
 * covers Ollama, LM Studio, llama.cpp server, vLLM and the like.
 *
 * The API key is read from the environment only. It is never persisted by this
 * project and never sent anywhere except the configured base URL.
 */
export class OpenAICompatibleProvider implements LLMProvider {
  readonly name = 'openai-compatible';

  constructor(
    private baseUrl: string,
    private model: string,
    private apiKey?: string
  ) {}

  async chat(messages: ChatMessage[], options?: { signal?: AbortSignal }): Promise<ChatResponse> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

      const response = await axios.post(
        `${this.baseUrl.replace(/\/$/, '')}/v1/chat/completions`,
        {
          model: this.model,
          messages,
          stream: false,
          temperature: 0.1,
        },
        { headers, signal: options?.signal, timeout: 180_000 }
      );

      const message = response.data?.choices?.[0]?.message;
      const content = message?.content;
      if (typeof content !== 'string') {
        // Anthropic-style backends can answer with a refusal, a tool block, or
        // a truncated body instead of OpenAI text content. Say which, rather
        // than failing later with a confusing parse error.
        const refusal =
          (message as { refusal?: unknown } | undefined)?.refusal ??
          (response.data?.choices?.[0] as { finish_reason?: string } | undefined)?.finish_reason;
        throw new Error(
          `The model returned an unexpected response shape${
            refusal ? ` (${String(refusal)})` : ''
          }. Check that "${this.model}" supports chat completions through ${this.baseUrl}.`
        );
      }
      if (content.trim() === '') {
        throw new Error(
          `The model "${this.model}" returned an empty response. The prompt may have been refused or filtered.`
        );
      }
      return {
        content,
        usage: {
          promptTokens: response.data?.usage?.prompt_tokens,
          completionTokens: response.data?.usage?.completion_tokens,
        },
      };
    } catch (error) {
      throw this.toFriendlyError(error);
    }
  }

  getModelInfo() {
    return { model: this.model, provider: this.name };
  }

  async isAvailable(): Promise<boolean> {
    return (await this.describeFailure()) === undefined;
  }

  async describeFailure(): Promise<string | undefined> {
    try {
      // The probe must authenticate too: a key-protected OpenAI-compatible
      // endpoint answers 401 to an anonymous GET /v1/models, which would report
      // a healthy server as broken.
      const headers: Record<string, string> = {};
      if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

      const response = await axios.get(`${this.baseUrl.replace(/\/$/, '')}/v1/models`, {
        headers,
        timeout: 4000,
      });
      this.checkModelIsOffered(response.data);
      return undefined;
    } catch (error) {
      const code = (error as AxiosError).code;
      if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT') {
        return `Cannot reach the model server at ${this.baseUrl}.`;
      }
      if (error instanceof Error && error.name === 'Error' && error.message.startsWith('The model server does not offer')) {
        return error.message;
      }
      return `The model server at ${this.baseUrl} is not responding (${code ?? 'unknown error'}).`;
    }
  }

  /**
   * Confirms the configured model is actually offered by the endpoint.
   *
   * A wrong model name is the most common misconfiguration and is far clearer
   * to report before a task starts than as a 404 halfway through a run.
   */
  private checkModelIsOffered(payload: unknown): void {
    const models = (payload as { data?: { id?: string }[] })?.data;
    if (!Array.isArray(models) || models.length === 0) return;
    const offered = models.map((m) => m?.id).filter((id): id is string => typeof id === 'string');
    if (offered.length === 0) return;

    const wanted = this.model.toLowerCase();
    const match = offered.some(
      (id) => id.toLowerCase() === wanted || id.toLowerCase().split(':')[0] === wanted.split(':')[0]
    );
    if (!match) {
      const claude = offered.filter((id) => /claude/i.test(id));
      throw new Error(
        `The model server does not offer the model "${this.model}".` +
          (claude.length ? ` Claude models available: ${claude.slice(0, 8).join(', ')}.` : '')
      );
    }
  }

  private toFriendlyError(error: unknown): Error {
    // Errors raised by our own validation must pass through unchanged.
    if (error instanceof Error && !('isAxiosError' in error)) return error;

    const axiosError = error as AxiosError;
    if (axiosError.code === 'ECONNREFUSED') {
      return new Error(
        `Could not reach the model server at ${this.baseUrl}. Check that it is running.`
      );
    }
    if (axiosError.code === 'ENOTFOUND') {
      return new Error(`The model server host "${this.baseUrl}" could not be resolved.`);
    }
    if (axiosError.code === 'ECONNABORTED' || /timeout/i.test(axiosError.message ?? '')) {
      return new Error(
        `The model server at ${this.baseUrl} did not answer within 180s.`
      );
    }
    if (axiosError.code === 'ERR_CANCELED' || axiosError.name === 'CanceledError') {
      return new Error('Cancelled.');
    }

    const status = axiosError.response?.status;

    if (status === 401 || status === 403) {
      return new Error(
        'The model server rejected the API key. Check LLM_API_KEY in backend/.env.'
      );
    }
    if (status === 404) {
      return new Error(
        `The model server does not know the model "${this.model}". Check the configured model name.`
      );
    }
    if (status === 429) {
      const retry = axiosError.response?.headers?.['retry-after'];
      return new Error(
        `The model server is rate limiting this account${retry ? ` (retry after ${retry}s)` : ''}. Try again shortly.`
      );
    }
    if (typeof status === 'number' && status >= 500) {
      return new Error(
        `The model server reported an error (HTTP ${status}). Its upstream provider may be unavailable.`
      );
    }
    if (axiosError.code === 'ECONNRESET' || axiosError.code === 'ETIMEDOUT') {
      return new Error(`The connection to ${this.baseUrl} was interrupted.`);
    }

    const body = axiosError.response?.data as
      | { error?: { message?: string } | string; message?: string }
      | undefined;
    const detail =
      (typeof body?.error === 'string' ? body.error : body?.error?.message) ??
      body?.message ??
      axiosError.message ??
      'The request to the model failed.';
    return new Error(`Model request failed: ${detail}`);
  }
}
