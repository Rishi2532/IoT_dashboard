/**
 * OpenAI API Routes
 * Provides endpoints for interacting with OpenAI services
 */

import { Router, Request, Response } from 'express';
import { config, hasApiKey } from '../../config';
import { z } from 'zod';
import { OpenAIService } from '../../services/openai-service-class';
import { getDB } from '../../db';
import { regions, schemeStatuses } from '@shared/schema';
import { eq, like } from 'drizzle-orm';

const router = Router();
const openaiService = new OpenAIService();

// Schema for chat completion request
const chatCompletionSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  maxTokens: z.number().optional().default(150),
  temperature: z.number().optional().default(0.7),
  language: z.enum(["en", "hi", "mr"]).optional().default("en"),
});

// Schema for natural language query
const querySchema = z.object({
  query: z.string().min(1, "Query is required"),
  language: z.string().optional().default("en"),
});

// POST /api/ai/query - Process natural language query with intent extraction
router.post('/query', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { query, language } = querySchema.parse(req.body);
    
    // Check if OpenAI API key is configured
    if (!hasApiKey('OPENAI_API_KEY')) {
      return res.status(500).json({ 
        error: 'OpenAI API key not configured',
        message: 'Please configure the OPENAI_API_KEY environment variable'
      });
    }
    
    // Process the query with OpenAI to extract intent and parameters
    const result = await openaiService.processQuery(query, language);
    
    // If intent is to filter by region, get the region data
    if (result.intent === 'filter_by_region' && result.parameters.region) {
      const db = await getDB();
      const regionName = result.parameters.region;
      
      // Get region information
      const regionData = await db
        .select()
        .from(regions)
        .where(like(regions.region_name, `%${regionName}%`));
        
      // Get schemes for this region
      const schemeData = await db
        .select()
        .from(schemeStatuses)
        .where(like(schemeStatuses.region, `%${regionName}%`))
        .limit(10);
        
      return res.json({
        intent: result.intent,
        parameters: result.parameters,
        response: {
          message: `Here's data for ${regionName} region`,
          regionData: regionData[0] || null,
          schemeSummary: {
            total: schemeData.length,
            completed: schemeData.filter((s) => {
              // Type-safe approach to check the completion status
              const scheme = s as { fully_completion_scheme_status?: string };
              return scheme.fully_completion_scheme_status === 'Fully Completed';
            }).length,
            partial: schemeData.filter((s) => {
              // Type-safe approach to check the completion status
              const scheme = s as { fully_completion_scheme_status?: string };
              return scheme.fully_completion_scheme_status === 'Partial';
            }).length
          },
          action: 'filter_dashboard',
          filterData: {
            regionName: regionName
          }
        }
      });
    }
    
    // Default response for other intents
    return res.json(result);
    
  } catch (error) {
    console.error('Error processing AI query:', error);
    res.status(500).json({ error: 'Failed to process query' });
  }
});

// POST /api/ai/chat - Generate chat completion
router.post('/chat', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { prompt, maxTokens, temperature, language } = chatCompletionSchema.parse(req.body);
    
    // Check if OpenAI API key is configured
    if (!hasApiKey('OPENAI_API_KEY')) {
      return res.status(500).json({ 
        success: false, 
        message: "OpenAI API key is not configured on the server" 
      });
    }
    
    // Get language-specific system message
    const languageLabel = language === 'hi' ? 'Hindi' : language === 'mr' ? 'Marathi' : 'English';
    const systemMessage = `You are a helpful assistant for the Maharashtra Water Dashboard. 
                         Provide concise, helpful information about water infrastructure in Maharashtra. 
                         Respond in ${languageLabel}.`;
    
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKeys.openai}`
      },
      body: JSON.stringify({
        // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: temperature,
      })
    });
    
    // Handle API errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', errorData);
      return res.status(response.status).json({ 
        success: false, 
        message: "Error from OpenAI API", 
        error: errorData.error?.message || `HTTP error ${response.status}`
      });
    }
    
    // Parse and return the response
    const data = await response.json();
    const completionText = data.choices[0]?.message?.content || '';
    
    return res.json({
      success: true,
      text: completionText.trim(),
      model: data.model,
      usage: data.usage
    });
    
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: error.errors
      });
    }
    
    // Handle general errors
    console.error('Error in chat completion endpoint:', error);
    return res.status(500).json({
      success: false,
      message: "Server error processing the request",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// POST /api/ai/speech-to-text - Process audio to text
router.post('/speech-to-text', async (req: Request, res: Response) => {
  try {
    const { audioData, language = 'en' } = req.body;
    
    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required' });
    }
    
    // Process speech using OpenAI's whisper model
    const text = await openaiService.processAudio(audioData, language);
    
    return res.json({ text });
  } catch (error) {
    console.error('Error processing speech:', error);
    res.status(500).json({ error: 'Failed to process speech' });
  }
});

// GET /api/ai/status - Check if OpenAI integration is configured correctly
router.get('/status', (req: Request, res: Response) => {
  const hasKey = hasApiKey('OPENAI_API_KEY');
  
  res.json({
    configured: hasKey,
    enabled: config.features.useOpenAI && hasKey,
    features: {
      chatCompletions: hasKey,
      translations: hasKey,
      voiceEnabled: config.features.enableVoiceRecognition && config.features.enableTextToSpeech
    }
  });
});

export default router;