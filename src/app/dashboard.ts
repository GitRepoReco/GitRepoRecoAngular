import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { API_BASE_URL, PIPELINES } from './api.config';
import { CollectorStatus, DatabaseStatus, HealthCheck, PipelineState, VersionInfo } from './models';
import { PipelinePanel } from './pipeline-panel';
import { StatusService } from './status.service';

const REFRESH_MS = 30_000;

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, PipelinePanel],
  template: `
    <section class="ops-page">
      <div class="ops-head">
        <div>
          <h1>Dashboard</h1>
          <p class="ops-sub">DevOps view: components status and CI/CD pipelines.</p>
        </div>
        <div class="ops-actions">
          @if (health().checkedAt; as t) { <small>Last check {{ t | date: 'HH:mm:ss' }} · auto-refresh every 30 s</small> }
          <button class="ops-btn" (click)="refresh(true)" [disabled]="loading()">{{ loading() ? 'Checking…' : 'Refresh' }}</button>
        </div>
      </div>

      <div class="ops-section">
        <h2>Components</h2>
        <div class="ops-stack">
        <div class="ops-card">
          <div class="ops-card-head"><div class="ops-card-title">Frontend</div><span class="ops-badge up">Operational</span></div>
          <div class="ops-card-meta">Angular app · you are looking at it.</div>
        </div>
        <div class="ops-card">
          <div class="ops-card-head">
            <div>
              <div class="ops-card-title">API</div>
              <div class="ops-card-meta">GitRepoReco API · {{ apiUrl }}</div>
            </div>
            <span [class]="'ops-badge ' + health().state">{{ statusLabel() }}</span>
          </div>
          <div class="ops-tiles">
            <div class="ops-tile">
              <div class="label">Healthcheck</div>
              <div class="value">{{ health().state === 'checking' ? '…' : health().state === 'up' ? 'Healthy' : 'Failing' }}</div>
              <div class="hint">GET /health @if (health().detail) { · {{ health().detail }} }</div>
            </div>
            <div class="ops-tile">
              <div class="label">Version</div>
              <div class="value">{{ version().state === 'ok' ? version().value : version().state === 'checking' ? '…' : 'Unavailable' }}</div>
              <div class="hint">GET /version</div>
            </div>
            <div class="ops-tile">
              <div class="label">Response time</div>
              <div class="value">{{ health().latencyMs !== null ? health().latencyMs + ' ms' : '—' }}</div>
              <div class="hint">Round trip of the last healthcheck</div>
            </div>
            <div class="ops-tile" [class.idle]="!health().uptime">
              <div class="label">Uptime</div>
              <div class="value">{{ health().uptime ?? '—' }}</div>
              <div class="hint">{{ health().uptime ? 'Reported by /health' : 'Reported as unknown by /health' }}</div>
            </div>
          </div>
        </div>
        <div class="ops-card">
          <div class="ops-card-head">
            <div>
              <div class="ops-card-title">Database</div>
              <div class="ops-card-meta">{{ dbVersion() }} · via /monitoring/*</div>
            </div>
            <span [class]="'ops-badge ' + db().state">{{ db().state === 'checking' ? 'Checking…' : db().state === 'up' ? 'Operational' : 'Down' }}</span>
          </div>
          @if (db().state === 'down') {
            <p class="ops-notice">The API did not return the database status (GET /monitoring/general failed).</p>
          } @else if (db().state === 'up') {
            <div class="ops-tiles">
              @if (db().general; as g) {
                <div class="ops-tile">
                  <div class="label">Uptime</div>
                  <div class="value">{{ g.uptime }}</div>
                  <div class="hint">Since {{ g.start_time | date: 'dd/MM HH:mm' }}</div>
                </div>
                <div class="ops-tile">
                  <div class="label">Connections</div>
                  <div class="value">{{ g.active_connections }} / {{ g.max_connections }}</div>
                  <div class="hint">{{ g.total_connections }} total</div>
                </div>
              }
              <div class="ops-tile">
                <div class="label">Response time</div>
                <div class="value">{{ db().latencyMs }} ms</div>
                <div class="hint">GET /monitoring/general</div>
              </div>
              @if (largestDb(); as l) {
                <div class="ops-tile">
                  <div class="label">Size</div>
                  <div class="value">{{ l.size }}</div>
                  <div class="hint">{{ l.database }}{{ dbCount() > 1 ? ' · ' + dbCount() + ' databases' : '' }}</div>
                </div>
              }
              @if (db().cache; as c) {
                <div class="ops-tile">
                  <div class="label">Cache hit ratio</div>
                  <div class="value">{{ c.cache_hit_ratio }} %</div>
                  <div class="hint">Buffer cache, global</div>
                </div>
              }
              @if (db().activeQueries !== null) {
                <div class="ops-tile">
                  <div class="label">Active queries</div>
                  <div class="value">{{ db().activeQueries }}</div>
                  <div class="hint">Running right now</div>
                </div>
              }
              @if (repoCount() !== null) {
                <div class="ops-tile">
                  <div class="label">Repositories</div>
                  <div class="value">{{ repoCount() }}</div>
                  <div class="hint">github.repositories · estimated</div>
                </div>
              }
              @if (readmeCount() !== null) {
                <div class="ops-tile">
                  <div class="label">READMEs</div>
                  <div class="value">{{ readmeCount() }}</div>
                  <div class="hint">github.readmes · estimated</div>
                </div>
              }
              @if (db().schemas; as sc) {
                <div class="ops-tile">
                  <div class="label">Schemas</div>
                  <div class="value">{{ sc.length }}</div>
                  <div class="hint">{{ schemaList() }}</div>
                </div>
              }
            </div>
            @if (db().failed.length) { <p class="ops-card-meta">Unavailable: {{ db().failed.join(', ') }}</p> }
          } @else {
            <p class="ops-empty">Checking the database…</p>
          }
        </div>
        <div class="ops-card">
          <div class="ops-card-head">
            <div>
              <div class="ops-card-title">Collector</div>
              <div class="ops-card-meta">Fetches repositories and READMEs from GitHub · via /monitoring/rate-limit/latest</div>
            </div>
            <span [class]="'ops-badge ' + collector().state">{{ collector().state === 'checking' ? 'Checking…' : collector().state === 'up' ? 'Operational' : 'Down' }}</span>
          </div>
          @if (collector().state === 'down') {
            <p class="ops-notice">The API did not return the collector status (GET /monitoring/rate-limit/latest failed).</p>
          } @else {
            <div class="ops-tiles">
              <div class="ops-tile">
                <div class="label">Healthcheck</div>
                <div class="value">{{ collector().state === 'up' ? 'Healthy' : '…' }}</div>
                <div class="hint">Collector data returned by the API</div>
              </div>
              <div class="ops-tile">
                <div class="label">Tokens remaining</div>
                <div class="value">{{ collector().remaining ?? '—' }}@if (collector().limit !== null) { <small> / {{ collector().limit }}</small> }</div>
                <div class="hint">GitHub API quota</div>
              </div>
              <div class="ops-tile">
                <div class="label">Reset at</div>
                <div class="value">{{ collector().resetAt ? (collector().resetAt | date: 'HH:mm:ss') : '—' }}</div>
                <div class="hint">Next quota reset</div>
              </div>
              <div class="ops-tile">
                <div class="label">Operation</div>
                <div class="value">{{ collector().operation ?? '—' }}</div>
                <div class="hint">@if (collector().recordedAt) { Last record {{ collector().recordedAt | date: 'dd/MM HH:mm:ss' }} } @else { Last operation }</div>
              </div>
            </div>
          }
        </div>
        </div>
      </div>

      <div class="ops-section">
        <h2>Pipelines</h2>
        <div class="ops-stack">
          @for (p of pipelines; track p.repo; let first = $first) {
            <app-pipeline-panel [repo]="p.repo" [label]="p.label" [state]="pipeline()[p.repo] ?? pending" [open]="first" />
          }
        </div>
        <small class="ops-card-meta">Source: GitHub Actions API · cached for 15 min (60 requests/hour limit without a token, 2 requests per repository)</small>
      </div>
    </section>`,
})
export class Dashboard {
  private status = inject(StatusService);

  apiUrl = API_BASE_URL;
  pipelines = PIPELINES;
  pending: PipelineState = { state: 'checking', data: null, stale: false, message: null };

  loading = signal(false);
  private dbLoading = false;
  private collectorLoading = false;
  health = signal<HealthCheck>({ state: 'checking', latencyMs: null, checkedAt: null, detail: null, uptime: null });
  db = signal<DatabaseStatus>({ state: 'checking', checkedAt: null, latencyMs: null, general: null, databases: null, schemas: null, cache: null, activeQueries: null, tables: null, failed: [] });
  collector = signal<CollectorStatus>({ state: 'checking', checkedAt: null, remaining: null, limit: null, resetAt: null, operation: null, recordedAt: null });
  // Version courte de PostgreSQL : "PostgreSQL 16.16 (Debian …)" -> "PostgreSQL 16.16"
  dbVersion = computed(() => this.db().general?.version.match(/^PostgreSQL [\d.]+/)?.[0] ?? 'PostgreSQL');
  dbCount = computed(() => this.db().databases?.length ?? 0);
  // "github (4) · monitoring (1)" : nombre de tables par schéma
  schemaList = computed(() => (this.db().schemas ?? []).map(x => `${x.schemaname} (${x.table_count})`).join(' · '));
  largestDb = computed(() => [...(this.db().databases ?? [])].sort((a, b) => b.size_bytes - a.size_bytes)[0] ?? null);
  // Nombre de lignes (estimation PostgreSQL) d'une table du schéma github, null si /monitoring/tables n'a pas répondu
  private rows(table: string): string | null {
    const t = this.db().tables?.find(x => x.schemaname === 'github' && x.table_name === table);
    return t ? t.estimated_rows.toLocaleString('fr-FR') : null;
  }
  repoCount = computed(() => this.rows('repositories'));
  readmeCount = computed(() => this.rows('readmes'));
  version = signal<VersionInfo>({ state: 'checking', value: null });
  // État du pipeline de chaque repo, indexé par "owner/repo"
  pipeline = signal<Partial<Record<string, PipelineState>>>({});
  statusLabel = computed(() => ({ checking: 'Checking…', up: 'Operational', down: 'Down' })[this.health().state]);

  constructor() {
    this.refresh();
    const timer = setInterval(() => this.refresh(), REFRESH_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  // force = clic sur Refresh : le service ne contourne le cache GitHub que s'il a plus de PIPELINE_MIN_REFRESH_MS.
  refresh(force = false) {
    for (const { repo } of this.pipelines) {
      this.status.pipeline(repo, force).subscribe(p => this.pipeline.update(all => ({ ...all, [repo]: p })));
    }
    if (!this.dbLoading) {
      this.dbLoading = true;
      this.status.database().subscribe(d => { this.db.set(d); this.dbLoading = false; });
    }
    if (!this.collectorLoading) {
      this.collectorLoading = true;
      this.status.collector().subscribe(c => { this.collector.set(c); this.collectorLoading = false; });
    }
    if (this.loading()) return;
    this.loading.set(true);
    this.status.health().subscribe(h => { this.health.set(h); this.loading.set(false); });
    this.status.version().subscribe({
      next: value => this.version.set({ state: 'ok', value }),
      error: err => { console.error('API /version :', err); this.version.set({ state: 'error', value: null }); },
    });
  }
}
