
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

  // Enhanced search with multiple strategies and early optimizations
  async findRelevantChunks(questionEmbedding: number[] | null, chunks: DocumentChunk[], question: string): Promise<DocumentChunk[]> {
    if (!chunks || chunks.length === 0) {
      console.log('No chunks available for search');
      return [];
    }

    console.log(`Optimized search through ${chunks.length} chunks`);

    // Strategy 1: Embedding-based similarity search (preferred) - with optimizations
    if (questionEmbedding && chunks.some(chunk => chunk.embedding && Array.isArray(chunk.embedding))) {
      console.log('Using optimized embedding-based similarity search');
      
      // Filter valid chunks first to avoid repeated checks
      const validChunks = chunks.filter(chunk => 
        chunk.embedding && Array.isArray(chunk.embedding) && chunk.embedding.length > 0
      );
      
      if (validChunks.length === 0) {
        console.log('No valid embeddings found, falling back to keyword search');
      } else {
        // Parallel similarity calculation for better performance
        const similarityPromises = validChunks.map(async (chunk) => {
          const similarity = this.cosineSimilarity(questionEmbedding, chunk.embedding!);
          return {
            ...chunk,
            similarity,
            searchMethod: 'embedding'
          };
        });
        
        const chunksWithScores = await Promise.all(similarityPromises);
        chunksWithScores.sort((a, b) => b.similarity! - a.similarity!);
        
        // Adaptive threshold - more aggressive for better results
        const topScore = chunksWithScores[0].similarity!;
        const adaptiveThreshold = Math.max(0.1, topScore * 0.4); // Lower threshold for more results
        
        let relevantChunks = chunksWithScores.filter(chunk => chunk.similarity! > adaptiveThreshold);
        
        // Ensure we always get some results if chunks exist
        if (relevantChunks.length === 0 && chunksWithScores.length > 0) {
          relevantChunks = chunksWithScores.slice(0, Math.min(3, chunksWithScores.length));
          console.log(`No chunks above threshold, taking top ${relevantChunks.length} chunks`);
        }
        
        console.log(`Found ${relevantChunks.length} relevant chunks via embedding search`);
        return relevantChunks.slice(0, 5); // Limit for performance
      }
    }

    // Strategy 2: Optimized keyword-based search (fallback)
    console.log('Using optimized keyword-based search as fallback');
    
    // Pre-process question for better keyword extraction
    const questionWords = question.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'had', 'but', 'why', 'how', 'what', 'who', 'when', 'where'].includes(word))
      .slice(0, 8); // Reduced for performance

    console.log('Optimized keywords:', questionWords);

    // Parallel keyword matching for better performance
    const keywordPromises = chunks.map(async (chunk) => {
      const content = chunk.content.toLowerCase();
      const matches = questionWords.filter(word => content.includes(word));
      const score = matches.length / Math.max(questionWords.length, 1);
      
      return {
        ...chunk,
        similarity: score,
        searchMethod: 'keyword',
        matchedWords: matches
      };
    });

    const keywordMatches = await Promise.all(keywordPromises);
    const validMatches = keywordMatches
      .filter(chunk => chunk.similarity! > 0.1)
      .sort((a, b) => b.similarity! - a.similarity!)
      .slice(0, 5);

    if (validMatches.length > 0) {
      console.log(`Keyword search found ${validMatches.length} relevant chunks`);
      return validMatches;
    }

    // Strategy 3: Last resort - return top chunks by content length (usually more informative)
    console.log('Using fallback strategy - top chunks by content quality');
    return chunks
      .sort((a, b) => b.content.length - a.content.length)
      .slice(0, 2)
      .map(chunk => ({
        ...chunk,
        similarity: 0.05,
        searchMethod: 'fallback'
      }));
  }
}
