import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { CloudUpdate, SummaryReport } from "../types";

const MAX_RETRIES = 1;
const REQUEST_TIMEOUT = 10000; // 10 seconds timeout for external API requests
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type AIProvider = 'gemini' | 'groq';

/**
 * Security: Helper to fetch with a timeout using AbortController.
 * Prevents application hangs if external APIs are unresponsive.
 */
const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(id);
  }
};

interface FetchOptions {
  provider: AIProvider;
  geminiKey?: string;
  groqKey?: string;
}

/**
 * Security: Sanitizes a URL by enforcing a strict protocol allowlist.
 * This prevents javascript: XSS and other malicious protocol injections.
 */
const sanitizeUrl = (url: string | undefined | null): string => {
  if (!url) return "https://azure.microsoft.com/updates/";
  const trimmed = url.trim();
  const isSafe = trimmed.toLowerCase().startsWith('http://') || trimmed.toLowerCase().startsWith('https://');
  return isSafe ? trimmed : "https://azure.microsoft.com/updates/";
};

/**
 * Ensures that the updates have deep links, valid categories, and safe protocols.
 */
const ensureDeepLinks = (updates: any[]): any[] => {
  const VALID_CATEGORIES = ['Azure', 'M365', 'Security'];

  return updates.map(u => {
    // Security: Validate URL protocol to prevent javascript: XSS
    const url = sanitizeUrl(u.url);

    // Security: Validate Category to prevent UI breakage or unexpected states
    const category = VALID_CATEGORIES.includes(u.category) ? u.category : 'Azure';

    // Fix generic M365 Roadmap links if we can detect an ID in the title or description
    if (category === 'M365' || category === 'Security') {
      if (url.includes('microsoft-365/roadmap') && !url.includes('id=')) {
        // AI returned a generic roadmap link, we'll keep it but prioritize deep ones in instructions
      }
    }

    return { ...u, url, category };
  });
};

/**
 * Fetches the latest M365 updates from the official public API.
 * This is 100% free and robust.
 */
const fetchM365Direct = async (): Promise<any[]> => {
  try {
    const response = await fetchWithTimeout('https://www.microsoft.com/releasecommunications/api/v1/m365');
    if (!response.ok) return [];
    const data = await response.json();
    // Take more items for better quarterly coverage (max 100)
    return Array.isArray(data) ? data.slice(0, 100) : [];
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
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const quarterLabel = `Q${currentQuarter} ${currentYear}`;

  const systemInstruction = `
    You are a professional Cloud Architect Intelligence Agent.
    CURRENT DATE: ${currentDate}
    TARGET QUARTER: ${quarterLabel}

    CRITICAL CONTEXT (M365 Official API):
    ${m365Context || "No direct M365 data available. Use search or internal knowledge."}

    Instructions:
    1. QUARTERLY FOCUS: Only include updates where the release, preview, or development date falls within ${quarterLabel}.
    2. COMPREHENSIVE COVERAGE: Provide exactly 50 high-importance updates across Azure, M365, and Security.
    3. PRODUCT SCOPE:
       - M365: Include the ENTIRE suite (Teams, Intune, Viva, Purview, Defender, Office, etc.).
       - Azure: Perform targeted searches for "Azure Compute", "Azure Networking", "Azure AI", "Azure Storage", and "Azure Databases" for ${quarterLabel}.
    4. CONTENT QUALITY: Focus on NEWLY ADDED FUNCTIONALITY and features. Avoid minor bug fixes or pricing/SKU changes.
    5. PRIORITIZE the provided M365 Context for all M365 and Intune updates.
    6. URL FORMAT: For M365, use: https://www.microsoft.com/en-us/microsoft-365/roadmap?id={ID}. For Azure, find EXACT DEEP LINKS to the specific update on azure.microsoft.com.
    7. DEEP LINKS ONLY: Do NOT use generic root URLs. Every update must link to its specific announcement.
    8. Generate a "Cloud Intelligence Digest" as a valid JSON object.
    9. Required fields in JSON:
       - "executiveSummary": 2-3 sentences summarizing the biggest trends for ${quarterLabel}.
       - "keyUpdates": List of 50 updates.
         - "category": MUST be "Azure", "M365", or "Security".
         - "subcategory": The specific product or service (e.g., "Intune", "Teams", "AKS", "Defender").
         - "title": Concise and technical.
         - "status": "General Availability", "Public Preview", "Development", or "Retired".
         - "description": 1-2 sentences of technical impact.
         - "date": YYYY-MM-DD (Estimate if only Month/Quarter is known).
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
  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const quarterLabel = `Q${currentQuarter} ${now.getFullYear()}`;

  const userPrompt = `
    M365 CRITICAL CONTEXT (Include IDs for Roadmap URLs):
    ${m365Context || "No direct M365 data available."}

    Task: Find high-importance Azure and Security updates scheduled for release or in preview during ${quarterLabel}.
    Search for "Azure Compute", "Azure AI", "Azure Networking", "Azure Storage", and "Azure Security" updates specifically for ${quarterLabel}.
    For each Azure update, find the EXACT DEEP LINK to the azure.microsoft.com announcement page.
    Combine these with the M365 context provided above to reach a total of 50 items.
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
      .map(chunk => {
        return {
          title: chunk.web?.title || "Microsoft Source",
          uri: sanitizeUrl(chunk.web?.uri)
        };
      });

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

  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const quarterLabel = `Q${currentQuarter} ${now.getFullYear()}`;

  const prompt = `
    M365 CONTEXT (Use IDs for Roadmap URLs):
    ${m365Context}

    Generate the Cloud Intelligence Digest based on this context and your knowledge of Azure updates for ${quarterLabel}.
    Include exactly 50 updates in total, focusing on high-impact new features.
    Ensure every M365 update uses the Roadmap URL with the correct ID.
  `;

  try {
    const response = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
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

    // Sanitize sources if AI returned any in the future (currently hardcoded but good practice)
    const sources = (parsedResponse.sources || []).map((s: any) => {
      return {
        title: s.title || "Microsoft Source",
        uri: sanitizeUrl(s.uri)
      };
    });

    return {
      timestamp: new Date().toISOString(),
      executiveSummary: parsedResponse.executiveSummary || "Summary of recent cloud service updates.",
      keyUpdates: (parsedResponse.keyUpdates || []).map((u: any, i: number) => ({
        ...u,
        id: `groq-${i}-${Date.now()}`
      })),
      sources: sources.length > 0 ? sources : [{ title: "M365 Official Roadmap", uri: "https://www.microsoft.com/microsoft-365/roadmap" }]
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
