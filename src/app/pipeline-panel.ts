import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PipelineJob, PipelineRun, PipelineState } from './models';

// Détail du pipeline GitHub Actions d'un repo : dernier run, étapes (jobs) et historique.
// Repliable : l'en-tête résume l'état du dernier run, le détail se déplie à la demande.
@Component({
  selector: 'app-pipeline-panel',
  imports: [DatePipe],
  template: `
    <details class="ops-panel" [open]="open()">
      <summary>
        <span class="ops-panel-title">{{ label() }} <small>{{ repo() }}</small></span>
        @if (last(); as r) {
          <span [class]="'ops-badge ' + runState(r)">{{ runLabel(r) }}</span>
        } @else if (state().state === 'checking') {
          <span class="ops-badge checking">Loading…</span>
        } @else if (state().data) {
          <span class="ops-badge">No run</span>
        } @else {
          <span class="ops-badge down">Unavailable</span>
        }
      </summary>

      <div class="ops-panel-body">
        @if (state().state === 'checking') {
          <p class="ops-empty">Loading GitHub Actions runs…</p>
        } @else if (state().data; as d) {
          @if (state().message; as m) { <p class="ops-notice">{{ m }} Showing cached data from {{ d.fetchedAt | date: 'HH:mm:ss' }}.</p> }
          @if (d.runs.length === 0) {
            <p class="ops-empty">No workflow run found for {{ repo() }}.</p>
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
                  <div class="hint">{{ repo() }}</div>
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
          }
        } @else {
          <p class="ops-notice">{{ state().message }}</p>
        }
      </div>
    </details>`,
})
export class PipelinePanel {
  repo = input.required<string>();
  label = input.required<string>();
  state = input.required<PipelineState>();
  open = input(false);

  last = computed(() => this.state().data?.runs[0] ?? null);
  successRate = computed(() => {
    const runs = (this.state().data?.runs ?? []).filter(r => r.status === 'completed');
    return runs.length ? `${Math.round(100 * runs.filter(r => r.conclusion === 'success').length / runs.length)} %` : '—';
  });

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
}
