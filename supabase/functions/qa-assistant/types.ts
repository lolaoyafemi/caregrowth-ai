
export interface QAResponse {
  answer: string;
  category: string;
  sources: number;
  debug?: {
    documentsFound: number;
    chunksFound: number;
    relevantChunks: number;
    searchMethod: string;
    tokensUsed: number;
    hasEmbedding: boolean;
  };
}

export interface DocumentChunk {
  content: string;
  document_id: string;
  embedding?: number[];
  chunk_index: number;
  similarity?: number;
  searchMethod?: string;
  matchedWords?: string[];
}

export interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
  }>;
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    total_tokens: number;
  };
}
