import { EmbeddingFunction, Embedding } from '../vector-types';
import OpenAI from 'openai';

export interface OpenAIEmbeddingOptions {
  apiKey: string;
  model?: string;
  organization?: string;
}

export class OpenAIEmbeddingFunction implements EmbeddingFunction {
  private client: OpenAI;
  private model: string;
  private _dimension: number;

  constructor(options: OpenAIEmbeddingOptions) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
      organization: options.organization
    });

    this.model = options.model || 'text-embedding-3-small';

    // Set dimension based on model
    this._dimension = this.model === 'text-embedding-3-large' ? 3072 :
                      this.model === 'text-embedding-3-small' ? 1536 :
                      this.model === 'text-embedding-ada-002' ? 1536 : 1536;
  }

  async generate(texts: string[]): Promise<Embedding[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts,
        encoding_format: 'float'
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      throw new Error(`OpenAI embedding generation failed: ${error}`);
    }
  }

  dimension(): number {
    return this._dimension;
  }

  modelName(): string {
    return this.model;
  }
}