import { isDevMode } from '@angular/core';

// En dev (ng serve), on passe par le proxy défini dans proxy.conf.json : pas de CORS.
// En production, appel direct à l'API (elle devra alors autoriser l'origine du site via CORS).
export const API_BASE_URL = isDevMode() ? '/api' : 'https://api.reporeco.duckdns.org';
export const TRENDING_LIMIT = 20;

// --- Section "By devteam" : API REST publique de GitHub ---
export const GITHUB_API = 'https://api.github.com';
// Comptes GitHub de l'équipe : on récupère leurs repos publics + ceux de leurs organisations publiques.
export const TEAM_USERS = ['Pixis-py', 'meo-pill', 'Ge0mega'];
// Organisations à inclure même si l'appartenance n'est pas publique sur le profil.
export const TEAM_EXTRA_ORGS = ['GitRepoReco', 'Chalumna'];
// Exclure les forks (true) ou les afficher (false).
export const TEAM_EXCLUDE_FORKS = true;
// Nombre max de repos affichés et durée du cache navigateur (l'API GitHub non authentifiée est limitée à 60 requêtes/h/IP).
export const TEAM_LIMIT = 30;
export const TEAM_CACHE_MS = 30 * 60 * 1000;

// --- Page Dashboard : pipeline CI/CD (GitHub Actions) ---
// Repo dont on suit les runs (API REST publique : aucun token requis, limite de 60 requêtes/h/IP).
export const PIPELINE_REPO = 'GitRepoReco/GitRepoRecoAngular';
export const PIPELINE_RUNS_LIMIT = 10;
// Durée de validité du cache (localStorage, partagé entre onglets) ; le bouton Refresh ne contourne le cache qu'au-delà de PIPELINE_MIN_REFRESH_MS.
export const PIPELINE_CACHE_MS = 5 * 60 * 1000;
export const PIPELINE_MIN_REFRESH_MS = 30 * 1000;
