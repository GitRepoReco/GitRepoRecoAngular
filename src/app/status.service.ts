import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { API_BASE_URL, GITHUB_API, PIPELINE_REPO, PIPELINE_RUNS_LIMIT, PIPELINE_CACHE_MS, PIPELINE_MIN_REFRESH_MS } from './api.config';
import { HealthCheck, PipelineData, PipelineJob, PipelineRun, PipelineState } from './models';

// Réponses (partielles) de l'API REST GitHub Actions
interface GhRun {
  id: number; name: string | null; display_title?: string; status: string; conclusion: string | null; event: string;
  head_branch: string | null; head_sha: string; html_url: string; run_started_at?: string; created_at: string; updated_at: string;
  actor?: { login: string } | null;
}
interface GhJob { name: string; status: string; conclusion: string | null; started_at: string | null; completed_at: string | null; html_url: string }

const PIPELINE_CACHE_KEY = 'pipeline_runs_v1';
const seconds = (from: string | null | undefined, to: string | null | undefined): number | null =>
  from && to ? Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 1000)) : null;

// Couche d'accès aux endpoints "ops" de l'API (healthcheck, version) pour la page Dashboard.
@Injectable({ providedIn: 'root' })
export class StatusService {
  private http = inject(HttpClient);
  // Après un échec GitHub (rate limit, réseau), on ne réessaie pas avant PIPELINE_CACHE_MS, même via l'auto-refresh de 30 s.
  private pipelineFailure: { at: number; message: string } | null = null;

  // GET /health : l'API est "up" si elle répond en 2xx. Le corps est lu en texte puis interprété
  // au mieux (JSON { status } ou texte court) pour ne pas dépendre de son format exact.
  health(): Observable<HealthCheck> {
    const t0 = performance.now();
    const elapsed = () => Math.round(performance.now() - t0);
    return this.http.get(`${API_BASE_URL}/health`, { observe: 'response', responseType: 'text' }).pipe(
      map(res => ({ state: 'up' as const, latencyMs: elapsed(), checkedAt: new Date(), detail: this.detail(res.body) })),
      catchError(err => of<HealthCheck>({
        state: 'down', latencyMs: null, checkedAt: new Date(),
        detail: err?.status ? `HTTP ${err.status}` : 'Unreachable',
      })),
    );
  }

  // GET /version : { "version": "v1.3" }
  version(): Observable<string> {
    return this.http.get<{ version: string }>(`${API_BASE_URL}/version`).pipe(map(res => res.version));
  }

  // GitHub Actions : derniers runs du repo + jobs du dernier run (2 requêtes). Sans token (repo public, 60 req/h/IP) :
  // résultat mis en cache dans localStorage pendant PIPELINE_CACHE_MS ; en cas d'erreur (rate limit, réseau), on retombe sur le dernier cache.
  pipeline(force = false): Observable<PipelineState> {
    const cached = this.readPipelineCache();
    const age = cached ? Date.now() - cached.fetchedAt : Infinity;
    if (cached && age < (force ? PIPELINE_MIN_REFRESH_MS : PIPELINE_CACHE_MS)) return of(this.ok(cached, false, null));

    const fail = this.pipelineFailure;
    if (fail && Date.now() - fail.at < PIPELINE_CACHE_MS && !force) return of(this.failed(cached, fail.message));

    const base = `${GITHUB_API}/repos/${PIPELINE_REPO}/actions`;
    return this.http.get<{ workflow_runs: GhRun[] }>(`${base}/runs`, { params: { per_page: PIPELINE_RUNS_LIMIT } }).pipe(
      switchMap(res => {
        const runs = (res.workflow_runs ?? []).map((r): PipelineRun => ({
          id: r.id, name: r.name ?? 'Workflow', title: r.display_title ?? r.name ?? '', status: r.status, conclusion: r.conclusion,
          event: r.event, branch: r.head_branch ?? '—', sha: r.head_sha, url: r.html_url, actor: r.actor?.login ?? null,
          startedAt: r.run_started_at ?? r.created_at,
          durationSec: r.status === 'completed' ? seconds(r.run_started_at ?? r.created_at, r.updated_at) : null,
        }));
        if (!runs.length) return of<PipelineData>({ runs, jobs: [], fetchedAt: Date.now() });
        return this.http.get<{ jobs: GhJob[] }>(`${base}/runs/${runs[0].id}/jobs`).pipe(
          map(j => (j.jobs ?? []).map((x): PipelineJob => ({
            name: x.name, status: x.status, conclusion: x.conclusion, url: x.html_url,
            durationSec: x.status === 'completed' ? seconds(x.started_at, x.completed_at) : null,
          }))),
          catchError(err => { console.error('GitHub jobs :', err); return of([] as PipelineJob[]); }),
          map((jobs): PipelineData => ({ runs, jobs, fetchedAt: Date.now() })),
        );
      }),
      map(data => { this.pipelineFailure = null; this.writePipelineCache(data); return this.ok(data, false, null); }),
      catchError(err => {
        console.error('GitHub Actions :', err);
        const message = this.githubError(err);
        this.pipelineFailure = { at: Date.now(), message };
        return of(this.failed(cached, message));
      }),
    );
  }

  private ok(data: PipelineData, stale: boolean, message: string | null): PipelineState { return { state: 'ok', data, stale, message }; }

  private failed(cached: PipelineData | null, message: string): PipelineState {
    return cached ? { state: 'ok', data: cached, stale: true, message } : { state: 'error', data: null, stale: false, message };
  }

  private githubError(err: any): string {
    if (err?.status === 403 || err?.status === 429) {
      const reset = Number(err.headers?.get?.('x-ratelimit-reset'));
      const at = reset ? ` Resets at ${new Date(reset * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.` : '';
      return `GitHub rate limit reached (60 requests/hour without a token).${at}`;
    }
    return err?.status ? `GitHub API error (HTTP ${err.status}).` : 'GitHub API unreachable.';
  }

  private readPipelineCache(): PipelineData | null {
    try {
      const raw = localStorage.getItem(PIPELINE_CACHE_KEY);
      return raw ? (JSON.parse(raw) as PipelineData) : null;
    } catch { return null; }
  }
  private writePipelineCache(data: PipelineData) {
    try { localStorage.setItem(PIPELINE_CACHE_KEY, JSON.stringify(data)); } catch { /* quota / mode privé */ }
  }

  private detail(body: string | null): string | null {
    const text = (body ?? '').trim();
    if (!text) return null;
    try {
      const json = JSON.parse(text);
      if (typeof json === 'string') return json;
      if (json && typeof json.status === 'string') return json.status;
      return null;
    } catch {
      return text.length <= 60 ? text : null;
    }
  }
}
