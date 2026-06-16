// AI Service for product recommendations and chat
const axios = require('axios');

class AIService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    this.isConfigured = !!this.apiKey;
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    
    if (!this.isConfigured) {
      console.log('⚠️  AI Service not configured - using fallback responses');
      console.log('   To enable: Set GEMINI_API_KEY in .env');
    }
  }

  async getProductRecommendations(userPreferences, products) {
    try {
      const prompt = `Based on user preferences: ${JSON.stringify(userPreferences)}, 
      recommend products from this list: ${JSON.stringify(products.map(p => ({ id: p._id, name: p.name, category: p.category, tags: p.tags })))}.
      Return 5 product IDs that best match.`;

      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const recommendedIds = response.data.choices[0].message.content
        .split(',')
        .map(id => id.trim())
        .filter(id => products.some(p => p._id.toString() === id));

      return recommendedIds;
    } catch (error) {
      console.error('AI recommendation error:', error);
      return [];
    }
  }

  async generateProductDescription(productData) {
    try {
      const prompt = `Generate a compelling product description for: ${JSON.stringify(productData)}.
      Make it engaging, highlight key features, and keep it under 200 words.`;

      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('AI description generation error:', error);
      return productData.description || 'No description available';
    }
  }

  async chatWithAI(message, context = '') {
    try {
      const systemPrompt = `You are a helpful AI assistant for RongRani, an e-commerce platform specializing in Bangladeshi products and gifts.
      Be friendly, helpful, and knowledgeable about products, orders, and customer service.
      Context: ${context}`;

      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 150,
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('AI chat error:', error);
      return 'I apologize, but I\'m having trouble responding right now. Please try again later.';
    }
  }

  async analyzeSentiment(text) {
    try {
      const prompt = `Analyze the sentiment of this text and return only 'positive', 'negative', or 'neutral': "${text}"`;

      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 10,
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data.choices[0].message.content.trim().toLowerCase();
    } catch (error) {
      console.error('AI sentiment analysis error:', error);
      return 'neutral';
    }
  }
}

module.exports = new AIService();