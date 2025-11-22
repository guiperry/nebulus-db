import { EmbeddingFunction, Embedding } from '../vector-types';
import axios from 'axios';

export interface OllamaEmbeddingOptions {
  baseUrl?: string;
  model?: string;
}

export class OllamaEmbeddingFunction implements EmbeddingFunction {
  private baseUrl: string;
  private model: string;
  private _dimension: number;

  constructor(options: OllamaEmbeddingOptions = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:11434';
    this.model = options.model || 'nomic-embed-text';
    this._dimension = 768; // Default for nomic-embed-text
  }

  async generate(texts: string[]): Promise<Embedding[]> {
    try {
      const embeddings: Embedding[] = [];

      for (const text of texts) {
        const response = await axios.post(`${this.baseUrl}/api/embeddings`, {
          model: this.model,
          prompt: text
        });

        embeddings.push(response.data.embedding);
      }

      return embeddings;
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      throw new Error(`Ollama embedding generation failed: ${error}`);
    }
  }

  dimension(): number {
    return this._dimension;
  }

  modelName(): string {
    return this.model;
  }
}