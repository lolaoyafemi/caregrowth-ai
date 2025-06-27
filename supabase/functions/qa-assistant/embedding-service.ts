
export class EmbeddingService {
  constructor(private openAIApiKey: string) {}

  async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      console.log('Generating embedding for text...');
      
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Embedding API error:', response.status, errorText);
        return null;
      }

      const data = await response.json();
      const embedding = data.data[0].embedding;
      console.log('Generated embedding, vector length:', embedding.length);
      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null;
    }
  }
}
