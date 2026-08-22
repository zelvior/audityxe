export type Tone = "constructive" | "brutal";

export type CategoryKey =
  | "messaging"
  | "uiux"
  | "cro"
  | "seo"
  | "brand"
  | "security";

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

export interface BannerDesign {
  headline: string;
  tagline: string;
  accentWord: string;
  layout: "centered-badge" | "left-stacked";
}

export interface AuditModuleFinding {
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

export interface AuditModule {
  id: string;
  label: string;
  status: "good" | "warning" | "critical";
  score: number;
  summary: string;
  findings: AuditModuleFinding[];
}

export interface AuditResult {
  url: string;
  overall: number;
  verdict: { constructive: string; brutal: string };
  categories: CategoryScore[];
  fixes: FixItem[];
  xPost: string;
  linkedinPost: string;
  banner: BannerDesign;
  modules: AuditModule[];
  _usage?: { used: number; limit: number; remaining: number; plan: string };
  _reportId?: string | null;
  competitor?: {
    url: string;
    overall: number;
    categories: CategoryScore[];
    summary: string[];
  };
}
