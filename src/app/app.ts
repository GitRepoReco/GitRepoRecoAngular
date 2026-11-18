import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { forkJoin, catchError, of, filter, map } from 'rxjs';
import { Repository } from './models';
import { RepoService } from './repo.service';
import { RepoRow } from './repo-row';
import { TwinSearch } from './twin-search';
import { Quiz } from './quiz';

interface Row { title: string; subtitle: string; repos: Repository[] }

@Component({ selector: 'app-root', imports: [RepoRow, TwinSearch, Quiz, RouterLink, RouterLinkActive, RouterOutlet], templateUrl: './app.html', styleUrl: './app.scss' })
export class App {
  private api = inject(RepoService);
  private router = inject(Router);
  // URL courante (null tant que la navigation initiale n'est pas terminée) : la page principale n'est affichée que sur "/".
  private url = toSignal(
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), map((e): string | null => e.urlAfterRedirects)),
    { initialValue: null });
  onHome = computed(() => { const u = this.url(); return u !== null && u.split(/[?#]/)[0] === '/'; });
  theme = signal<'dark' | 'light'>(
    (localStorage.getItem('theme') as 'dark' | 'light') ?? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
  rows = signal<Row[]>([]);
  selected = signal<Repository | null>(null);
  trendError = signal(false);
  teamError = signal(false);

  constructor() {
    effect(() => { document.documentElement.dataset['theme'] = this.theme(); localStorage.setItem('theme', this.theme()); });
    forkJoin([this.api.forYou(), this.api.trending().pipe(catchError(err => { console.error('API /repositories/top :', err); this.trendError.set(true); return of([] as Repository[]); })), this.api.collaborative(), this.api.topicModeling(), this.api.devTeam().pipe(catchError(err => { console.error('GitHub devteam :', err); this.teamError.set(true); return of([] as Repository[]); }))]).subscribe(([a, b, c, d, e]) =>
      this.rows.set([
        { title: 'For you', subtitle: 'A mix of trends, collaborative filtering, and topic modeling', repos: a },
        { title: 'Trends', subtitle: 'Stars, recent activity, and growth', repos: b },
        { title: 'Collaborative filtering', subtitle: 'Liked by developers like you', repos: c },
        { title: 'Topic modeling', subtitle: 'Thematically related (README, topics) – BERTopic', repos: d },
        { title: 'By devteam', subtitle: 'Repositories built by the RepoReco team', repos: e },
      ]));
  }
  toggleTheme() { this.theme.update(t => (t === 'dark' ? 'light' : 'dark')); }
  langs(r: Repository): [string, number | null][] {
    const l = r.languages ?? [];
    return Array.isArray(l) ? l.map(x => [x.name, null] as [string, null]) : Object.entries(l);
  }
}
