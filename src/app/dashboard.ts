import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { API_BASE_URL, PIPELINE_REPO } from './api.config';
import { DatabaseStatus, HealthCheck, PipelineJob, PipelineRun, PipelineState, VersionInfo } from './models';
import { StatusService } from './status.service';

const REFRESH_MS = 30_000;

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe],
  template: `
    <section class="ops-page">
      <div class="ops-head">
        <div>
          <h1>Dashboard</h1>
          <p class="ops-sub">DevOps view: pipeline status, components and APIs.</p>
        </div>
        <div class="ops-actions">
          @if (health().checkedAt; as t) { <small>Last check {{ t | date: 'HH:mm:ss' }} · auto-refresh every 30 s</small> }
          <button class="ops-btn" (click)="refresh(true)" [disabled]="loading()">{{ loading() ? 'Checking…' : 'Refresh' }}</button>
        </div>
      </div>

      <div class="ops-section">
        <h2>APIs</h2>
        <div class="ops-card">
          <div class="ops-card-head">
            <div>
              <div class="ops-card-title">GitRepoReco API</div>
              <div class="ops-card-meta">{{ apiUrl }}</div>
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
      </div>

      <div class="ops-section">
        <h2>Pipeline</h2>
        @if (pipeline().state === 'checking') {
          <p class="ops-empty">Loading GitHub Actions runs…</p>
        } @else if (pipeline().data; as d) {
          @if (pipeline().message; as m) { <p class="ops-notice">{{ m }} Showing cached data from {{ d.fetchedAt | date: 'HH:mm:ss' }}.</p> }
          @if (d.runs.length === 0) {
            <p class="ops-empty">No workflow run found for {{ repo }}.</p>
          } @else {
            <div class="ops-card">
              <div class="ops-card-head">
                <div>
                  <div class="ops-card-title">{{ d.runs[0].name }} · last run</div>
                  <div class="ops-card-meta"><a [href]="d.runs[0].url" target="_blank" rel="noopener">{{ d.runs[0].title }}</a></div>
                </div>
                <span [class]="'ops-badge ' + runState(d.runs[0])">{{ runLabel(d.runs[0]) }}</span>
              </div>
              <div class="ops-tiles">
                <div class="ops-tile">
                  <div class="label">Branch</div>
                  <div class="value">{{ d.runs[0].branch }}</div>
                  <div class="hint">{{ d.runs[0].sha.slice(0, 7) }} · {{ d.runs[0].event }}</div>
                </div>
                <div class="ops-tile">
                  <div class="label">Duration</div>
                  <div class="value">{{ duration(d.runs[0].durationSec) }}</div>
                  <div class="hint">Started {{ d.runs[0].startedAt | date: 'dd/MM HH:mm' }}</div>
                </div>
                <div class="ops-tile">
                  <div class="label">Success rate</div>
                  <div class="value">{{ successRate() }}</div>
                  <div class="hint">Over the last {{ d.runs.length }} runs</div>
                </div>
                <div class="ops-tile">
                  <div class="label">Triggered by</div>
                  <div class="value">{{ d.runs[0].actor ?? '—' }}</div>
                  <div class="hint">{{ repo }}</div>
                </div>
              </div>
            </div>

            <h3 class="ops-sub-title">Stages of the last run</h3>
            @if (d.jobs.length === 0) {
              <p class="ops-empty">No job details available for this run.</p>
            } @else {
              <div class="ops-grid">
                @for (j of d.jobs; track j.name) {
                  <div class="ops-card">
                    <div class="ops-card-head">
                      <div class="ops-card-title">{{ j.name }}</div>
                      <span [class]="'ops-badge ' + runState(j)">{{ runLabel(j) }}</span>
                    </div>
                    <div class="ops-card-meta">{{ duration(j.durationSec) }} · <a [href]="j.url" target="_blank" rel="noopener">logs</a></div>
                  </div>
                }
              </div>
            }

            <h3 class="ops-sub-title">Recent runs</h3>
            <div class="ops-card">
              <div class="ops-scroll">
                <table class="ops-table">
                  <thead><tr><th>Status</th><th>Run</th><th>Branch</th><th>Event</th><th>Commit</th><th>Duration</th><th>Started</th></tr></thead>
                  <tbody>
                    @for (r of d.runs; track r.id) {
                      <tr>
                        <td><span [class]="'ops-badge ' + runState(r)">{{ runLabel(r) }}</span></td>
                        <td><a [href]="r.url" target="_blank" rel="noopener">{{ r.title }}</a></td>
                        <td>{{ r.branch }}</td>
                        <td>{{ r.event }}</td>
                        <td>{{ r.sha.slice(0, 7) }}</td>
                        <td>{{ duration(r.durationSec) }}</td>
                        <td>{{ r.startedAt | date: 'dd/MM HH:mm' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
            <small class="ops-card-meta">Source: GitHub Actions API · cached for 5 min (60 requests/hour limit without a token)</small>
          }
        } @else {
          <p class="ops-notice">{{ pipeline().message }}</p>
        }
      </div>

      <div class="ops-section">
        <h2>Components</h2>
        <div class="ops-grid">
          <div class="ops-card">
            <div class="ops-card-head"><div class="ops-card-title">Frontend</div><span class="ops-badge up">Operational</span></div>
            <div class="ops-card-meta">Angular app · you are looking at it.</div>
          </div>
          <div class="ops-card">
            <div class="ops-card-head"><div class="ops-card-title">API</div><span [class]="'ops-badge ' + health().state">{{ statusLabel() }}</span></div>
            <div class="ops-card-meta">GitRepoReco API · see the card above for details.</div>
          </div>
        </div>
        <div class="ops-card db-card">
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
          <p class="ops-card-meta">Number of repositories and READMEs: not exposed by the API yet.</p>
        </div>
      </div>
    </section>`,
})
export class Dashboard {
  private status = inject(StatusService);

  apiUrl = API_BASE_URL;
  repo = PIPELINE_REPO;

  loading = signal(false);
  private dbLoading = false;
  health = signal<HealthCheck>({ state: 'checking', latencyMs: null, checkedAt: null, detail: null, uptime: null });
  db = signal<DatabaseStatus>({ state: 'checking', checkedAt: null, latencyMs: null, general: null, databases: null, schemas: null, cache: null, activeQueries: null, failed: [] });
  // Version courte de PostgreSQL : "PostgreSQL 16.16 (Debian …)" -> "PostgreSQL 16.16"
  dbVersion = computed(() => this.db().general?.version.match(/^PostgreSQL [\d.]+/)?.[0] ?? 'PostgreSQL');
  dbCount = computed(() => this.db().databases?.length ?? 0);
  // "github (4) · monitoring (1)" : nombre de tables par schéma
  schemaList = computed(() => (this.db().schemas ?? []).map(x => `${x.schemaname} (${x.table_count})`).join(' · '));
  largestDb = computed(() => [...(this.db().databases ?? [])].sort((a, b) => b.size_bytes - a.size_bytes)[0] ?? null);
  version = signal<VersionInfo>({ state: 'checking', value: null });
  pipeline = signal<PipelineState>({ state: 'checking', data: null, stale: false, message: null });
  successRate = computed(() => {
    const runs = (this.pipeline().data?.runs ?? []).filter(r => r.status === 'completed');
    return runs.length ? `${Math.round(100 * runs.filter(r => r.conclusion === 'success').length / runs.length)} %` : '—';
  });
  statusLabel = computed(() => ({ checking: 'Checking…', up: 'Operational', down: 'Down' })[this.health().state]);

  constructor() {
    this.refresh();
    const timer = setInterval(() => this.refresh(), REFRESH_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  // Couleur du badge d'un run / job GitHub Actions
  runState(x: PipelineRun | PipelineJob): string {
    if (x.status !== 'completed') return 'checking';
    if (x.conclusion === 'success') return 'up';
    return x.conclusion === 'cancelled' || x.conclusion === 'skipped' ? '' : 'down';
  }
  runLabel(x: PipelineRun | PipelineJob): string {
    const l = x.status === 'completed' ? (x.conclusion ?? 'completed') : x.status.replace('_', ' ');
    return l.charAt(0).toUpperCase() + l.slice(1);
  }
  duration(sec: number | null): string {
    if (sec === null) return '—';
    return sec < 60 ? `${sec} s` : `${Math.floor(sec / 60)} min ${String(sec % 60).padStart(2, '0')} s`;
  }

  // force = clic sur Refresh : le service ne contourne le cache GitHub que s'il a plus de 30 s.
  refresh(force = false) {
    this.status.pipeline(force).subscribe(p => this.pipeline.set(p));
    if (!this.dbLoading) {
      this.dbLoading = true;
      this.status.database().subscribe(d => { this.db.set(d); this.dbLoading = false; });
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
