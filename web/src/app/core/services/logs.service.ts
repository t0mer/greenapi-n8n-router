import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LogEntry } from '../models/log-entry.model';

@Injectable({ providedIn: 'root' })
export class LogsService {
  private socket: WebSocket | null = null;
  private entriesSubject = new BehaviorSubject<LogEntry[]>([]);
  private statusSubject = new BehaviorSubject<'connected' | 'disconnected'>('disconnected');

  entries$ = this.entriesSubject.asObservable();
  status$ = this.statusSubject.asObservable();

  connect(): void {
    if (this.socket) return;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.socket = new WebSocket(`${protocol}//${location.host}/ws/logs`);

    this.socket.onopen = () => this.statusSubject.next('connected');

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const entry = JSON.parse(event.data) as LogEntry;
        const current = this.entriesSubject.value;
        this.entriesSubject.next([...current, entry].slice(-200));
      } catch {
        // ignore malformed messages
      }
    };

    this.socket.onclose = () => {
      this.statusSubject.next('disconnected');
      this.socket = null;
    };

    this.socket.onerror = () => {
      this.statusSubject.next('disconnected');
    };
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
  }

  clear(): void {
    this.entriesSubject.next([]);
  }
}
