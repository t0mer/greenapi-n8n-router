import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RouteCreate, RouteUpdate } from '../models/route.model';

@Injectable({ providedIn: 'root' })
export class RouteService {
  private http = inject(HttpClient);
  private base = '/api/v1/routes';

  getRoutes(): Observable<{ routes: Record<string, { name: string; target_urls: string[] }> }> {
    return this.http.get<{ routes: Record<string, { name: string; target_urls: string[] }> }>(this.base);
  }

  createRoute(data: RouteCreate): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.base, data);
  }

  updateRoute(chatId: string, data: RouteUpdate): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${encodeURIComponent(chatId)}`, data);
  }

  deleteRoute(chatId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${encodeURIComponent(chatId)}`);
  }

  renameRoute(chatId: string, name: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base}/${encodeURIComponent(chatId)}/name`,
      { name }
    );
  }
}
