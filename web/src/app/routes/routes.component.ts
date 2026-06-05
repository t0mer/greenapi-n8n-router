import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { RouteService } from '../core/services/route.service';
import { Route } from '../core/models/route.model';
import { RouteDialogComponent } from './route-dialog/route-dialog.component';

@Component({
  selector: 'app-routes',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressSpinnerModule,
    MatTooltipModule, MatDialogModule, MatSnackBarModule,
  ],
  template: `
    <div class="routes-container">
      @if (loading) {
        <div class="center-state">
          <mat-spinner diameter="48" />
        </div>
      } @else if (routes.length === 0) {
        <div class="center-state">
          <mat-icon class="empty-icon">route</mat-icon>
          <h2>No routes configured</h2>
          <p>Add a WhatsApp chat route to get started</p>
          <button mat-raised-button color="primary" (click)="openAddDialog()">
            <mat-icon>add</mat-icon> Add Route
          </button>
        </div>
      } @else {
        <div class="cards-grid">
          @for (route of routes; track route.chatId) {
            <mat-card class="route-card" appearance="outlined">
              <mat-card-header>
                <mat-card-title>{{ route.name }}</mat-card-title>
                <mat-card-subtitle>{{ route.chatId }}</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                @if (route.targetUrls.length > 0) {
                  <p class="webhook-preview"
                     [matTooltip]="route.targetUrls[0]">
                    {{ route.targetUrls[0].length > 55
                        ? (route.targetUrls[0] | slice:0:55) + '…'
                        : route.targetUrls[0] }}
                  </p>
                }
                <mat-chip-set>
                  <mat-chip>
                    {{ route.targetUrls.length }}
                    webhook{{ route.targetUrls.length !== 1 ? 's' : '' }}
                  </mat-chip>
                </mat-chip-set>
              </mat-card-content>
              <mat-card-actions align="end">
                <button mat-icon-button color="primary"
                        (click)="openEditDialog(route)"
                        matTooltip="Edit route">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn"
                        (click)="confirmDelete(route)"
                        matTooltip="Delete route">
                  <mat-icon>delete</mat-icon>
                </button>
              </mat-card-actions>
            </mat-card>
          }
        </div>
      }

      <button mat-fab class="fab-add" color="primary"
              (click)="openAddDialog()"
              matTooltip="Add route"
              aria-label="Add route">
        <mat-icon>add</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .routes-container {
      padding: 16px;
      position: relative;
      min-height: calc(100vh - 160px);
    }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
      padding-bottom: 80px;
    }
    .webhook-preview {
      font-size: 12px;
      opacity: 0.7;
      margin-bottom: 8px;
      word-break: break-all;
    }
    .fab-add {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 100;
    }
    .center-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      gap: 16px;
      text-align: center;
    }
    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      opacity: 0.4;
    }
  `],
})
export class RoutesComponent implements OnInit {
  routes: Route[] = [];
  loading = false;

  private routeSvc = inject(RouteService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  ngOnInit(): void {
    this.loadRoutes();
  }

  loadRoutes(): void {
    this.loading = true;
    this.routeSvc.getRoutes().subscribe({
      next: data => {
        this.routes = Object.entries(data.routes).map(([chatId, r]) => ({
          chatId,
          name: r.name || chatId,
          targetUrls: r.target_urls || [],
        })).sort((a, b) => a.name.localeCompare(b.name));
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load routes', 'Dismiss', { duration: 3000 });
        this.loading = false;
      },
    });
  }

  openAddDialog(): void {
    this.dialog.open(RouteDialogComponent, { width: '520px', maxWidth: '95vw' })
      .afterClosed().subscribe(saved => { if (saved) this.loadRoutes(); });
  }

  openEditDialog(route: Route): void {
    this.dialog.open(RouteDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      data: route,
    }).afterClosed().subscribe(saved => { if (saved) this.loadRoutes(); });
  }

  confirmDelete(route: Route): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { message: `Delete route for "${route.name}"? This cannot be undone.` },
      width: '360px',
    }).afterClosed().subscribe(confirmed => {
      if (confirmed) this.deleteRoute(route.chatId);
    });
  }

  deleteRoute(chatId: string): void {
    this.routeSvc.deleteRoute(chatId).subscribe({
      next: () => {
        this.routes = this.routes.filter(r => r.chatId !== chatId);
        this.snackBar.open('Route deleted', undefined, { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to delete route', 'Dismiss', { duration: 3000 }),
    });
  }
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Confirm</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true">Delete</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  data = inject(MAT_DIALOG_DATA);
}
