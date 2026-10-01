import axios, { AxiosError } from 'axios';
import { LLMProvider, ChatMessage, ChatResponse } from './llmProvider';

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama';

  constructor(
    private baseUrl: string = 'http://127.0.0.1:11434',
    private model: string = 'llama3.1'
  ) {}

  async chat(messages: ChatMessage[], options?: { signal?: AbortSignal }): Promise<ChatResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/chat`,
        { model: this.model, messages, stream: false, options: { temperature: 0.1 } },
        { signal: options?.signal, timeout: 180_000 }
      );
      return { content: response.data?.message?.content ?? '' };
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
      const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 4000 });
      const models: { name: string }[] = response.data?.models ?? [];
      if (models.length === 0) {
        return 'Ollama is running but has no models installed. Run `ollama pull llama3.1`.';
      }
      const installed = models.some((m) => m.name === this.model || m.name.startsWith(`${this.model}:`));
      if (!installed) {
        return `Ollama does not have the model "${this.model}". Installed: ${models
          .map((m) => m.name)
          .slice(0, 6)
          .join(', ')}.`;
      }
      return undefined;
    } catch (error) {
      const code = (error as AxiosError).code;
      if (code === 'ECONNREFUSED') {
        return `Cannot reach Ollama at ${this.baseUrl}. Start it with \`ollama serve\`.`;
      }
      return `Ollama at ${this.baseUrl} is not responding (${code ?? 'unknown error'}).`;
    }
  }

  private toFriendlyError(error: unknown): Error {
    const axiosError = error as AxiosError;
    if (axiosError.code === 'ECONNREFUSED') {
      return new Error(
        `Could not reach Ollama at ${this.baseUrl}. Start it with \`ollama serve\`, then try again.`
      );
    }
    if (axiosError.code === 'ECONNABORTED' || axiosError.message?.includes('timeout')) {
      return new Error('The model took too long to respond.');
    }
    if (axiosError.response?.status === 404) {
      return new Error(
        `Ollama does not know the model "${this.model}". Run \`ollama pull ${this.model}\`.`
      );
    }
    const detail =
      (axiosError.response?.data as { error?: string } | undefined)?.error ??
      axiosError.message ??
      'The request to the model failed.';
    return new Error(`Model request failed: ${detail}`);
  }
}
