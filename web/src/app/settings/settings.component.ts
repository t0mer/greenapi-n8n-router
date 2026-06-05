import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { SettingsService } from '../core/services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule,
  ],
  template: `
    <div class="settings-container">

      @if (showWarning) {
        <mat-card class="warning-card" appearance="outlined">
          <mat-card-content>
            <mat-icon color="warn">warning</mat-icon>
            <span>Green API credentials are not configured. The bot will not start until you save your Instance ID and Token.</span>
          </mat-card-content>
        </mat-card>
      }

      <mat-card appearance="outlined">
        <mat-card-header>
          <mat-card-title>Green API Credentials</mat-card-title>
          <mat-card-subtitle>Used to connect to the WhatsApp gateway</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" class="settings-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Instance ID</mat-label>
              <input matInput formControlName="instance_id" placeholder="e.g. 7103251347">
              @if (form.get('instance_id')?.hasError('required') && form.get('instance_id')?.touched) {
                <mat-error>Instance ID is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Token</mat-label>
              <input matInput
                     formControlName="token"
                     [type]="showToken ? 'text' : 'password'"
                     placeholder="Your Green API token">
              <button mat-icon-button matSuffix type="button"
                      (click)="showToken = !showToken"
                      [matTooltip]="showToken ? 'Hide token' : 'Show token'">
                <mat-icon>{{ showToken ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.get('token')?.hasError('required') && form.get('token')?.touched) {
                <mat-error>Token is required</mat-error>
              }
            </mat-form-field>
          </form>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-raised-button color="primary"
                  (click)="save()"
                  [disabled]="saving || form.invalid">
            @if (saving) {
              <mat-progress-spinner diameter="20" mode="indeterminate" />
            } @else {
              <ng-container>
                <mat-icon>save</mat-icon> Save &amp; Restart Bot
              </ng-container>
            }
          </button>
        </mat-card-actions>
      </mat-card>

      <mat-card appearance="outlined" class="info-card">
        <mat-card-content>
          <p><strong>Note:</strong> Saving credentials restarts only the WhatsApp bot component.
          The web interface stays online throughout.</p>
        </mat-card-content>
      </mat-card>

    </div>
  `,
  styles: [`
    .settings-container {
      padding: 16px;
      max-width: 560px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .settings-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 8px;
    }
    .full-width { width: 100%; }
    .warning-card mat-card-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .info-card { opacity: 0.7; }
  `],
})
export class SettingsComponent implements OnInit {
  form = inject(FormBuilder).group({
    instance_id: ['', Validators.required],
    token: ['', Validators.required],
  });

  saving = false;
  showToken = false;
  showWarning = false;

  private settingsSvc = inject(SettingsService);
  private snackBar = inject(MatSnackBar);

  ngOnInit(): void {
    this.settingsSvc.getSettings().subscribe({
      next: s => {
        this.form.patchValue(s);
        // Token will be "••••••••" (masked) — show warning only if instance_id is blank
        this.showWarning = !s.instance_id?.trim();
      },
      error: () => this.snackBar.open('Failed to load settings', 'Dismiss', { duration: 3000 }),
    });
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving = true;

    const data = this.form.value as { instance_id: string; token: string };

    this.settingsSvc.updateSettings(data).subscribe({
      next: () => {
        this.showWarning = false;
        this.settingsSvc.restartBot().subscribe({
          next: () => {
            this.saving = false;
            this.snackBar.open('Settings saved. Bot is restarting…', undefined, { duration: 4000 });
          },
          error: () => {
            this.saving = false;
            this.snackBar.open('Settings saved. Bot restart may need manual trigger.', 'Dismiss', { duration: 5000 });
          },
        });
      },
      error: err => {
        this.saving = false;
        this.snackBar.open(err.error?.detail ?? 'Failed to save settings', 'Dismiss', { duration: 4000 });
      },
    });
  }
}
