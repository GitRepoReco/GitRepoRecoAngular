import { Component } from '@angular/core';

@Component({
  selector: 'app-monitoring',
  template: `
    <section class="ops-page">
      <div class="ops-head">
        <div>
          <h1>Monitoring</h1>
          <p class="ops-sub">MLOps view: deployed models, environments, data drift and retraining.</p>
        </div>
      </div>

      <p class="ops-notice">No model is deployed yet: this page will be populated once the MLOps pipeline is connected.</p>

      <div class="ops-section">
        <h2>Models</h2>
        <div class="ops-card">
          <div class="ops-scroll">
            <table class="ops-table">
              <thead><tr><th>Model</th><th>Version</th><th>Status</th><th>Environment</th><th>Last trained</th></tr></thead>
              <tbody><tr><td colspan="5" class="ops-empty">No model registered.</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="ops-section">
        <h2>Environments</h2>
        <div class="ops-grid">
          @for (e of environments; track e) {
            <div class="ops-card">
              <div class="ops-card-head"><div class="ops-card-title">{{ e }}</div><span class="ops-badge">No deployment</span></div>
              <div class="ops-card-meta">No model version deployed.</div>
            </div>
          }
        </div>
      </div>

      <div class="ops-section">
        <h2>Data drift &amp; alerts</h2>
        <div class="ops-card">
          <div class="ops-tiles">
            <div class="ops-tile idle"><div class="label">Drift score</div><div class="value">—</div><div class="hint">No analysis yet</div></div>
            <div class="ops-tile idle"><div class="label">Last analysis</div><div class="value">—</div><div class="hint">Never run</div></div>
            <div class="ops-tile idle"><div class="label">Open alerts</div><div class="value">—</div><div class="hint">No data</div></div>
          </div>
        </div>
      </div>

      <div class="ops-section">
        <h2>Actions</h2>
        <div class="ops-card">
          <div class="ops-actions">
            <button class="ops-btn" disabled title="Pipeline not connected yet">Retrain model</button>
            <button class="ops-btn ghost" disabled title="Pipeline not connected yet">Run analysis</button>
            <small>Available once the training / analysis pipeline can be triggered.</small>
          </div>
        </div>
      </div>
    </section>`,
})
export class Monitoring {
  // À adapter aux environnements réels du pipeline.
  environments = ['Development', 'Staging', 'Production'];
}
