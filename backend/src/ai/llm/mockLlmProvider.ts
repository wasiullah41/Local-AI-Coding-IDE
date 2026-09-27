import { ChatMessage, ChatResponse, LLMProvider } from './llmProvider';

export class MockLLMProvider implements LLMProvider {
  name: string = 'MockLLMProvider';

  private responseQueue: Record<string, ChatResponse[]> = {};

  constructor() {}

  // Allow setting up a sequence of responses for deterministic testing
  setResponses(scenario: string, responses: ChatResponse[]) {
    this.responseQueue[scenario] = responses;
  }

  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    // In a real implementation we would look at the scenario or current state.
    // For now, let's just use the first scenario found.
    const scenario = Object.keys(this.responseQueue)[0];
    if (this.responseQueue[scenario] && this.responseQueue[scenario].length > 0) {
      return this.responseQueue[scenario].shift()!;
    }
    return { content: 'FINAL: Task completed' };
  }

  getModelInfo(): { model: string; provider: string } {
    return { model: 'mock-model', provider: 'test' };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
