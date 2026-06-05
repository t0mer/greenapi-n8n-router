import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { LogsService } from '../core/services/logs.service';
import { LogEntry } from '../core/models/log-entry.model';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [
    DatePipe,
    MatButtonModule, MatIconModule,
    MatChipsModule, MatTooltipModule,
    ScrollingModule,
  ],
  template: `
    <div class="logs-container">
      <div class="logs-toolbar">
        <mat-chip-set>
          <mat-chip [class]="'status-chip status-' + status">
            <mat-icon matChipAvatar>{{ status === 'connected' ? 'wifi' : 'wifi_off' }}</mat-icon>
            {{ status === 'connected' ? 'Connected' : 'Disconnected' }}
          </mat-chip>
        </mat-chip-set>
        <span class="spacer"></span>
        <button mat-icon-button (click)="clearLogs()" matTooltip="Clear logs">
          <mat-icon>clear_all</mat-icon>
        </button>
      </div>

      <cdk-virtual-scroll-viewport itemSize="32" class="log-viewport">
        @if (entries.length === 0) {
          <div class="empty-logs">
            <mat-icon>terminal</mat-icon>
            <p>No log entries yet. Incoming messages will appear here.</p>
          </div>
        }
        <div *cdkVirtualFor="let entry of entries"
             [class]="'log-entry log-' + entry.level">
          <span class="log-time">{{ entry.timestamp | date:'HH:mm:ss' }}</span>
          <span class="log-msg">{{ entry.message }}</span>
        </div>
      </cdk-virtual-scroll-viewport>
    </div>
  `,
  styles: [`
    .logs-container {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 160px);
      padding: 12px;
      gap: 8px;
    }
    .logs-toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .spacer { flex: 1; }
    .log-viewport {
      flex: 1;
      border-radius: 8px;
      background: #0d1117;
      font-family: 'Roboto Mono', 'Courier New', monospace;
      font-size: 12px;
    }
    .log-entry {
      display: flex;
      gap: 12px;
      padding: 4px 12px;
      align-items: baseline;
      min-height: 32px;
    }
    .log-time { color: #64748b; white-space: nowrap; flex-shrink: 0; }
    .log-info    .log-msg { color: #e2e8f0; }
    .log-success .log-msg { color: #4ade80; }
    .log-warning .log-msg { color: #fbbf24; }
    .log-error   .log-msg { color: #f87171; }
    .log-debug   .log-msg { color: #94a3b8; }
    .empty-logs {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      height: 200px; color: #64748b; gap: 8px;
    }
    .status-chip.status-connected   { color: #4ade80; }
    .status-chip.status-disconnected { color: #94a3b8; }
  `],
})
export class LogsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() active = false;

  entries: LogEntry[] = [];
  status: 'connected' | 'disconnected' = 'disconnected';

  private logsService = inject(LogsService);
  private subs = new Subscription();

  ngOnInit(): void {
    this.subs.add(this.logsService.entries$.subscribe(e => this.entries = e));
    this.subs.add(this.logsService.status$.subscribe(s => this.status = s));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['active']) {
      this.active ? this.logsService.connect() : this.logsService.disconnect();
    }
  }

  clearLogs(): void {
    this.logsService.clear();
  }

  ngOnDestroy(): void {
    this.logsService.disconnect();
    this.subs.unsubscribe();
  }
}
