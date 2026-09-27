import axios from 'axios';
import { LLMProvider, ChatMessage, ChatResponse } from './llmProvider';

export class OllamaProvider implements LLMProvider {
  name = 'ollama';

  constructor(
    private baseUrl: string = 'http://127.0.0.1:11434',
    private model: string = 'llama3'
  ) {}

  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    const response = await axios.post(`${this.baseUrl}/api/chat`, {
      model: this.model,
      messages,
      stream: false,
    });

    return { content: response.data.message.content };
  }

  getModelInfo() {
    return { model: this.model, provider: this.name };
  }

  async isAvailable(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/api/tags`);
      return true;
    } catch {
      return false;
    }
  }
}
