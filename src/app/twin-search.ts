import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Repository } from './models';
import { RepoService } from './repo.service';
import { RepoCard } from './repo-card';

@Component({
  selector: 'twin-search',
  imports: [FormsModule, RepoCard],
  template: `
    <section>
      <h2>Twin repository</h2>
      <p class="sub">Past a README, a title or topics : we find equivalents repos (and maintained alternatives).</p>
      <div class="box">
        <textarea [(ngModel)]="query" rows="3" placeholder="ex : A lightweight Kubernetes operator to deploy ML models…"></textarea>
        <button (click)="search()" [disabled]="!query.trim() || loading()">{{ loading() ? 'Search ...' : 'Find twins' }}</button>
      </div>
      @if (results().length) {
        <div class="grid">@for (r of results(); track r.id) { <repo-card [repo]="r" (open)="select.emit($event)" /> }</div>
      }
    </section>`,
  styles: `
    section{margin:2.5rem 0}.sub{color:var(--muted);font-size:.9rem;margin:0 0 .8rem}
    .box{display:flex;gap:.8rem;align-items:stretch;flex-wrap:wrap}
    textarea{flex:1;min-width:260px;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:10px;padding:.8rem;font:inherit;resize:vertical}
    button{background:var(--accent);color:#fff;border:0;border-radius:10px;padding:0 1.4rem;font-weight:600}button:disabled{opacity:.5}
    .grid{display:flex;flex-wrap:wrap;gap:1rem;margin-top:1.4rem}`,
})
export class TwinSearch {
  private api = inject(RepoService);
  query = '';
  loading = signal(false);
  results = signal<Repository[]>([]);
  select = output<Repository>();
  search() {
    this.loading.set(true);
    this.api.findTwins(this.query).subscribe(r => { this.results.set(r); this.loading.set(false); });
  }
}
