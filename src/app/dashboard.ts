import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { API_BASE_URL } from './api.config';
import { HealthCheck, VersionInfo } from './models';
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
          <button class="ops-btn" (click)="refresh()" [disabled]="loading()">{{ loading() ? 'Checking…' : 'Refresh' }}</button>
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
            <div class="ops-tile idle">
              <div class="label">Uptime</div>
              <div class="value">—</div>
              <div class="hint">Not exposed by the API yet</div>
            </div>
          </div>
        </div>
      </div>

      <div class="ops-section">
        <h2>Pipeline</h2>
        <div class="ops-grid">
          @for (s of pipelineStages; track s) {
            <div class="ops-card">
              <div class="ops-card-head"><div class="ops-card-title">{{ s }}</div><span class="ops-badge">Not connected</span></div>
              <div class="ops-card-meta">No data yet.</div>
            </div>
          }
        </div>
      </div>

      <div class="ops-section">
        <h2>Components</h2>
        <div class="ops-grid">
          @for (c of components; track c) {
            <div class="ops-card">
              <div class="ops-card-head"><div class="ops-card-title">{{ c }}</div><span class="ops-badge">Not connected</span></div>
              <div class="ops-card-meta">No data yet.</div>
            </div>
          }
        </div>
      </div>
    </section>`,
})
export class Dashboard {
  private status = inject(StatusService);

  apiUrl = API_BASE_URL;
  // Squelettes : à remplacer par de vrais checks quand les sources de données seront disponibles.
  pipelineStages = ['Build', 'Tests', 'Docker image', 'Deploy'];
  components = ['Frontend', 'API', 'Database', 'Reverse proxy'];

  loading = signal(false);
  health = signal<HealthCheck>({ state: 'checking', latencyMs: null, checkedAt: null, detail: null });
  version = signal<VersionInfo>({ state: 'checking', value: null });
  statusLabel = computed(() => ({ checking: 'Checking…', up: 'Operational', down: 'Down' })[this.health().state]);

  constructor() {
    this.refresh();
    const timer = setInterval(() => this.refresh(), REFRESH_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  refresh() {
    if (this.loading()) return;
    this.loading.set(true);
    this.status.health().subscribe(h => { this.health.set(h); this.loading.set(false); });
    this.status.version().subscribe({
      next: value => this.version.set({ state: 'ok', value }),
      error: err => { console.error('API /version :', err); this.version.set({ state: 'error', value: null }); },
    });
  }
}
