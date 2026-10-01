export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  content: string;
  /** Populated by providers that can report token usage. */
  usage?: { promptTokens?: number; completionTokens?: number };
}

export interface LLMProvider {
  readonly name: string;
  chat(messages: ChatMessage[], options?: { signal?: AbortSignal }): Promise<ChatResponse>;
  getModelInfo(): { model: string; provider: string };
  isAvailable(): Promise<boolean>;
  /**
   * Explains, in one user-facing sentence, why the provider cannot be used.
   * Shown in the AI panel so a missing dependency is a clear message rather
   * than a mysterious failure.
   */
  describeFailure?(): Promise<string | undefined>;
}
