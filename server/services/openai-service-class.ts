/**
 * OpenAI Service Class
 * Provides structured interface for OpenAI API interactions
 */

import OpenAI from 'openai';
import { config } from '../config';

export class OpenAIService {
  private openai: OpenAI;
  
  constructor() {
    // Initialize the OpenAI client with API key from environment
    this.openai = new OpenAI({ apiKey: config.apiKeys.openai });
  }
  
  /**
   * Process a natural language query to extract intent and parameters
   */
  async processQuery(query: string, language: string = 'en') {
    // Prepare the system prompt with context about the water dashboard
    const systemPrompt = `
      You are an assistant for a Maharashtra Water Dashboard. 
      The dashboard shows data about water infrastructure projects across different regions in Maharashtra.
      Regions include: Nagpur, Chhatrapati Sambhajinagar, Pune, Konkan, Amravati, Nashik.
      Extract the intent and parameters from the user's query. Focus on identifying:
      1. The intent (filter_by_region, show_statistics, compare_regions, etc.)
      2. Region names mentioned
      3. Metrics of interest (villages, schemes, ESR tanks, flow meters, etc.)
      4. Time period if mentioned
      
      Return a structured JSON response with 'intent' and 'parameters' fields.
    `;
    
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse and return the response
    try {
      const content = response.choices[0].message.content || "{}";
      return JSON.parse(content);
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      return {
        intent: "unknown",
        parameters: {},
        rawResponse: response.choices[0].message.content || ""
      };
    }
  }
  
  /**
   * Process audio data to convert speech to text
   */
  async processAudio(audioData: string, language: string = 'en') {
    try {
      // Convert base64 audio data to buffer
      const buffer = Buffer.from(audioData, 'base64');
      
      // Create a temporary file (in-memory)
      const file = new File([buffer], "audio.webm", { type: "audio/webm" });
      
      // Process with Whisper API
      const transcription = await this.openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        language: language
      });
      
      return transcription.text;
    } catch (error) {
      console.error("Error processing audio:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to process audio: ${errorMessage}`);
    }
  }
}

export default OpenAIService;