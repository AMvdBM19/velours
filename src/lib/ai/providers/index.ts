import type { AIAdapter } from '../adapter';
import { AnthropicAdapter } from './anthropic';
import { OpenAIAdapter } from './openai';

export function getAdapter(provider: string, apiKey: string): AIAdapter {
  switch (provider) {
    case 'anthropic':
      return new AnthropicAdapter(apiKey);
    case 'openai':
      return new OpenAIAdapter(apiKey);
    default:
      throw new Error(`Unsupported AI provider: ${provider}. Supported: anthropic, openai`);
  }
}
