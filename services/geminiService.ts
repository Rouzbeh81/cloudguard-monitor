
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { CloudUpdate, SummaryReport } from "../types";

const MODEL_NAME = 'gemini-3-flash-preview';
const MAX_RETRIES = 2;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchCloudUpdates = async (retryCount = 0): Promise<SummaryReport> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Use a query that's broad enough to always get results but focused enough for the tool
  const searchPrompt = "official recent updates and roadmap announcements for Microsoft Azure and Microsoft 365 from the last 7 days";
  
  const systemInstruction = `
    You are a professional Cloud Architect. 
    1. Search for the latest official updates from Azure (azure.microsoft.com/en-us/updates/) and Microsoft 365 Roadmap.
    2. Start with a short "Executive Summary" paragraph (2-3 sentences).
    3. Then, provide a list of at least 6-8 specific updates.
    4. Each update MUST follow this EXACT format:
       [Category]: Title - Status - Description
       Example:
       [Azure]: New Firewall Features - General Availability - Microsoft announced new capabilities for Azure Firewall today...
    5. Categories MUST be one of: Azure, M365, or Security.
    6. Status MUST be one of: General Availability, Public Preview, or Development.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: searchPrompt,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
        temperature: 0.2, 
      },
    });

    const text = response.text || "";
    if (!text) throw new Error("Empty response from intelligence service.");

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter(chunk => chunk.web)
      .map(chunk => ({
        title: chunk.web?.title || "Microsoft Source",
        uri: chunk.web?.uri || "#"
      }));

    const keyUpdates = parseUpdatesFromText(text);
    
    // If parsing failed to find structured items, we try a fallback more aggressive parse
    const finalUpdates = keyUpdates.length > 0 ? keyUpdates : createFallbackUpdates(text);

    return {
      timestamp: new Date().toISOString(),
      executiveSummary: extractExecutiveSummary(text),
      keyUpdates: finalUpdates,
      sources: sources
    };
  } catch (error: any) {
    console.error(`Sync Attempt ${retryCount + 1} failed:`, error);
    
    if (retryCount < MAX_RETRIES && (error.status === 500 || error.message?.includes('500') || error.message?.includes('INTERNAL'))) {
      await sleep(1000 * (retryCount + 1));
      return fetchCloudUpdates(retryCount + 1);
    }
    
    throw new Error(error.message || "Cloud feed synchronization failed. Please check your connection.");
  }
};

const extractExecutiveSummary = (text: string): string => {
  const sections = text.split(/\n+/).filter(s => s.trim().length > 30);
  // Look for the first section that isn't a list item
  const summary = sections.find(s => !s.trim().startsWith('[') && !s.trim().match(/^\d+\./) && !s.trim().startsWith('*'));
  return summary ? summary.trim() : "Digest of recent infrastructure and productivity service updates from Microsoft.";
};

const parseUpdatesFromText = (text: string): CloudUpdate[] => {
  const updates: CloudUpdate[] = [];
  const lines = text.split('\n');
  
  for (let line of lines) {
    line = line.trim();
    // Look for the bracketed category pattern: [Category]: Title - Status - Description
    const match = line.match(/^\[?(Azure|M365|Security)\]?:\s*(.*?)\s*-\s*(General Availability|Public Preview|Development|Retired)?\s*-\s*(.*)/i);
    
    if (match) {
      updates.push({
        id: `upd-${updates.length}-${Date.now()}`,
        category: match[1] as any,
        title: match[2].trim(),
        status: (match[3] || 'General Availability') as any,
        description: match[4].trim(),
        date: new Date().toLocaleDateString(),
        url: '#'
      });
    } else {
      // Secondary fallback per-line parser for more relaxed formats
      const relaxedMatch = line.match(/^[\*\-\d\.]*\s*\*\*?(Azure|M365|Security)\*\*?:\s*(.*)/i);
      if (relaxedMatch) {
        updates.push({
          id: `upd-rel-${updates.length}`,
          category: relaxedMatch[1] as any,
          title: relaxedMatch[2].split('-')[0].trim(),
          status: 'General Availability',
          description: relaxedMatch[2].includes('-') ? relaxedMatch[2].split('-').slice(1).join('-').trim() : relaxedMatch[2].trim(),
          date: new Date().toLocaleDateString(),
          url: '#'
        });
      }
    }
  }
  return updates;
};

const createFallbackUpdates = (text: string): CloudUpdate[] => {
  // If structured parsing fails, split by bullet points and try to extract anything
  const bullets = text.split(/\n[\*\-\•]|\n\d+\./).filter(b => b.trim().length > 20);
  return bullets.slice(0, 6).map((b, i) => {
    const clean = b.replace(/\*\*+/g, '').trim();
    return {
      id: `fallback-${i}`,
      category: clean.toLowerCase().includes('azure') ? 'Azure' : clean.toLowerCase().includes('security') ? 'Security' : 'M365',
      title: clean.split('\n')[0].substring(0, 60),
      status: clean.toLowerCase().includes('preview') ? 'Public Preview' : 'General Availability',
      description: clean.split('\n').slice(1).join(' ').trim() || clean,
      date: new Date().toLocaleDateString(),
      url: '#'
    };
  });
};
