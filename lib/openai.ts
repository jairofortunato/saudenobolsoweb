import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export { openai };

// Check if OpenAI is properly configured
export const isOpenAIConfigured = (): boolean => {
  return !!process.env.OPENAI_API_KEY;
};

// Test OpenAI connection
export const testOpenAIConnection = async (): Promise<boolean> => {
  try {
    if (!isOpenAIConfigured()) {
      console.error('OpenAI API key not configured');
      return false;
    }

    // Make a simple test request
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: 'Test connection. Reply with "OK".'
        }
      ],
      max_tokens: 5
    });

    return response.choices[0]?.message?.content?.includes('OK') || false;
  } catch (error) {
    console.error('OpenAI connection test failed:', error);
    return false;
  }
}; 