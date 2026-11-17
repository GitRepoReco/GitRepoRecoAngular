import { Component, computed, inject, output, signal } from '@angular/core';
import { QuizResult, Repository } from './models';
import { RepoService } from './repo.service';
import { RepoCard } from './repo-card';

@Component({
  selector: 'repo-quiz',
  imports: [RepoCard],
  template: `
    <section>
      <h2>Which repo is made for you ?</h2>
      <div class="panel">
        @if (result(); as res) {
          <h3>{{ res.title }}</h3><p>{{ res.blurb }}</p>
          <div class="grid">@for (r of res.repos; track r.id) { <repo-card [repo]="r" (open)="select.emit($event)" /> }</div>
          <button class="ghost" (click)="reset()">Restart</button>
        } @else {
          <small>Question {{ step() + 1 }} / {{ questions.length }}</small>
          <div class="bar"><i [style.width.%]="(step() / questions.length) * 100"></i></div>
          <h3>{{ current().question }}</h3>
          <div class="opts">@for (o of current().options; track o.label) { <button (click)="answer(o.tag)">{{ o.label }}</button> }</div>
        }
      </div>
    </section>`,
  styles: `
    section{margin:2.5rem 0 4rem}.panel{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:1.6rem}
    .bar{height:6px;background:var(--surface2);border-radius:9px;margin:.5rem 0 1rem}.bar i{display:block;height:100%;background:var(--accent);border-radius:9px;transition:width .3s}
    .opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.8rem}
    .opts button{background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:10px;padding:1rem;transition:transform .15s,border-color .15s}
    .opts button:hover{transform:translateY(-3px);border-color:var(--accent)}
    .grid{display:flex;flex-wrap:wrap;gap:1rem;margin:1rem 0}.ghost{background:none;border:1px solid var(--border);color:var(--text);padding:.5rem 1rem;border-radius:9px}`,
})
export class Quiz {
  private api = inject(RepoService);
  questions = this.api.quizQuestions();
  step = signal(0);
  tags = signal<string[]>([]);
  result = signal<QuizResult | null>(null);
  current = computed(() => this.questions[this.step()]);
  select = output<Repository>();
  answer(tag: string) {
    this.tags.update(t => [...t, tag]);
    if (this.step() + 1 < this.questions.length) { this.step.update(s => s + 1); return; }
    const counts = this.tags().reduce<Record<string, number>>((a, t) => ({ ...a, [t]: (a[t] ?? 0) + 1 }), {});
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    this.api.quizResult(top).subscribe(r => this.result.set(r));
  }
  reset() { this.step.set(0); this.tags.set([]); this.result.set(null); }
}
