// Miroir de la table github.repositories (snake_case, comme renvoyé par la future API)
export interface Repository {
  id: string; name: string; full_name: string; description: string | null;
  url: string; homepage_url?: string | null; open_graph_image_url?: string | null;
  stars: number; forks: number; disk_usage_kb?: number; visibility?: string;
  is_archived?: boolean; is_fork?: boolean; language: string | null; language_color: string | null;
  default_branch?: string; owner_login: string; owner_avatar_url?: string | null;
  license_name?: string | null; topics: string[]; languages?: Record<string, number> | { name: string; color?: string | null }[];
  total_releases?: number; total_issues_open?: number; total_prs_open?: number; total_watchers?: number;
  created_at?: string; pushed_at?: string; last_commit_date?: string;
  score?: number; // similarité (0-1) pour les repos jumeaux
}
export interface QuizOption { label: string; tag: string }
export interface QuizQuestion { question: string; options: QuizOption[] }
export interface QuizResult { title: string; blurb: string; repos: Repository[] }

// --- Pages Dashboard / Monitoring ---
export type CheckState = 'checking' | 'up' | 'down';
// Résultat d'un appel GET /health
export interface HealthCheck { state: CheckState; latencyMs: number | null; checkedAt: Date | null; detail: string | null }
// Résultat d'un appel GET /version
export interface VersionInfo { state: 'checking' | 'ok' | 'error'; value: string | null }
