import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Settings {
  instance_id: string;
  token: string;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private http = inject(HttpClient);

  getSettings(): Observable<Settings> {
    return this.http.get<Settings>('/api/v1/settings');
  }

  updateSettings(data: Settings): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/api/v1/settings', data);
  }

  restartBot(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/api/v1/restart', {});
  }
}
