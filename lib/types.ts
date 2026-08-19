export type Tone = "constructive" | "brutal";

export type CategoryKey =
  | "messaging"
  | "uiux"
  | "cro"
  | "seo"
  | "brand";

export interface CategoryScore {
  key: CategoryKey;
  label: string;
  score: number;
}

export interface FixItem {
  id: string;
  category: string;
  target: string;
  problem: { constructive: string; brutal: string };
  fix: string;
  snippet: string;
  language: string;
}

export interface AuditResult {
  url: string;
  overall: number;
  verdict: { constructive: string; brutal: string };
  categories: CategoryScore[];
  fixes: FixItem[];
  xPost: string;
  linkedinPost: string;
  competitor?: {
    url: string;
    overall: number;
    categories: CategoryScore[];
    summary: string[];
  };
}
