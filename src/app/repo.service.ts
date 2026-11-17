import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map, forkJoin, switchMap, catchError } from 'rxjs';
import { API_BASE_URL, TRENDING_LIMIT, GITHUB_API, TEAM_USERS, TEAM_EXTRA_ORGS, TEAM_EXCLUDE_FORKS, TEAM_LIMIT, TEAM_CACHE_MS } from './api.config';
import { QuizQuestion, QuizResult, Repository } from './models';

type Seed = [string, string, string, string, string[], string];

const SEEDS: Seed[] = [
  ['vision-kit', 'atlas-labs', 'Python', '#3572A5', ['computer-vision', 'pytorch', 'ai'], 'Modular computer vision toolkit.'],
  ['rustscale', 'ferrous-io', 'Rust', '#dea584', ['systems', 'async', 'networking'], 'Ultra-lightweight asynchronous networking runtime.'],
  ['ngx-flow', 'pixelforge', 'TypeScript', '#3178c6', ['angular', 'web', 'ui'], 'Angular components for building visual workflows.'],
  ['kube-pilot', 'cloudnative', 'Go', '#00ADD8', ['kubernetes', 'devops', 'mlops'], 'Kubernetes operator for deploying ML models.'],
  ['bert-topics', 'nlp-garage', 'Python', '#3572A5', ['nlp', 'topic-modeling', 'ai'], 'Simplified BERTopic with interactive visualizations.'],
  ['sveltish', 'webwave', 'JavaScript', '#f1e05a', ['frontend', 'web', 'framework'], '3 KB reactive micro-framework.'],
  ['mlflow-lite', 'tracking-co', 'Python', '#3572A5', ['mlops', 'experiments', 'devops'], 'Minimalist ML experiment tracking.'],
  ['gpu-sched', 'tensorworks', 'C++', '#f34b7d', ['gpu', 'systems', 'ai'], 'GPU scheduler for training clusters.'],
  ['pg-vector-kit', 'dbcraft', 'SQL', '#e38c00', ['postgres', 'vector-search', 'data'], 'Simple vector search on PostgreSQL.'],
  ['terminal-ui', 'cliverse', 'Go', '#00ADD8', ['cli', 'tui', 'devops'], 'Library for elegant terminal interfaces.'],
  ['recsys-playground', 'matrix-lab', 'Python', '#3572A5', ['recommender', 'collaborative-filtering', 'ai'], 'Recommendation system benchmarks.'],
  ['edge-ai', 'tinyml-hub', 'C', '#555555', ['embedded', 'systems', 'ai'], 'Model inference on microcontrollers.'],
];

// Réponse (partielle) de l'API REST GitHub pour un repo
interface GhRepo {
  node_id: string; name: string; full_name: string; description: string | null; html_url: string;
  homepage: string | null; stargazers_count: number; forks_count: number; size: number; visibility?: string;
  archived: boolean; fork: boolean; language: string | null; default_branch: string;
  owner: { login: string; avatar_url: string }; license: { name: string } | null; topics?: string[];
  watchers_count: number; open_issues_count: number; created_at: string; pushed_at: string;
}

// Couleurs GitHub des langages les plus courants (l'API REST ne les fournit pas)
const LANG_COLORS: Record<string, string> = {
  Python: '#3572A5', TypeScript: '#3178c6', JavaScript: '#f1e05a', Java: '#b07219', 'C++': '#f34b7d', C: '#555555',
  'C#': '#178600', Go: '#00ADD8', Rust: '#dea584', HTML: '#e34c26', CSS: '#563d7c', SCSS: '#c6538c', Shell: '#89e051',
  'Jupyter Notebook': '#DA5B0B', SQL: '#e38c00', Dockerfile: '#384d54', Kotlin: '#A97BFF', Swift: '#F05138',
  PHP: '#4F5D95', Ruby: '#701516', R: '#198CE7', Vue: '#41b883', COBOL: '#5a7a9a', Lua: '#000080', TeX: '#3D6117',
};

const PERSONAS: Record<string, { title: string; blurb: string; offset: number }> = {
  ai: {
    title: 'Data Oracle',
    blurb: 'You see patterns where others see noise.',
    offset: 0
  },
  web: {
    title: 'Pixel Artisan',
    blurb: 'For you, a great product starts with a beautiful interface.',
    offset: 2
  },
  devops: {
    title: 'Pipeline Captain',
    blurb: 'If it does not deploy itself, it does not exist.',
    offset: 3
  },
  systems: {
    title: 'Low-Level Mage',
    blurb: 'Every byte matters, and so does every cycle.',
    offset: 1
  },
};

@Injectable({ providedIn: 'root' })
export class RepoService {
  private http = inject(HttpClient);

  // TODO: replace each method with an HttpClient.get<Repository[]>('/api/...')
  forYou(): Observable<Repository[]> { return of(this.build(0)).pipe(delay(200)); }
  // Baseline : repos les plus populaires (triés par stars) depuis l'API. Réponse : { limit, count, items: [...] }
  trending(limit = TRENDING_LIMIT): Observable<Repository[]> {
    return this.http
      .get<{ items: Repository[] }>(`${API_BASE_URL}/repositories/top`, { params: { limit } })
      .pipe(map(res => res.items));
  }
  collaborative(): Observable<Repository[]> { return of(this.build(7)).pipe(delay(200)); }
  topicModeling(): Observable<Repository[]> { return of(this.build(10)).pipe(delay(200)); }
  // Repos de l'équipe : comptes TEAM_USERS + leurs organisations publiques (+ TEAM_EXTRA_ORGS), via l'API REST GitHub.
  devTeam(): Observable<Repository[]> {
    const cached = this.readTeamCache();
    if (cached) return of(cached);

    const gh = <T>(path: string) =>
      this.http.get<T>(`${GITHUB_API}${path}`, { params: { per_page: 100, sort: 'pushed' } })
        .pipe(catchError(err => { console.error(`GitHub ${path} :`, err); return of([] as unknown as T); }));

    const userRepos$ = forkJoin(TEAM_USERS.map(u => gh<GhRepo[]>(`/users/${u}/repos`)));
    const orgRepos$ = forkJoin(TEAM_USERS.map(u => gh<{ login: string }[]>(`/users/${u}/orgs`))).pipe(
      map(lists => [...new Set([...lists.flat().map(o => o.login), ...TEAM_EXTRA_ORGS])]),
      switchMap(orgs => orgs.length ? forkJoin(orgs.map(o => gh<GhRepo[]>(`/orgs/${o}/repos`))) : of([] as GhRepo[][])),
    );

    return forkJoin([userRepos$, orgRepos$]).pipe(
      map(([u, o]) => {
        const byName = new Map<string, GhRepo>();
        for (const r of [...u.flat(), ...o.flat()]) if (!(TEAM_EXCLUDE_FORKS && r.fork)) byName.set(r.full_name, r);
        const repos = [...byName.values()]
          .sort((a, b) => b.pushed_at.localeCompare(a.pushed_at))
          .slice(0, TEAM_LIMIT)
          .map(r => this.fromGithub(r));
        if (!repos.length) throw new Error('Aucun repo récupéré depuis GitHub (rate limit ?)');
        this.writeTeamCache(repos);
        return repos;
      }),
    );
  }

  private fromGithub(r: GhRepo): Repository {
    return {
      id: r.node_id, name: r.name, full_name: r.full_name, description: r.description, url: r.html_url,
      homepage_url: r.homepage || null, stars: r.stargazers_count, forks: r.forks_count, disk_usage_kb: r.size,
      visibility: r.visibility, is_archived: r.archived, is_fork: r.fork, language: r.language,
      language_color: r.language ? (LANG_COLORS[r.language] ?? '#667') : null,
      default_branch: r.default_branch, owner_login: r.owner.login, owner_avatar_url: r.owner.avatar_url,
      license_name: r.license?.name ?? null, topics: r.topics ?? [],
      languages: r.language ? { [r.language]: 100 } : {},
      total_issues_open: r.open_issues_count, total_watchers: r.watchers_count,
      created_at: r.created_at, pushed_at: r.pushed_at, last_commit_date: r.pushed_at,
    };
  }

  private readTeamCache(): Repository[] | null {
    try {
      const raw = sessionStorage.getItem('devteam_repos_v1');
      if (!raw) return null;
      const { t, items } = JSON.parse(raw) as { t: number; items: Repository[] };
      return Date.now() - t < TEAM_CACHE_MS ? items : null;
    } catch { return null; }
  }
  private writeTeamCache(items: Repository[]) {
    try { sessionStorage.setItem('devteam_repos_v1', JSON.stringify({ t: Date.now(), items })); } catch { /* quota / mode privé */ }
  }

  findTwins(query: string): Observable<Repository[]> {
    const q = query.trim().toLowerCase();
    const pool = this.build(q.length % SEEDS.length).slice(0, 6).map((r, i) => ({
      ...r,
      score: Math.max(0.35, 0.96 - i * 0.09),
      is_archived: i % 3 === 2,
      last_commit_date: i % 3 === 2 ? '2022-03-14T10:00:00Z' : r.last_commit_date,
    }));
    return of(pool).pipe(delay(500));
  }

  quizQuestions(): QuizQuestion[] {
    return [
      {
        question: 'Your ideal Saturday?',
        options: [
          { label: 'Train a model', tag: 'ai' },
          { label: 'Polish a UI', tag: 'web' },
          { label: 'Automate my infrastructure', tag: 'devops' },
          { label: 'Optimize C code', tag: 'systems' }
        ]
      },
      {
        question: 'Your favorite tool?',
        options: [
          { label: 'Jupyter', tag: 'ai' },
          { label: 'Figma', tag: 'web' },
          { label: 'Terminal + tmux', tag: 'devops' },
          { label: 'A debugger', tag: 'systems' }
        ]
      },
      {
        question: 'Your biggest fear?',
        options: [
          { label: 'Data leakage', tag: 'ai' },
          { label: 'Internet Explorer', tag: 'web' },
          { label: 'A production deployment on Friday', tag: 'devops' },
          { label: 'A segfault', tag: 'systems' }
        ]
      },
      {
        question: 'Your dev drink?',
        options: [
          { label: 'Black coffee', tag: 'systems' },
          { label: 'Matcha tea', tag: 'web' },
          { label: 'Energy drink', tag: 'devops' },
          { label: 'Sparkling water', tag: 'ai' }
        ]
      },
    ];
  }

  quizResult(tag: string): Observable<QuizResult> {
    const p = PERSONAS[tag] ?? PERSONAS['ai'];
    return of({
      title: p.title,
      blurb: p.blurb,
      repos: this.build(p.offset).slice(0, 3)
    }).pipe(delay(400));
  }

  private build(offset: number, seeds: Seed[] = SEEDS): Repository[] {
    return Array.from({ length: 10 }, (_, i) => {
      const [name, owner, language, color, topics, description] = seeds[(i + offset) % seeds.length];
      const n = (i + 1) * 7919 + offset * 1303;

      return {
        id: `R_${offset}_${i}`,
        name,
        full_name: `${owner}/${name}`,
        description,
        url: `https://github.com/${owner}/${name}`,
        stars: (n % 48000) + 500,
        forks: (n % 4000) + 20,
        language,
        language_color: color,
        owner_login: owner,
        topics,
        license_name: 'MIT License',
        total_releases: n % 40,
        total_issues_open: n % 120,
        total_prs_open: n % 15,
        total_watchers: n % 900,
        created_at: '2021-05-02T08:00:00Z',
        pushed_at: '2026-09-20T12:00:00Z',
        last_commit_date: '2026-09-20T12:00:00Z',
        languages: {
          [language]: 80,
          Shell: 12,
          Dockerfile: 8
        },
      } as Repository;
    });
  }
}
