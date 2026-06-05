import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [MatCardModule, MatIconModule, MatButtonModule, MatDividerModule],
  template: `
    <div class="about-container">
      <mat-card appearance="outlined">
        <mat-card-header>
          <mat-icon mat-card-avatar style="font-size:40px;width:40px;height:40px;color:#4CAF50">chat</mat-icon>
          <mat-card-title>Green API n8n Router</mat-card-title>
          <mat-card-subtitle>Version {{ version }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <p class="description">
            A WhatsApp message router that forwards incoming messages to multiple n8n webhook endpoints.
          </p>

          <mat-divider />

          <div class="info-grid">
            <div class="info-row">
              <mat-icon>person</mat-icon>
              <span class="label">Author</span>
              <span>Tomer Klein</span>
            </div>
            <div class="info-row">
              <mat-icon>email</mat-icon>
              <span class="label">Email</span>
              <a href="mailto:tomer.klein@gmail.com">tomer.klein&#64;gmail.com</a>
            </div>
            <div class="info-row">
              <mat-icon>code</mat-icon>
              <span class="label">Repository</span>
              <a href="https://github.com/t0mer/greenapi-n8n-router"
                 target="_blank" rel="noopener">
                github.com/t0mer/greenapi-n8n-router
              </a>
            </div>
            <div class="info-row">
              <mat-icon>bug_report</mat-icon>
              <span class="label">Issues</span>
              <a href="https://github.com/t0mer/greenapi-n8n-router/issues"
                 target="_blank" rel="noopener">
                Open an issue
              </a>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .about-container {
      padding: 24px;
      max-width: 560px;
      margin: 0 auto;
    }
    .description {
      margin: 16px 0;
      opacity: 0.8;
      line-height: 1.6;
    }
    mat-divider {
      margin: 16px 0;
    }
    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding-top: 4px;
    }
    .info-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .info-row mat-icon {
      opacity: 0.6;
      flex-shrink: 0;
    }
    .label {
      width: 80px;
      flex-shrink: 0;
      font-weight: 500;
      opacity: 0.7;
      font-size: 13px;
    }
    a {
      color: #4CAF50;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  `],
})
export class AboutComponent implements OnInit {
  version = 'dev';
  private http = inject(HttpClient);

  ngOnInit(): void {
    this.http.get<{ version: string }>('/api/v1/version').subscribe({
      next: r => this.version = r.version,
      error: () => {},
    });
  }
}
