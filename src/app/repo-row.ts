import { Component, ElementRef, input, output, viewChild } from '@angular/core';
import { Repository } from './models';
import { RepoCard } from './repo-card';

@Component({
  selector: 'repo-row',
  imports: [RepoCard],
  template: `
    <section>
      <h2>{{ title() }}</h2><p class="sub">{{ subtitle() }}</p>
      <div class="wrap">
        <button class="nav l" (click)="scroll(-1)" aria-label="Précédent">‹</button>
        <div class="track" #track>
          @for (r of repos(); track r.id) { <repo-card [repo]="r" (open)="select.emit($event)" /> }
        </div>
        <button class="nav r" (click)="scroll(1)" aria-label="Suivant">›</button>
      </div>
    </section>`,
  styles: `
    section{margin:1.8rem 0}.sub{margin:0 0 .8rem;color:var(--muted);font-size:.9rem}
    .wrap{position:relative}
    .track{display:flex;gap:1rem;overflow-x:auto;scroll-behavior:smooth;padding:.8rem .2rem 1.2rem;scrollbar-width:none}
    .track::-webkit-scrollbar{display:none}
    .nav{position:absolute;top:0;bottom:0;width:44px;border:0;background:linear-gradient(90deg,var(--bg),transparent);color:var(--text);font-size:2rem;z-index:3;opacity:0;transition:opacity .2s}
    .nav.r{right:0;background:linear-gradient(-90deg,var(--bg),transparent)}.nav.l{left:0}
    .wrap:hover .nav{opacity:1}`,
})
export class RepoRow {
  title = input.required<string>();
  subtitle = input('');
  repos = input.required<Repository[]>();
  select = output<Repository>();
  private track = viewChild.required<ElementRef<HTMLElement>>('track');
  scroll(dir: number) { this.track().nativeElement.scrollBy({ left: dir * 480 }); }
}
