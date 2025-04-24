/**
 * OpenAI API Routes
 * Provides endpoints for interacting with OpenAI services
 */

import { Router, Request, Response } from "express";
import { config, hasApiKey } from "../../config";
import { z } from "zod";

const router = Router();

// Schema for chat completion request
const chatCompletionSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  maxTokens: z.number().optional().default(150),
  temperature: z.number().optional().default(0.7),
  language: z.enum(["en", "hi", "mr"]).optional().default("en"),
});

// POST /api/ai/chat - Generate chat completion
router.post("/chat", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { prompt, maxTokens, temperature, language } =
      chatCompletionSchema.parse(req.body);

    // Check if OpenAI API key is configured
    if (!hasApiKey("OPENAI_API_KEY")) {
      return res.status(500).json({
        success: false,
        message: "OpenAI API key is not configured on the server",
      });
    }

    // Get language-specific system message
    const languageLabel =
      language === "hi" ? "Hindi" : language === "mr" ? "Marathi" : "English";
    const systemMessage = `You are a helpful assistant for the Maharashtra Water Dashboard. 
                         Provide concise, helpful information about water infrastructure in Maharashtra. 
                         Respond in ${languageLabel}.`;

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKeys.openai}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemMessage,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature: temperature,
      }),
    });

    // Handle API errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API error:", errorData);
      return res.status(response.status).json({
        success: false,
        message: "Error from OpenAI API",
        error: errorData.error?.message || `HTTP error ${response.status}`,
      });
    }

    // Parse and return the response
    const data = await response.json();
    const completionText = data.choices[0]?.message?.content || "";

    return res.json({
      success: true,
      text: completionText.trim(),
      model: data.model,
      usage: data.usage,
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: error.errors,
      });
    }

    // Handle general errors
    console.error("Error in chat completion endpoint:", error);
    return res.status(500).json({
      success: false,
      message: "Server error processing the request",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// GET /api/ai/status - Check if OpenAI integration is configured correctly
router.get("/status", (req: Request, res: Response) => {
  const hasKey = hasApiKey("OPENAI_API_KEY");

  res.json({
    configured: hasKey,
    enabled: config.features.useOpenAI && hasKey,
    features: {
      chatCompletions: hasKey,
      translations: hasKey,
      voiceEnabled:
        config.features.enableVoiceRecognition &&
        config.features.enableTextToSpeech,
    },
  });
});

export default router;
