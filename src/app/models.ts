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
export interface HealthCheck { state: CheckState; latencyMs: number | null; checkedAt: Date | null; detail: string | null; uptime: string | null }
// Résultat d'un appel GET /version
export interface VersionInfo { state: 'checking' | 'ok' | 'error'; value: string | null }

// Pipelines CI/CD : runs GitHub Actions (GET /repos/{repo}/actions/runs) et jobs du dernier run, un état par repo
export interface PipelineRun {
  id: number; name: string; title: string; status: string; conclusion: string | null;
  event: string; branch: string; sha: string; url: string; actor: string | null;
  startedAt: string; durationSec: number | null;
}
export interface PipelineJob { name: string; status: string; conclusion: string | null; durationSec: number | null; url: string }
export interface PipelineData { runs: PipelineRun[]; jobs: PipelineJob[]; fetchedAt: number }
export interface PipelineState { state: 'checking' | 'ok' | 'error'; data: PipelineData | null; stale: boolean; message: string | null }

// Base de données : endpoints /monitoring/* de l'API (instance PostgreSQL)
export interface DbGeneral { version: string; start_time: string; uptime: string; max_connections: number; active_connections: number; total_connections: number }
export interface DbSize { database: string; size_bytes: number; size: string }
export interface DbSchema { schemaname: string; table_count: number }
export interface DbTable { schemaname: string; table_name: string; estimated_rows: number; total_size_bytes: number }
export interface DbCache { cache_hits: number; disk_reads: number; cache_hit_ratio: number }
export interface DatabaseStatus {
  state: CheckState; checkedAt: Date | null; latencyMs: number | null;
  general: DbGeneral | null; databases: DbSize[] | null; schemas: DbSchema[] | null; tables: DbTable[] | null; cache: DbCache | null;
  activeQueries: number | null;
  failed: string[]; // endpoints /monitoring/* qui n'ont pas répondu
}

// Collecteur : GET /monitoring/rate-limit/latest (dernier relevé du quota de l'API GitHub, horodatages en UTC sans suffixe "Z")
export interface RateLimit {
  id: number; timestamp: string; limit_value: number; remaining: number; used: number; cost: number;
  reset_at: string; operation_name: string;
}
export interface CollectorStatus {
  state: CheckState; checkedAt: Date | null;
  remaining: number | null; limit: number | null; resetAt: Date | null; operation: string | null; recordedAt: Date | null;
}
