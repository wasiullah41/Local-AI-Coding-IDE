export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  content: string;
}

export interface LLMProvider {
  name: string;
  chat(messages: ChatMessage[]): Promise<ChatResponse>;
  stream?(messages: ChatMessage[], onData: (data: string) => void): Promise<void>;
  getModelInfo(): { model: string; provider: string };
  isAvailable(): Promise<boolean>;
}
