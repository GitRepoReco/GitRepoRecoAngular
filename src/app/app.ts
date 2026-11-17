import { Component, effect, inject, signal } from '@angular/core';
import { forkJoin, catchError, of } from 'rxjs';
import { Repository } from './models';
import { RepoService } from './repo.service';
import { RepoRow } from './repo-row';
import { TwinSearch } from './twin-search';
import { Quiz } from './quiz';

interface Row { title: string; subtitle: string; repos: Repository[] }

@Component({ selector: 'app-root', imports: [RepoRow, TwinSearch, Quiz], templateUrl: './app.html', styleUrl: './app.scss' })
export class App {
  private api = inject(RepoService);
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
