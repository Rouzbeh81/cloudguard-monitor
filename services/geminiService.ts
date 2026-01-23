import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { CloudUpdate, SummaryReport } from "../types";

// Using gemini-2.0-flash for latest features and search grounding support
const MODEL_NAME = 'gemini-2.0-flash';
const MAX_RETRIES = 2;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchCloudUpdates = async (retryCount = 0): Promise<SummaryReport> => {
  // Try to get API key from localStorage first, then fallback to environment variable
  let apiKey = "";
  try {
    const stored = localStorage.getItem('cloudguard_alerts');
    if (stored) {
      const settings = JSON.parse(stored);
      apiKey = settings.geminiApiKey || "";
    }
  } catch (e) {
    console.error("Failed to read API key from localStorage", e);
  }

  if (!apiKey) {
    apiKey = process.env.API_KEY || "";
  }

  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please configure it in Settings.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const searchPrompt = "official recent updates and roadmap announcements for Microsoft Azure and Microsoft 365 from the last 7 days";
  
  const systemInstruction = `
    You are a professional Cloud Architect. 
    1. Search for the latest official updates from Azure (azure.microsoft.com/en-us/updates/) and Microsoft 365 Roadmap.
    2. Provide an "executiveSummary" (2-3 sentences).
    3. Provide a list of "keyUpdates".
    4. Each update MUST have:
       - "category": one of "Azure", "M365", "Security"
       - "title": a concise title
       - "status": one of "General Availability", "Public Preview", "Development", "Retired"
       - "description": a brief overview
       - "date": the date of the update (YYYY-MM-DD or similar)
       - "url": a link to the official documentation (if found)

    Return the data in this JSON format:
    {
      "executiveSummary": "...",
      "keyUpdates": [
        {
          "category": "Azure",
          "title": "...",
          "status": "General Availability",
          "description": "...",
          "date": "...",
          "url": "..."
        }
      ]
    }
  `;

  try {
    // In @google/genai SDK, generateContent is called on ai.models
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: searchPrompt }] }],
      config: {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        tools: [{ googleSearch: {} }],
        temperature: 0.2, 
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "";
    if (!text) throw new Error("Empty response from intelligence service.");

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON response:", text);
      throw new Error("Invalid response format from intelligence service.");
    }

    // Extract grounding chunks to display source URLs as required for Google Search grounding
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter(chunk => chunk.web)
      .map(chunk => ({
        title: chunk.web?.title || "Microsoft Source",
        uri: chunk.web?.uri || "#"
      }));

    return {
      timestamp: new Date().toISOString(),
      executiveSummary: parsedResponse.executiveSummary || "Digest of recent infrastructure and productivity service updates from Microsoft.",
      keyUpdates: (parsedResponse.keyUpdates || []).map((u: any, i: number) => ({
        ...u,
        id: u.id || `upd-${i}-${Date.now()}`,
        url: u.url || "#"
      })),
      sources: sources
    };
  } catch (error: any) {
    console.error(`Sync Attempt ${retryCount + 1} failed:`, error);
    
    // Implement graceful retry logic for service errors
    if (retryCount < MAX_RETRIES && (error.status === 500 || error.message?.includes('500') || error.message?.includes('INTERNAL'))) {
      await sleep(1000 * (retryCount + 1));
      return fetchCloudUpdates(retryCount + 1);
    }
    
    throw new Error(error.message || "Cloud feed synchronization failed. Please check your connection.");
  }
};
