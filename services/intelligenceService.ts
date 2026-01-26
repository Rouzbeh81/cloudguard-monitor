import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { CloudUpdate, SummaryReport } from "../types";

const MAX_RETRIES = 1;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type AIProvider = 'gemini' | 'groq';

interface FetchOptions {
  provider: AIProvider;
  geminiKey?: string;
  groqKey?: string;
}

/**
 * Fetches the latest M365 updates from the official public API.
 * This is 100% free and robust.
 */
const fetchM365Direct = async (): Promise<any[]> => {
  try {
    const response = await fetch('https://www.microsoft.com/releasecommunications/api/v1/m365');
    if (!response.ok) return [];
    const data = await response.json();
    // Only take the most recent 12 items to stay within context limits
    return Array.isArray(data) ? data.slice(0, 12) : [];
  } catch (e) {
    console.error("Failed to fetch M365 direct updates", e);
    return [];
  }
};

export const fetchCloudUpdates = async (options: FetchOptions, retryCount = 0): Promise<SummaryReport> => {
  const { provider, geminiKey, groqKey } = options;

  // 1. Fetch raw data from direct APIs to ensure robustness and reduce AI "guessing"
  const m365Data = await fetchM365Direct();

  // 2. Build the context for the LLM
  const m365Context = m365Data.map(item =>
    `[M365] ${item.title} (Status: ${item.status}) - ${item.description.substring(0, 300)}...`
  ).join('\n\n');

  const systemInstruction = `
    You are a professional Cloud Architect Intelligence Agent.

    CRITICAL CONTEXT (M365 Official API):
    ${m365Context || "No direct M365 data available. Use search or internal knowledge."}

    Instructions:
    1. If you are Gemini, use Google Search to find official Azure updates from the last 7 days.
    2. If you are Groq, use the provided M365 context and your internal knowledge for Azure.
    3. Generate a "Cloud Intelligence Digest".
    4. "executiveSummary": 2-3 sentences summarizing the biggest trends.
    5. "keyUpdates": 6-10 specific updates.
       - "category": MUST be "Azure", "M365", or "Security".
       - "title": Concise.
       - "status": "General Availability", "Public Preview", "Development", or "Retired".
       - "description": 1-2 sentences of technical impact.
       - "date": YYYY-MM-DD.
       - "url": Official documentation link.

    Return ONLY valid JSON.
  `;

  try {
    if (provider === 'gemini') {
      return await handleGemini(geminiKey || "", systemInstruction, retryCount, options);
    } else {
      return await handleGroq(groqKey || "", systemInstruction, retryCount, options);
    }
  } catch (error: any) {
    // Transparent fallback: If Gemini fails due to quota/rate limits and we have a Groq key, try Groq.
    const isQuotaError = error.message?.toLowerCase().includes('quota') ||
                        error.message?.toLowerCase().includes('429') ||
                        error.message?.toLowerCase().includes('limit') ||
                        error.message?.toLowerCase().includes('exhausted');

    if (provider === 'gemini' && groqKey && isQuotaError) {
      console.warn("Gemini quota exceeded or rate limited. Falling back to Groq...");
      return await handleGroq(groqKey, systemInstruction, 0, options);
    }

    throw error;
  }
};

const handleGemini = async (apiKey: string, systemInstruction: string, retryCount: number, options: FetchOptions): Promise<SummaryReport> => {
  if (!apiKey) throw new Error("Gemini API Key is missing. Configure it in Settings.");

  const ai = new GoogleGenAI({ apiKey });
  const searchPrompt = "official recent updates and security announcements for Microsoft Azure and Microsoft 365 from the last 7 days";

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: searchPrompt }] }],
      config: {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "";
    const parsedResponse = JSON.parse(text);

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter(chunk => chunk.web)
      .map(chunk => ({
        title: chunk.web?.title || "Microsoft Source",
        uri: chunk.web?.uri || "#"
      }));

    return {
      timestamp: new Date().toISOString(),
      executiveSummary: parsedResponse.executiveSummary || "Summary of recent cloud service updates.",
      keyUpdates: (parsedResponse.keyUpdates || []).map((u: any, i: number) => ({
        ...u,
        id: `gemini-${i}-${Date.now()}`
      })),
      sources: sources.length > 0 ? sources : [{ title: "Microsoft Updates", uri: "https://azure.microsoft.com/updates/" }]
    };
  } catch (error: any) {
    console.error("Gemini attempt failed", error);
    if (retryCount < MAX_RETRIES) {
      await sleep(1500);
      return fetchCloudUpdates(options, retryCount + 1);
    }
    throw new Error(error.message || "Gemini Intelligence failed. Check your API key and connection.");
  }
};

const handleGroq = async (apiKey: string, systemInstruction: string, retryCount: number, options: FetchOptions): Promise<SummaryReport> => {
  if (!apiKey) throw new Error("Groq API Key is missing. Configure it in Settings.");

  const prompt = "Generate the Cloud Intelligence Digest based on the provided M365 context and your knowledge of Azure.";

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Groq API call failed");
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsedResponse = JSON.parse(content);

    return {
      timestamp: new Date().toISOString(),
      executiveSummary: parsedResponse.executiveSummary || "Summary of recent cloud service updates.",
      keyUpdates: (parsedResponse.keyUpdates || []).map((u: any, i: number) => ({
        ...u,
        id: `groq-${i}-${Date.now()}`
      })),
      sources: [{ title: "M365 Official Roadmap", uri: "https://www.microsoft.com/microsoft-365/roadmap" }]
    };
  } catch (error: any) {
    console.error("Groq attempt failed", error);
    if (retryCount < MAX_RETRIES) {
      await sleep(1500);
      return fetchCloudUpdates(options, retryCount + 1);
    }
    throw new Error(error.message || "Groq Intelligence failed. Check your API key and connection.");
  }
};
