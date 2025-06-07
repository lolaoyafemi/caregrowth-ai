
export interface GeneratedSection {
  hook: string;
  body: string;
  cta: string;
}

export interface GeneratedContent {
  facebook: GeneratedSection;
  twitter: GeneratedSection;
  linkedin: GeneratedSection;
  instagram: GeneratedSection;
}

export interface PostHistoryItem {
  id: string;
  content: string;
  prompt_category: string;
  tone: string;
  platform: string;
  created_at: string;
}

export interface SavedPost {
  id: number;
  platform: string;
  audience: string;
  content: string;
  date: string;
}
