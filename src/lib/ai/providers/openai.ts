import type { AIAdapter, AIMessage, AITool } from '../adapter';

export class OpenAIAdapter implements AIAdapter {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendMessage(
    messages: AIMessage[],
    tools: AITool[],
    options?: { stream?: boolean }
  ): Promise<ReadableStream | string> {
    // Map to OpenAI format
    const openaiMessages = messages.map(m => {
      if (m.role === 'tool') {
        return {
          role: 'tool' as const,
          content: m.content,
          tool_call_id: m.tool_call_id || '',
        };
      }
      return { role: m.role, content: m.content };
    });

    const openaiTools = tools.length > 0
      ? tools.map(t => ({
          type: 'function' as const,
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        }))
      : undefined;

    const body: Record<string, unknown> = {
      model: 'gpt-4o',
      messages: openaiMessages,
      max_tokens: 2048,
      stream: options?.stream || false,
    };

    if (openaiTools) {
      body.tools = openaiTools;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${err}`);
    }

    if (options?.stream) {
      return this.transformOpenAIStream(response.body!);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    // Check for tool calls
    if (choice?.message?.tool_calls?.length > 0) {
      const tc = choice.message.tool_calls[0];
      return JSON.stringify({
        type: 'tool_use',
        tool_name: tc.function.name,
        tool_input: JSON.parse(tc.function.arguments || '{}'),
        tool_use_id: tc.id,
      });
    }

    return choice?.message?.content || '';
  }

  private transformOpenAIStream(body: ReadableStream): ReadableStream {
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
                const delta = parsed.choices?.[0]?.delta;
                if (delta?.content) {
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ text: delta.content })}\n\n`)
                  );
                }
                if (delta?.tool_calls?.[0]) {
                  const tc = delta.tool_calls[0];
                  if (tc.function?.name) {
                    controller.enqueue(
                      new TextEncoder().encode(`data: ${JSON.stringify({
                        type: 'tool_use_start',
                        tool_name: tc.function.name,
                        tool_use_id: tc.id,
                      })}\n\n`)
                    );
                  }
                }
              } catch {
                // Skip malformed
              }
            }
          }
        }
      },
    });
  }
}
