// Phase 9: shared LLM adapter interface
// See /ai-docs/tools-reference.md for tool specifications

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}

export interface AITool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AIAdapter {
  sendMessage(
    messages: AIMessage[],
    tools: AITool[],
    options?: { stream?: boolean }
  ): Promise<ReadableStream | string>;
}
