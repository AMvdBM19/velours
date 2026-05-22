'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AssistantChatProps {
  slug: string;
  enabled: boolean;
}

export default function AssistantChat({ slug, enabled }: AssistantChatProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  if (!enabled) return null;

  // Get current page context from pathname
  const currentPage = pathname.replace(`/${slug}`, '') || '/';

  async function handleSend() {
    if (!input.trim() || streaming) return;

    const userMessage = input.trim();
    setInput('');

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setStreaming(true);

    // Add empty assistant message for streaming
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch(`/${slug}/api/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          current_page: currentPage,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: err.error || 'Something went wrong. Please try again.',
          };
          return updated;
        });
        setStreaming(false);
        return;
      }

      // Check if it's a JSON response (non-streaming with tool)
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: data.response || data.error || 'No response.',
          };
          return updated;
        });
        setStreaming(false);
        return;
      }

      // Stream SSE response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  accumulated += parsed.text;
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: 'assistant',
                      content: accumulated,
                    };
                    return updated;
                  });
                }
              } catch {
                // Skip malformed
              }
            }
          }
        }
      }

      if (!accumulated) {
        setMessages(prev => {
          const updated = [...prev];
          if (updated[updated.length - 1].content === '') {
            updated[updated.length - 1] = {
              role: 'assistant',
              content: 'I could not generate a response. Please try again.',
            };
          }
          return updated;
        });
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Connection error. Please try again.',
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Toggle button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-12 h-12 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-all hover:scale-105 flex items-center justify-center z-50"
          title="AI Assistant"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 w-96 h-[600px] max-h-[85vh] bg-white border-l border-t border-gray-200 shadow-2xl z-50 flex flex-col rounded-tl-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-tl-xl">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">AI Assistant</h3>
              <p className="text-xs text-gray-400">{currentPage}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Disclosure */}
          {showDisclosure && messages.length === 0 && (
            <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700">
                This assistant has access to your agency data. Conversations are not saved.
              </p>
              <button
                type="button"
                onClick={() => setShowDisclosure(false)}
                className="text-xs text-amber-600 font-medium mt-1 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && !showDisclosure && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">Ask me anything about your agency.</p>
                <div className="mt-3 space-y-1">
                  {[
                    'How many bookings do I have tomorrow?',
                    'Show me all pending clients',
                    'What is my revenue this month?',
                  ].map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setInput(q); inputRef.current?.focus(); }}
                      className="block w-full text-left text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content || (streaming ? '...' : '')}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-3">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask something..."
                rows={1}
                disabled={streaming}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-50"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || streaming}
                className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {streaming ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
