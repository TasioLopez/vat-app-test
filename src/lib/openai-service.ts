import OpenAI from 'openai';
import { APIError } from './api-utils';

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class OpenAIService {
  private static instance: OpenAIService;
  private client: OpenAI;

  private constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new APIError('OpenAI API key not configured', 500, 'CONFIG_ERROR');
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  static getInstance(): OpenAIService {
    if (!this.instance) {
      this.instance = new OpenAIService();
    }
    return this.instance;
  }

  async generateContent(
    systemPrompt: string,
    userPrompt: string,
    toolSchema: OpenAITool,
    options: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    } = {}
  ): Promise<any> {
    try {
      const {
        temperature = 0.1,
        maxTokens = 2000,
        model = 'gpt-4o'
      } = options;

      const completion = await this.client.chat.completions.create({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [toolSchema],
        tool_choice: { type: 'function', function: { name: toolSchema.function.name } }
      });

      const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        throw new APIError('No tool call returned from OpenAI', 500, 'OPENAI_ERROR');
      }

      const args = toolCall.function?.arguments;
      if (!args) {
        throw new APIError('No function arguments returned from OpenAI', 500, 'OPENAI_ERROR');
      }

      return JSON.parse(args);
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      console.error('OpenAI API Error:', error);
      throw new APIError(
        'Failed to generate content with OpenAI',
        500,
        'OPENAI_ERROR'
      );
    }
  }

  async generateText(
    systemPrompt: string,
    userPrompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    } = {}
  ): Promise<string> {
    try {
      const {
        temperature = 0.1,
        maxTokens = 2000,
        model = 'gpt-4o'
      } = options;

      const completion = await this.client.chat.completions.create({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new APIError('No content returned from OpenAI', 500, 'OPENAI_ERROR');
      }

      return content.trim();
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      console.error('OpenAI API Error:', error);
      throw new APIError(
        'Failed to generate text with OpenAI',
        500,
        'OPENAI_ERROR'
      );
    }
  }
}
