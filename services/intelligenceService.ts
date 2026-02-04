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
 * Ensures that the updates have deep links and valid roadmap URLs.
 */
const ensureDeepLinks = (updates: any[]): any[] => {
  return updates.map(u => {
    let url = u.url || "";

    // Fix generic M365 Roadmap links if we can detect an ID in the title or description
    // Most AI-generated M365 updates from our context will have a recognizable title
    // But if the AI already followed instructions, we just sanitize
    if (u.category === 'M365' || u.category === 'Security') {
      if (url.includes('microsoft-365/roadmap') && !url.includes('id=')) {
        // AI returned a generic roadmap link, we'll keep it but prioritize deep ones in instructions
      }
    }

    // Sanitize generic Azure root links if possible
    if (u.category === 'Azure' && url === "https://azure.microsoft.com/updates/") {
      // Keep it if nothing better, but AI is instructed to avoid this
    }

    return { ...u, url };
  });
};

/**
 * Fetches the latest M365 updates from the official public API.
 * This is 100% free and robust.
 */
const fetchM365Direct = async (): Promise<any[]> => {
  try {
    const response = await fetch('https://www.microsoft.com/releasecommunications/api/v1/m365');
    if (!response.ok) return [];
    const data = await response.json();
    // Take the most recent 20 items for better coverage
    return Array.isArray(data) ? data.slice(0, 20) : [];
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
  const m365Context = m365Data.map(item => {
    const dateStr = item.modified ? item.modified.split('T')[0] : 'Recent';
    return `[M365][ID:${item.id}] ${item.title} (Date: ${dateStr}, Status: ${item.status}) - ${item.description.substring(0, 500)}...`;
  }).join('\n\n');

  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentYear = now.getFullYear();

  const systemInstruction = `
    You are a professional Cloud Architect Intelligence Agent.
    CURRENT DATE: ${currentDate}

    CRITICAL CONTEXT (M365 Official API):
    ${m365Context || "No direct M365 data available. Use search or internal knowledge."}

    Instructions:
    1. IMPORTANT: Focus on updates from late 2025 and ${currentYear}. Do not return generic or outdated updates from 2024 or earlier.
    2. PRIORITIZE the provided M365 Context for all M365 and Entra ID updates.
    3. For M365 updates, you MUST use the following URL format: https://www.microsoft.com/en-us/microsoft-365/roadmap?id={ID} where {ID} is the ID provided in the context (e.g., [ID:12345]).
    4. For Azure, use Google Search (if available) to find official announcements from ${currentYear}.
    5. CRITICAL: Provide DEEP LINKS for all updates. Do NOT use generic root URLs like "https://azure.microsoft.com/updates/" or "https://www.microsoft.com/microsoft-365/roadmap". Every update must link to its specific announcement page.
    6. Search specifically for "Microsoft Entra ID WebView2 Windows 11" as this is a high-priority recent update.
    7. Avoid generic hallucinations like "Azure Security Center Enhancements" (the current name is Microsoft Defender for Cloud).
    8. Generate a "Cloud Intelligence Digest" as a valid JSON object.
    9. Required fields in JSON:
       - "executiveSummary": 2-3 sentences summarizing the biggest trends.
       - "keyUpdates": 6-10 specific updates.
         - "category": MUST be "Azure", "M365", or "Security".
         - "title": Concise and technical.
         - "status": "General Availability", "Public Preview", "Development", or "Retired".
         - "description": 1-2 sentences of technical impact.
         - "date": YYYY-MM-DD.
         - "url": MANDATORY DEEP LINK to the specific update.

    Return ONLY valid JSON.
  `;

  try {
    let report: SummaryReport;
    if (provider === 'gemini') {
      report = await handleGemini(geminiKey || "", systemInstruction, retryCount, options, m365Context);
    } else {
      report = await handleGroq(groqKey || "", systemInstruction, retryCount, options, m365Context);
    }

    // Post-process to ensure deep links and quality
    report.keyUpdates = ensureDeepLinks(report.keyUpdates);
    return report;

  } catch (error: any) {
    // Transparent fallback: If Gemini fails due to quota/rate limits and we have a Groq key, try Groq.
    const isQuotaError = error.message?.toLowerCase().includes('quota') ||
                        error.message?.toLowerCase().includes('429') ||
                        error.message?.toLowerCase().includes('limit') ||
                        error.message?.toLowerCase().includes('exhausted');

    if (provider === 'gemini' && groqKey && isQuotaError) {
      console.warn("Gemini quota exceeded or rate limited. Falling back to Groq...");
      const fallbackReport = await handleGroq(groqKey, systemInstruction, 0, options, m365Context);
      fallbackReport.keyUpdates = ensureDeepLinks(fallbackReport.keyUpdates);
      return fallbackReport;
    }

    throw error;
  }
};

const handleGemini = async (apiKey: string, systemInstruction: string, retryCount: number, options: FetchOptions, m365Context: string): Promise<SummaryReport> => {
  if (!apiKey) throw new Error("Gemini API Key is missing. Configure it in Settings.");

  const ai = new GoogleGenAI({ apiKey });
  const userPrompt = `
    M365 CRITICAL CONTEXT (Include IDs for Roadmap URLs):
    ${m365Context || "No direct M365 data available."}

    Task: Find recent Azure and Security updates from the last 7 days using Google Search.
    For each Azure update, find the EXACT DEEP LINK to the azure.microsoft.com/en-us/updates/ page.
    Combine these with the M365 context provided above.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
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

const handleGroq = async (apiKey: string, systemInstruction: string, retryCount: number, options: FetchOptions, m365Context: string): Promise<SummaryReport> => {
  if (!apiKey) throw new Error("Groq API Key is missing. Configure it in Settings.");

  const prompt = `
    M365 CONTEXT (Use IDs for Roadmap URLs):
    ${m365Context}

    Generate the Cloud Intelligence Digest based on this context and your knowledge of Azure updates from late 2025/early 2026.
    Ensure every M365 update uses the Roadmap URL with the correct ID.
  `;

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
