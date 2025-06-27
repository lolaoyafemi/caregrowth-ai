import { DocumentChunk, ChatCompletionResponse } from './types.ts';

export class AnswerGenerator {
  constructor(private openAIApiKey: string) {}

  // Function to clean up response formatting
  private cleanResponseFormatting(text: string): string {
    return text
      // Remove markdown headers (#, ##, ###, etc.)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italic markdown (**text**, *text*)
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      // Clean up excessive spacing
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Enhanced answer generation with conversation context
  async generateContextualAnswer(
    question: string, 
    relevantChunks: DocumentChunk[], 
    conversationHistory?: Array<{role: string, content: string}>
  ): Promise<{ answer: string; tokensUsed?: number }> {
    const hasRelevantContext = relevantChunks.length > 0;
    
    // Build context with source attribution
    let contextText = '';
    if (hasRelevantContext) {
      contextText = relevantChunks
        .map((chunk, index) => `Source ${index + 1}: ${chunk.content}`)
        .join('\n\n');
    }

    // Build conversation context
    let conversationContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      // Only include the last 6 messages to keep context manageable
      const recentHistory = conversationHistory.slice(-6);
      conversationContext = '\n\nPREVIOUS CONVERSATION CONTEXT:\n' + 
        recentHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    }

    const systemPrompt = hasRelevantContext 
      ? `You are Jared, a highly experienced consultant specializing in digital marketing agencies and home care businesses. Your expertise spans:

• Agency Operations & Management: Streamlining workflows, team coordination, client management systems
• Home Care Marketing: Patient acquisition strategies, family engagement, community outreach
• Team Development: Hiring best practices, training protocols, performance management
• Compliance & Regulations: Healthcare standards, documentation requirements, quality assurance
• Business Growth: Scaling strategies, revenue optimization, market expansion

RESPONSE GUIDELINES:
1. Provide clear, actionable guidance without using markdown formatting (no hashtags, asterisks, or special symbols)
2. Structure responses with numbered points or clear paragraphs for readability
3. Draw primarily from the provided context when relevant, noting "based on your documents"
4. Supplement with industry expertise when context is limited
5. Include specific examples, metrics, or implementation steps
6. Maintain a professional yet conversational tone
7. Focus on practical solutions that can be implemented immediately
8. Reference previous conversation when relevant to provide continuity and build upon earlier discussions
9. Remember what the user has mentioned before and acknowledge their specific situation

CONTEXT FROM USER'S DOCUMENTS:
${contextText}

${conversationContext}

Analyze the user's question and provide comprehensive guidance by seamlessly blending information from their documents with your professional expertise and previous conversation context. Prioritize actionable insights and specific recommendations while maintaining conversation continuity.`
      : `You are Jared, a highly experienced consultant specializing in digital marketing agencies and home care businesses. Your expertise includes:

• Agency Operations & Management: Workflow optimization, team coordination, client systems
• Home Care Marketing: Patient acquisition, family engagement, community partnerships  
• Team Development: Strategic hiring, comprehensive training, performance systems
• Compliance & Regulations: Healthcare standards, documentation, quality protocols
• Business Growth: Scaling methodologies, revenue strategies, market development

RESPONSE GUIDELINES:
1. Provide clear, actionable guidance without using markdown formatting (no hashtags, asterisks, or special symbols)
2. Structure responses with numbered points or clear paragraphs
3. Include specific examples, proven strategies, and implementation frameworks
4. Reference industry benchmarks and best practices
5. Maintain a professional yet approachable tone
6. Focus on solutions that deliver immediate and long-term value
7. Reference previous conversation when relevant to provide continuity
8. Remember what the user has mentioned before and build upon earlier discussions

${conversationContext}

Note: I don't have access to your specific documents for this question, so I'm providing guidance based on proven industry strategies, best practices, and our previous conversation context.`;

    try {
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: question
        }
      ];

      const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: messages,
          temperature: 0.7,
          max_tokens: 1500,
          top_p: 0.9,
        }),
      });

      if (!gptResponse.ok) {
        const errorText = await gptResponse.text();
        console.error('OpenAI API error:', gptResponse.status, errorText);
        throw new Error(`OpenAI API error: ${gptResponse.status}`);
      }

      const gptData: ChatCompletionResponse = await gptResponse.json();
      
      if (!gptData.choices || !gptData.choices[0] || !gptData.choices[0].message) {
        console.error('Invalid response structure from OpenAI');
        throw new Error('Invalid response from OpenAI');
      }

      // Clean up the response formatting
      const cleanedAnswer = this.cleanResponseFormatting(gptData.choices[0].message.content);

      return {
        answer: cleanedAnswer,
        tokensUsed: gptData.usage?.total_tokens
      };
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }

  async categorizeResponse(question: string, answer: string): Promise<string> {
    try {
      const categorizationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Categorize this Q&A interaction into one category: management, marketing, hiring, compliance, or other. Respond with only the category name in lowercase.'
            },
            {
              role: 'user',
              content: `Question: ${question}\n\nAnswer: ${answer.substring(0, 500)}`
            }
          ],
          temperature: 0,
          max_tokens: 10
        }),
      });

      if (categorizationResponse.ok) {
        const categorizationData = await categorizationResponse.json();
        if (categorizationData.choices?.[0]?.message?.content) {
          return categorizationData.choices[0].message.content.trim().toLowerCase();
        }
      }
      return 'other';
    } catch (error) {
      console.error('Error categorizing response:', error);
      return 'other';
    }
  }
}
