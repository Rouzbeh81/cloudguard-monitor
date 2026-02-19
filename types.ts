
export interface CloudUpdate {
  id: string;
  title: string;
  category: 'Azure' | 'M365' | 'Security';
  date: string;
  description: string;
  url: string;
  subcategory: string;
  status: 'General Availability' | 'Public Preview' | 'Development' | 'Retired';
}

export interface SummaryReport {
  timestamp: string;
  executiveSummary: string;
  keyUpdates: CloudUpdate[];
  sources: { title: string; uri: string }[];
}

export interface AppState {
  updates: CloudUpdate[];
  loading: boolean;
  error: string | null;
  report: SummaryReport | null;
}
