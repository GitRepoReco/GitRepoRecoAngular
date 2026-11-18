import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { HealthCheck } from './models';

// Couche d'accès aux endpoints "ops" de l'API (healthcheck, version) pour la page Dashboard.
@Injectable({ providedIn: 'root' })
export class StatusService {
  private http = inject(HttpClient);

  // GET /health : l'API est "up" si elle répond en 2xx. Le corps est lu en texte puis interprété
  // au mieux (JSON { status } ou texte court) pour ne pas dépendre de son format exact.
  health(): Observable<HealthCheck> {
    const t0 = performance.now();
    const elapsed = () => Math.round(performance.now() - t0);
    return this.http.get(`${API_BASE_URL}/health`, { observe: 'response', responseType: 'text' }).pipe(
      map(res => ({ state: 'up' as const, latencyMs: elapsed(), checkedAt: new Date(), detail: this.detail(res.body) })),
      catchError(err => of<HealthCheck>({
        state: 'down', latencyMs: null, checkedAt: new Date(),
        detail: err?.status ? `HTTP ${err.status}` : 'Unreachable',
      })),
    );
  }

  // GET /version : { "version": "v1.3" }
  version(): Observable<string> {
    return this.http.get<{ version: string }>(`${API_BASE_URL}/version`).pipe(map(res => res.version));
  }

  private detail(body: string | null): string | null {
    const text = (body ?? '').trim();
    if (!text) return null;
    try {
      const json = JSON.parse(text);
      if (typeof json === 'string') return json;
      if (json && typeof json.status === 'string') return json.status;
      return null;
    } catch {
      return text.length <= 60 ? text : null;
    }
  }
}
