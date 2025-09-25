
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

  // Enhanced search with improved accuracy and relevance scoring
  async findRelevantChunks(questionEmbedding: number[] | null, chunks: DocumentChunk[], question: string): Promise<DocumentChunk[]> {
    if (!chunks || chunks.length === 0) {
      console.log('No chunks available for search');
      return [];
    }

    console.log(`Searching through ${chunks.length} chunks for relevant content`);
    const normalizedQuestion = this.normalizeText(question);
    const queryWords = this.extractKeywords(normalizedQuestion);

    // Strategy 1: Enhanced embedding-based search with improved scoring
    if (questionEmbedding && chunks.some(chunk => chunk.embedding && Array.isArray(chunk.embedding))) {
      console.log('Using enhanced embedding-based similarity search');
      
      const chunksWithScores = chunks
        .filter(chunk => chunk.embedding && Array.isArray(chunk.embedding) && chunk.embedding.length > 0)
        .map(chunk => {
          const baseSimilarity = this.cosineSimilarity(questionEmbedding, chunk.embedding!);
          
          // Enhanced scoring with multiple factors
          let enhancedScore = baseSimilarity;
          
          // Content relevance boost
          const contentRelevance = this.calculateContentRelevance(chunk.content, queryWords);
          enhancedScore += contentRelevance * 0.2;
          
          // Length penalty for very short or very long chunks
          const lengthPenalty = this.calculateLengthPenalty(chunk.content);
          enhancedScore *= lengthPenalty;
          
          console.log(`Chunk similarity: base=${baseSimilarity.toFixed(4)}, enhanced=${enhancedScore.toFixed(4)} for: "${chunk.content.substring(0, 80)}..."`);
          
          return {
            ...chunk,
            similarity: enhancedScore,
            baseSimilarity,
            contentRelevance,
            searchMethod: 'enhanced_embedding'
          };
        })
        .sort((a, b) => b.similarity! - a.similarity!);

      if (chunksWithScores.length > 0) {
        const topScore = chunksWithScores[0].similarity!;
        console.log(`Top similarity score: ${topScore.toFixed(4)}`);
        
        // Improved threshold calculation
        const qualityThreshold = Math.max(0.25, topScore * 0.6); // Higher base threshold
        let relevantChunks = chunksWithScores.filter(chunk => chunk.similarity! >= qualityThreshold);
        
        // Only fall back to lower scores if we have very few results
        if (relevantChunks.length < 2 && chunksWithScores.length > 0) {
          const fallbackThreshold = Math.max(0.15, topScore * 0.4);
          relevantChunks = chunksWithScores.filter(chunk => chunk.similarity! >= fallbackThreshold).slice(0, 4);
          console.log(`Using fallback threshold ${fallbackThreshold.toFixed(3)}, found ${relevantChunks.length} chunks`);
        } else {
          console.log(`Found ${relevantChunks.length} high-quality chunks above threshold ${qualityThreshold.toFixed(3)}`);
        }
        
        return relevantChunks.slice(0, 6); // Return top 6 for better context
      }
    }

    // Strategy 2: Improved keyword-based search
    console.log('Using improved keyword-based search as fallback');
    const keywordMatches = chunks
      .map(chunk => {
        const score = this.calculateKeywordMatchScore(chunk.content, queryWords, normalizedQuestion);
        return {
          ...chunk,
          similarity: score,
          searchMethod: 'keyword'
        };
      })
      .filter(chunk => chunk.similarity! > 0.3) // Higher threshold for keyword matching
      .sort((a, b) => b.similarity! - a.similarity!)
      .slice(0, 5);

    if (keywordMatches.length > 0) {
      console.log(`Keyword search found ${keywordMatches.length} relevant chunks`);
      return keywordMatches;
    }

    // Strategy 3: Return empty array instead of random chunks
    console.log('No relevant chunks found with sufficient confidence');
    return [];
  }

  private normalizeText(text: string): string {
    return text.trim().toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'shall', 'of', 'in', 'for', 'with', 'by', 'from', 'about', 'an', 'or', 'but', 'if', 'then', 'than', 'when', 'where', 'how', 'what', 'who', 'why']);
    
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10);
  }

  private calculateContentRelevance(content: string, queryWords: string[]): number {
    if (queryWords.length === 0) return 0;
    
    const contentLower = content.toLowerCase();
    let totalRelevance = 0;
    
    queryWords.forEach(word => {
      const wordCount = (contentLower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
      if (wordCount > 0) {
        // Give higher score for multiple occurrences, but with diminishing returns
        totalRelevance += Math.min(wordCount * 0.3, 1.0);
      }
    });
    
    return Math.min(totalRelevance / queryWords.length, 1.0);
  }

  private calculateLengthPenalty(content: string): number {
    const length = content.length;
    if (length < 50) return 0.7; // Too short, likely not meaningful
    if (length > 2000) return 0.9; // Very long, might be less focused
    return 1.0; // Good length
  }

  private calculateKeywordMatchScore(content: string, queryWords: string[], originalQuery: string): number {
    const contentLower = content.toLowerCase();
    
    // Check for exact phrase match first
    if (originalQuery.length > 10 && contentLower.includes(originalQuery)) {
      return 0.95;
    }
    
    // Calculate individual word matches with position weighting
    let score = 0;
    let totalWords = queryWords.length;
    
    queryWords.forEach((word, index) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = contentLower.match(regex);
      if (matches) {
        // Give higher weight to words that appear earlier in the query
        const positionWeight = 1 - (index * 0.1);
        const wordScore = Math.min(matches.length * 0.2, 0.6) * positionWeight;
        score += wordScore;
      }
    });
    
    return totalWords > 0 ? Math.min(score / totalWords, 1.0) : 0;
  }
}
