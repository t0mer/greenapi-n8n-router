import { Component, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ThemeService } from './core/services/theme.service';
import { RoutesComponent } from './routes/routes.component';
import { LogsComponent } from './logs/logs.component';
import { SettingsComponent } from './settings/settings.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    AsyncPipe,
    MatToolbarModule, MatTabsModule, MatIconModule,
    MatButtonModule, MatTooltipModule,
    RoutesComponent, LogsComponent, SettingsComponent,
  ],
  template: `
    <mat-toolbar color="primary">
      <mat-icon style="margin-right:8px">chat</mat-icon>
      <span>Green API Router</span>
      <span style="flex:1"></span>
      <button mat-icon-button
              (click)="theme.toggle()"
              [matTooltip]="(theme.isDark$ | async) ? 'Switch to light mode' : 'Switch to dark mode'">
        <mat-icon>{{ (theme.isDark$ | async) ? 'light_mode' : 'dark_mode' }}</mat-icon>
      </button>
    </mat-toolbar>

    <mat-tab-group mat-stretch-tabs="false"
                   [(selectedIndex)]="selectedTab"
                   animationDuration="200ms">
      <mat-tab label="Routes">
        <app-routes />
      </mat-tab>
      <mat-tab label="Logs">
        <app-logs [active]="selectedTab === 1" />
      </mat-tab>
      <mat-tab label="Settings">
        <app-settings />
      </mat-tab>
    </mat-tab-group>
  `,
})
export class AppComponent implements OnInit {
  selectedTab = 0;

  constructor(public theme: ThemeService) {}

  ngOnInit(): void {
    this.theme.init();
  }
}
