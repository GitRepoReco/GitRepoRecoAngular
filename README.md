# RepoReco Web

Web interface of **RepoReco**, a GitHub repository recommender system developed as part of the Big Data and MLOps courses of the Master's in AI (M2) at Le Mans University.

The application is inspired by Netflix's interface: scrollable rows of recommended repositories, a search for "twin" repositories, and a quiz to discover repositories in a playful way. It presents the results of the different recommendation algorithms built in the project.

---

## Features

- **Light / dark mode**: toggle from the header. The choice is remembered, and defaults to the system preference.
- **Five recommendation rows**, with horizontal scrolling:
  - *For you*: aggregation of trending, collaborative filtering and topic modeling results
  - *Trending*
  - *Collaborative filtering*
  - *Topic modeling*
  - *By devteam*: the repositories built by the RepoReco team
- **Repository details**: description, statistics, topics, language breakdown, license, last commit and a link to GitHub.
- **Twin repositories**: free-text search (README, title, topics...) to find equivalent repositories, with a similarity score and a badge for abandoned projects.
- **Buzzfeed-style quiz**: a few questions, a developer profile, then recommended repositories.
- **Monitoring** tab (skeleton): deployed ML models, versions, environments, data drift and retraining actions. Not connected yet.
- **Dashboard** tab: DevOps view. The *GitRepoReco API* card is live (healthcheck, version, response time, refreshed every 30 s); pipeline and components are skeletons.

---

## Tech stack

| Element | Choice |
|---|---|
| Framework | Angular 20 (standalone components, signals, `@if` / `@for` control flow) |
| Language | TypeScript |
| Styles | SCSS, theming through CSS variables |

---

## Prerequisites

- **Node.js** 20.19+, 22.12+ or 24+
- **npm** (installed with Node.js)

There is no need to install the Angular CLI globally: the project uses the version declared in `package.json`.

---

## Getting started

```bash
git clone https://github.com/GitRepoReco/GitRepoRecoAngular.git
cd GitRepoRecoAngular

npm install
npm start
```

The application is then available at [http://localhost:4200](http://localhost:4200) and reloads automatically on every change.

Other commands:

```bash
npm run build   # production build in dist/
```

---

## Project structure

```
public/
└── logo.png              — project logo (favicon and header)
src/
├── index.html
├── styles.scss           — theme variables (light / dark) and global styles
└── app/
    ├── app.ts / .html / .scss   — shell: header, theme, rows, repository details
    ├── models.ts                — interfaces (Repository, quiz...)
    ├── repo.service.ts          — data access layer
    ├── repo-card.ts             — repository card
    ├── repo-row.ts              — horizontally scrollable row
    ├── app.routes.ts            — routes (/, /monitoring, /dashboard)
    ├── dashboard.ts             — Dashboard tab (DevOps)
    ├── monitoring.ts            — Monitoring tab (MLOps)
    ├── status.service.ts        — API healthcheck / version
    ├── twin-search.ts           — twin repositories search
    └── quiz.ts                  — recommendation quiz
```

---

## Data access

All data goes through `RepoService`, the single data access layer of the application. Every method returns an `Observable`, so components stay independent from the source of the data.

| Method | Returns |
|---|---|
| `forYou()` | aggregated list of recommended repositories |
| `trending()` | trending repositories |
| `collaborative()` | collaborative filtering results |
| `topicModeling()` | topic modeling (BERTopic) results |
| `findTwins(query)` | twin repositories with a similarity `score` |
| `quizResult(tag)` | developer profile and recommended repositories for the quiz answers |

The `Repository` interface (`src/app/models.ts`) mirrors the columns of the `github.repositories` table of the [collector](https://github.com/GitRepoReco/Analyse-github), in `snake_case`. READMEs are stored in a separate table (`github.readmes`).

---

## Team

| Role        | Name            | Email                               | University Identifier |
|-------------|-----------------|--------------------------------------|------------------------|
| Developer   | Maelig Pesantez | maelig.pesantez.Etu@univ-lemans.fr   | @e2103064               |
| Developer   | Luka Cognard    | Luka.Cognard.Etu@univ-lemans.fr      | @s2200371               |
| Developer   | Mewen Puren     | Mewen.Puren.Etu@univ-lemans.fr       | @s201509                |
| Supervisor  | Nicolas Dugué   | Nicolas.Dugue@univ-lemans.fr         | LIUM, Le Mans University |
| Supervisor  | Aghilas Sini    | Aghilas.Sini@univ-lemans.fr          | LIUM, Le Mans University |

---

## Repositories

- **Main Repository:** [Repo Recommender](https://github.com/GitRepoReco/Analyse-github)
- **Angular Repository:** [Repo Recommender - angular project](https://github.com/GitRepoReco/GitRepoRecoAngular)
- **.github:** [.github](https://github.com/GitRepoReco/.github)