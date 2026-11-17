import { Component, input, output } from '@angular/core';
import { Repository } from './models';

@Component({
  selector: 'repo-card',
  template: `
    @let r = repo();
    <article class="card" (click)="open.emit(r)" tabindex="0" (keydown.enter)="open.emit(r)">
      <div class="cover" [style.background]="'linear-gradient(135deg,' + (r.language_color ?? '#667') + ',#0b0d12)'">
        @if (r.owner_avatar_url) { <img class="avatar" [src]="r.owner_avatar_url" [alt]="r.owner_login" loading="lazy" referrerpolicy="no-referrer"> }
        @else { <span class="initial">{{ r.name[0].toUpperCase() }}</span> }
        @if (r.score) { <span class="badge">{{ (r.score * 100).toFixed(0) }}% match</span> }
        @if (r.is_archived) { <span class="badge warn">Abandonné</span> }
      </div>
      <div class="body">
        <strong>{{ r.name }}</strong>
        <small>{{ r.owner_login }}</small>
        <p>{{ r.description }}</p>
        <div class="meta"><span>⭐ {{ fmt(r.stars) }}</span><span>🍴 {{ fmt(r.forks) }}</span><span>{{ r.language }}</span></div>
      </div>
    </article>`,
  styles: `
    .card{width:220px;flex:none;background:var(--surface);border-radius:10px;overflow:hidden;cursor:pointer;border:1px solid var(--border);transition:transform .2s,box-shadow .2s;outline:none}
    .card:hover,.card:focus-visible{transform:scale(1.07);box-shadow:var(--shadow);z-index:2;position:relative}
    .cover{height:110px;display:flex;align-items:center;justify-content:center;position:relative}
    .avatar{width:84px;height:84px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,.85);box-shadow:0 4px 14px rgba(0,0,0,.4)}
    .initial{font-size:3rem;font-weight:800;color:#fff;opacity:.85}
    .badge{position:absolute;top:8px;right:8px;background:#1db954;color:#fff;font-size:.7rem;padding:2px 8px;border-radius:99px}
    .badge.warn{background:#d9822b;left:8px;right:auto}
    .body{padding:.7rem .8rem}.body small{display:block;color:var(--muted)}
    p{font-size:.8rem;color:var(--muted);margin:.4rem 0;height:3.2em;overflow:hidden}
    .meta{display:flex;gap:.6rem;font-size:.75rem;color:var(--muted)}`,
})
export class RepoCard {
  repo = input.required<Repository>();
  open = output<Repository>();
  fmt(n: number) { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n); }
}
