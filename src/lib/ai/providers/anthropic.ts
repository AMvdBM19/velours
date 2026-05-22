import type { AIAdapter, AIMessage, AITool } from '../adapter';

export class AnthropicAdapter implements AIAdapter {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendMessage(
    messages: AIMessage[],
    tools: AITool[],
    options?: { stream?: boolean }
  ): Promise<ReadableStream | string> {
    const systemMessages = messages.filter(m => m.role === 'system');
    const nonSystemMessages = messages.filter(m => m.role !== 'system');

    // Map to Anthropic message format
    const anthropicMessages = nonSystemMessages.map(m => {
      if (m.role === 'tool') {
        return {
          role: 'user' as const,
          content: [{
            type: 'tool_result' as const,
            tool_use_id: m.tool_call_id || '',
            content: m.content,
          }],
        };
      }
      return { role: m.role as 'user' | 'assistant', content: m.content };
    });

    // Map tools to Anthropic format
    const anthropicTools = tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));

    const body: Record<string, unknown> = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemMessages.map(m => m.content).join('\n\n'),
      messages: anthropicMessages,
    };

    if (anthropicTools.length > 0) {
      body.tools = anthropicTools;
    }

    if (options?.stream) {
      body.stream = true;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Anthropic API error: ${response.status} - ${err}`);
      }

      return this.transformAnthropicStream(response.body!);
    }

    // Non-streaming
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${err}`);
    }

    const data = await response.json();

    // Check for tool use
    const toolUseBlock = data.content?.find(
      (b: { type: string }) => b.type === 'tool_use'
    );

    if (toolUseBlock) {
      return JSON.stringify({
        type: 'tool_use',
        tool_name: toolUseBlock.name,
        tool_input: toolUseBlock.input,
        tool_use_id: toolUseBlock.id,
      });
    }

    const textBlock = data.content?.find(
      (b: { type: string }) => b.type === 'text'
    );

    return textBlock?.text || '';
  }

  private transformAnthropicStream(body: ReadableStream): ReadableStream {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    return new ReadableStream({
      async pull(controller) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                controller.close();
                return;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`)
                  );
                }
                if (parsed.type === 'content_block_start' && parsed.content_block?.type === 'tool_use') {
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({
                      type: 'tool_use_start',
                      tool_name: parsed.content_block.name,
                      tool_use_id: parsed.content_block.id,
                    })}\n\n`)
                  );
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      },
    });
  }
}
