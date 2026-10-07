import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import type { Person, Sport } from '../models';
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private router = inject(Router);
  user = signal<Person | null>(null);
  sports = signal<Sport[]>([]);
  settings = signal<Record<string, string>>({});
  ready = signal(false);
  demoAvailable = signal(false);
  private initialization?: Promise<void>;
  async request<T = any>(method: string, path: string, body?: unknown): Promise<T> {
    try {
      return await firstValueFrom(
        this.http.request<T>(method, '/api' + path, { body, withCredentials: true }),
      );
    } catch (e) {
      const err = e as HttpErrorResponse;
      if (err.status === 401 && this.user() && !path.startsWith('/auth/')) {
        this.user.set(null);
        void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      }
      throw new Error(
        err.error?.details?.join('\n') ||
          err.error?.error ||
          'Could not reach GORA. Check your connection and try again.',
      );
    }
  }
  get<T = any>(path: string) {
    return this.request<T>('GET', path);
  }
  post<T = any>(path: string, body: unknown = {}) {
    return this.request<T>('POST', path, body);
  }
  put<T = any>(path: string, body: unknown = {}) {
    return this.request<T>('PUT', path, body);
  }
  delete<T = any>(path: string, body?: unknown) {
    return this.request<T>('DELETE', path, body);
  }
  async initialize() {
    return (this.initialization ??= this.loadSession());
  }
  private async loadSession() {
    const results = await Promise.allSettled([
      this.get<Person>('/auth/me'),
      this.get<Sport[]>('/sports'),
      this.get<{ demo: boolean }>('/health'),
      this.get<{ key: string; value: string }[]>('/settings'),
    ]);
    if (results[0].status === 'fulfilled') this.user.set(results[0].value);
    if (results[1].status === 'fulfilled') this.sports.set(results[1].value);
    if (results[2].status === 'fulfilled') this.demoAvailable.set(results[2].value.demo);
    if (results[3].status === 'fulfilled')
      this.settings.set(Object.fromEntries(results[3].value.map((s) => [s.key, s.value])));
    this.ready.set(true);
  }
  async signIn(path: string, data: unknown) {
    const u = await this.post<Person>('/auth/' + path, data);
    this.user.set(u);
    return u;
  }
  async demo() {
    await this.signIn('demo', {});
    await this.router.navigate(['/tabs/home']);
  }
  async logout() {
    await this.post('/auth/logout');
    this.user.set(null);
    await this.router.navigate(['/login']);
  }
  async refreshUser() {
    this.user.set(await this.get<Person>('/auth/me'));
  }
  requireUser() {
    if (this.user()) return true;
    void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
    return false;
  }
  query(values: Record<string, unknown>) {
    const q = new URLSearchParams();
    Object.entries(values).forEach(([k, v]) => {
      if (v !== '' && v !== undefined && v !== null) q.set(k, String(v));
    });
    return q.toString();
  }
}
