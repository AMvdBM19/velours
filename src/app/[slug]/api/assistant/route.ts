import { NextResponse, type NextRequest } from 'next/server';
import { apiGuard } from '@/lib/auth/api-guard';
import { createServerClient } from '@supabase/ssr';
import { getAdapter } from '@/lib/ai/providers';
import { TOOL_DEFINITIONS, executeTool } from '@/lib/ai/tools';
import { buildSystemPrompt } from '@/lib/ai/context/builder';
import type { AIMessage } from '@/lib/ai/adapter';

function getSupabase(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() {},
      },
    }
  );
}

/**
 * POST /[slug]/api/assistant
 * Streaming AI assistant endpoint. Agent-only.
 *
 * Body: {
 *   messages: AIMessage[],
 *   current_page: string
 * }
 */
export async function POST(request: NextRequest) {
  const guard = await apiGuard(request, ['agent']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const supabase = getSupabase(request);

  // Check if AI assistant is enabled for this tenant
  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('ai_assistant_enabled, ai_provider, agency_name')
    .eq('tenant_id', user.tenantId)
    .single();

  if (!settings?.ai_assistant_enabled) {
    return NextResponse.json(
      { error: 'AI assistant is not enabled for this agency. Contact support to activate.' },
      { status: 403 }
    );
  }

  const provider = settings.ai_provider || 'anthropic';

  // Get API key from tenant_integrations
  const { data: integration } = await supabase
    .from('tenant_integrations')
    .select('api_key')
    .eq('tenant_id', user.tenantId)
    .eq('integration_type', provider)
    .eq('is_active', true)
    .single();

  if (!integration?.api_key) {
    return NextResponse.json(
      { error: `No ${provider} API key configured. Add one in Settings → Integrations.` },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { messages: userMessages, current_page } = body as {
    messages: AIMessage[];
    current_page: string;
  };

  if (!userMessages || !Array.isArray(userMessages)) {
    return NextResponse.json({ error: 'messages array required' }, { status: 400 });
  }

  // Build system prompt
  const systemPrompt = buildSystemPrompt({
    agencyName: settings.agency_name || 'Your Agency',
    currentPage: current_page || '/',
    aiProvider: provider,
  });

  // Assemble full message array
  const fullMessages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...userMessages,
  ];

  try {
    const adapter = getAdapter(provider, integration.api_key);

    // First attempt: non-streaming to handle tool use
    const result = await adapter.sendMessage(fullMessages, TOOL_DEFINITIONS, { stream: false });

    if (typeof result === 'string') {
      // Check if it's a tool use response
      try {
        const parsed = JSON.parse(result);
        if (parsed.type === 'tool_use') {
          // Execute the tool
          const toolResult = await executeTool(parsed.tool_name, parsed.tool_input, user.tenantId);

          // Add tool use and result to messages, then get final response
          const messagesWithTool: AIMessage[] = [
            ...fullMessages,
            {
              role: 'assistant',
              content: `I'll use the ${parsed.tool_name} tool to help with that.`,
            },
            {
              role: 'tool',
              content: toolResult,
              tool_call_id: parsed.tool_use_id,
            },
          ];

          // Get final response (streaming)
          const finalResult = await adapter.sendMessage(messagesWithTool, [], { stream: true });

          if (finalResult instanceof ReadableStream) {
            return new NextResponse(finalResult, {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
              },
            });
          }

          // Non-streaming fallback
          return NextResponse.json({ response: finalResult, tool_used: parsed.tool_name, tool_result: toolResult });
        }
      } catch {
        // Not JSON — it's a regular text response
      }

      // Regular text response — stream it
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ text: result })}\n\n`)
          );
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // ReadableStream response (streaming)
    return new NextResponse(result, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('[assistant] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI assistant error' },
      { status: 500 }
    );
  }
}
