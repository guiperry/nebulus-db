import { EmbeddingFunction, Embedding } from '../vector-types';
import { CohereClient } from 'cohere-ai';

export interface CohereEmbeddingOptions {
  apiKey: string;
  model?: string;
  inputType?: 'search_document' | 'search_query' | 'classification' | 'clustering';
}

export class CohereEmbeddingFunction implements EmbeddingFunction {
  private client: CohereClient;
  private model: string;
  private inputType: string;
  private _dimension: number;

  constructor(options: CohereEmbeddingOptions) {
    this.client = new CohereClient({ token: options.apiKey });
    this.model = options.model || 'embed-english-v3.0';
    this.inputType = options.inputType || 'search_document';

    // Set dimension based on model
    this._dimension = this.model === 'embed-english-v3.0' ? 1024 :
                      this.model === 'embed-multilingual-v3.0' ? 1024 : 1024;
  }

  async generate(texts: string[]): Promise<Embedding[]> {
    try {
      const response = await this.client.embed({
        texts,
        model: this.model,
        inputType: this.inputType as any
      });

      return response.embeddings as Embedding[];
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      throw new Error(`Cohere embedding generation failed: ${error}`);
    }
  }

  dimension(): number {
    return this._dimension;
  }

  modelName(): string {
    return this.model;
  }
}