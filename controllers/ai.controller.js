const { getAIResponse } = require('../utils/aiService');

// @desc    Get AI response for user query
// @route   POST /api/ai/chat
// @access  Private
const getChatResponse = async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const response = await getAIResponse(message, context);

    res.json({
      message: response,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({
      message: 'Unable to process your request at the moment. Please try again later.',
    });
  }
};

// @desc    Get product recommendations
// @route   POST /api/ai/recommendations
// @access  Private
const getProductRecommendations = async (req, res) => {
  try {
    const { userPreferences, viewedProducts, purchasedProducts } = req.body;

    const prompt = `Based on the following user data, recommend 5 products from an e-commerce store:

User Preferences: ${userPreferences || 'General shopping'}
Recently Viewed Products: ${viewedProducts?.join(', ') || 'None'}
Previously Purchased Products: ${purchasedProducts?.join(', ') || 'None'}

Please provide recommendations in the following JSON format:
{
  "recommendations": [
    {
      "name": "Product Name",
      "category": "Category",
      "reason": "Why this product is recommended"
    }
  ]
}`;

    const response = await getAIResponse(prompt);
    const recommendations = JSON.parse(response);

    res.json(recommendations);
  } catch (error) {
    console.error('AI Recommendations Error:', error);
    res.status(500).json({
      message: 'Unable to generate recommendations at the moment.',
    });
  }
};

// @desc    Analyze customer feedback
// @route   POST /api/ai/analyze-feedback
// @access  Private/Admin
const analyzeFeedback = async (req, res) => {
  try {
    const { feedback, rating } = req.body;

    if (!feedback) {
      return res.status(400).json({ message: 'Feedback is required' });
    }

    const prompt = `Analyze the following customer feedback and rating (${rating}/5):

"${feedback}"

Please provide analysis in the following JSON format:
{
  "sentiment": "positive/negative/neutral",
  "keyTopics": ["topic1", "topic2"],
  "summary": "Brief summary of the feedback",
  "actionItems": ["Suggested action 1", "Suggested action 2"],
  "priority": "high/medium/low"
}`;

    const response = await getAIResponse(prompt);
    const analysis = JSON.parse(response);

    res.json(analysis);
  } catch (error) {
    console.error('AI Feedback Analysis Error:', error);
    res.status(500).json({
      message: 'Unable to analyze feedback at the moment.',
    });
  }
};

// @desc    Generate product description
// @route   POST /api/ai/generate-description
// @access  Private/Admin
const generateProductDescription = async (req, res) => {
  try {
    const { productName, category, features, targetAudience } = req.body;

    if (!productName || !category) {
      return res.status(400).json({ message: 'Product name and category are required' });
    }

    const prompt = `Generate a compelling product description for:

Product Name: ${productName}
Category: ${category}
Key Features: ${features?.join(', ') || 'Not specified'}
Target Audience: ${targetAudience || 'General consumers'}

Please write a detailed, engaging product description that highlights the benefits and features. Make it SEO-friendly and persuasive.`;

    const description = await getAIResponse(prompt);

    res.json({ description });
  } catch (error) {
    console.error('AI Description Generation Error:', error);
    res.status(500).json({
      message: 'Unable to generate description at the moment.',
    });
  }
};

// @desc    Generate marketing content
// @route   POST /api/ai/generate-content
// @access  Private/Admin
const generateMarketingContent = async (req, res) => {
  try {
    const { contentType, product, targetAudience, platform } = req.body;

    if (!contentType || !product) {
      return res.status(400).json({ message: 'Content type and product are required' });
    }

    let prompt = '';

    switch (contentType) {
      case 'social_media_post':
        prompt = `Create an engaging social media post for ${platform || 'general social media'} about:

Product: ${product.name || product}
Description: ${product.description || 'Not provided'}
Price: ${product.price || 'Not specified'}
Target Audience: ${targetAudience || 'General consumers'}

Make it attention-grabbing, include relevant hashtags, and encourage engagement.`;
        break;

      case 'email_campaign':
        prompt = `Create an email marketing campaign for:

Product: ${product.name || product}
Description: ${product.description || 'Not provided'}
Price: ${product.price || 'Not specified'}
Target Audience: ${targetAudience || 'General consumers'}

Include subject line, email body, and call-to-action. Make it persuasive and conversion-focused.`;
        break;

      case 'ad_copy':
        prompt = `Create compelling ad copy for:

Product: ${product.name || product}
Description: ${product.description || 'Not provided'}
Price: ${product.price || 'Not specified'}
Target Audience: ${targetAudience || 'General consumers'}

Create multiple variations (headline, description, call-to-action) optimized for digital advertising.`;
        break;

      default:
        return res.status(400).json({ message: 'Invalid content type' });
    }

    const content = await getAIResponse(prompt);

    res.json({ content, contentType });
  } catch (error) {
    console.error('AI Content Generation Error:', error);
    res.status(500).json({
      message: 'Unable to generate content at the moment.',
    });
  }
};

// @desc    Analyze sales data
// @route   POST /api/ai/analyze-sales
// @access  Private/Admin
const analyzeSalesData = async (req, res) => {
  try {
    const { salesData, timePeriod } = req.body;

    if (!salesData) {
      return res.status(400).json({ message: 'Sales data is required' });
    }

    const prompt = `Analyze the following sales data for ${timePeriod || 'the given period'}:

${JSON.stringify(salesData, null, 2)}

Please provide insights in the following JSON format:
{
  "summary": "Overall sales summary",
  "trends": ["Key trend 1", "Key trend 2"],
  "topPerformers": ["Top product/category 1", "Top product/category 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "forecast": "Sales forecast for next period"
}`;

    const response = await getAIResponse(prompt);
    const analysis = JSON.parse(response);

    res.json(analysis);
  } catch (error) {
    console.error('AI Sales Analysis Error:', error);
    res.status(500).json({
      message: 'Unable to analyze sales data at the moment.',
    });
  }
};

module.exports = {
  getChatResponse,
  getProductRecommendations,
  analyzeFeedback,
  generateProductDescription,
  generateMarketingContent,
  analyzeSalesData,
};