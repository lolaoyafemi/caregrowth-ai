
import { DocumentChunk } from './types.ts';

export class SearchService {
  // Enhanced cosine similarity function with validation
  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length || a.length === 0) {
      console.log('Invalid vectors for similarity calculation');
      return 0;
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      if (typeof a[i] !== 'number' || typeof b[i] !== 'number') {
        console.log('Non-numeric values in vectors');
        return 0;
      }
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) {
      console.log('Zero magnitude vectors');
      return 0;
    }
    
    return dotProduct / magnitude;
  }

  // Enhanced search with multiple strategies
  async findRelevantChunks(questionEmbedding: number[] | null, chunks: DocumentChunk[], question: string): Promise<DocumentChunk[]> {
    if (!chunks || chunks.length === 0) {
      console.log('No chunks available for search');
      return [];
    }

    console.log(`Searching through ${chunks.length} chunks for relevant content`);

    // Strategy 1: Embedding-based similarity search (preferred)
    if (questionEmbedding && chunks.some(chunk => chunk.embedding && Array.isArray(chunk.embedding))) {
      console.log('Using embedding-based similarity search');
      
      const chunksWithScores = chunks
        .filter(chunk => chunk.embedding && Array.isArray(chunk.embedding) && chunk.embedding.length > 0)
        .map(chunk => {
          const similarity = this.cosineSimilarity(questionEmbedding, chunk.embedding!);
          console.log(`Chunk similarity: ${similarity.toFixed(4)} for content: "${chunk.content.substring(0, 100)}..."`);
          return {
            ...chunk,
            similarity,
            searchMethod: 'embedding'
          };
        })
        .sort((a, b) => b.similarity! - a.similarity!);

      if (chunksWithScores.length > 0) {
        // Use a much lower threshold and adaptive approach
        const topScore = chunksWithScores[0].similarity!;
        const minThreshold = 0.15; // Much lower base threshold
        const adaptiveThreshold = Math.max(minThreshold, topScore * 0.5); // 50% of top score
        
        let relevantChunks = chunksWithScores.filter(chunk => chunk.similarity! > adaptiveThreshold);
        
        // If we still have no chunks, take the top 3 chunks regardless of score
        if (relevantChunks.length === 0 && chunksWithScores.length > 0) {
          relevantChunks = chunksWithScores.slice(0, 3);
          console.log(`No chunks above threshold, taking top 3 chunks with scores: ${relevantChunks.map(c => c.similarity!.toFixed(4)).join(', ')}`);
        } else {
          console.log(`Found ${relevantChunks.length} chunks above adaptive threshold ${adaptiveThreshold.toFixed(3)}`);
        }
        
        return relevantChunks.slice(0, 5); // Limit to top 5
      }
    }

    // Strategy 2: Keyword-based search (fallback)
    console.log('Using keyword-based search as fallback');
    const questionWords = question.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2) // Lower threshold for words
      .slice(0, 10);

    console.log('Searching for keywords:', questionWords);

    const keywordMatches = chunks
      .map(chunk => {
        const content = chunk.content.toLowerCase();
        const matches = questionWords.filter(word => content.includes(word));
        const score = matches.length / Math.max(questionWords.length, 1);
        
        return {
          ...chunk,
          similarity: score,
          searchMethod: 'keyword',
          matchedWords: matches
        };
      })
      .filter(chunk => chunk.similarity! > 0.1) // Lower threshold for keyword matching
      .sort((a, b) => b.similarity! - a.similarity!)
      .slice(0, 5);

    if (keywordMatches.length > 0) {
      console.log(`Keyword search found ${keywordMatches.length} relevant chunks`);
      return keywordMatches;
    }

    // Strategy 3: If nothing else works, return first few chunks
    console.log('No relevant chunks found, returning first 2 chunks as fallback');
    return chunks.slice(0, 2).map(chunk => ({
      ...chunk,
      similarity: 0.1,
      searchMethod: 'fallback'
    }));
  }
}
