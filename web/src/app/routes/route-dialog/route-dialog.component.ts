import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder, FormArray, FormControl, AbstractControl,
  ValidationErrors, Validators, ReactiveFormsModule,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';

import { RouteService } from '../../core/services/route.service';
import { ContactsService, Contact } from '../../core/services/contacts.service';
import { Route } from '../../core/models/route.model';

function urlValidator(ctrl: AbstractControl): ValidationErrors | null {
  const v = (ctrl.value ?? '').trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:' ? null : { url: true };
  } catch {
    return { url: true };
  }
}

@Component({
  selector: 'app-route-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatAutocompleteModule,
    MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit Route' : 'Add New Route' }}</h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Card Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Support Team">
          @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
            <mat-error>Name is required</mat-error>
          }
        </mat-form-field>

        @if (isEdit) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Chat ID</mat-label>
            <input matInput [value]="routeData.chatId" readonly>
            <mat-hint>Chat ID cannot be changed after creation</mat-hint>
          </mat-form-field>
        } @else {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Chat ID</mat-label>
            <input matInput formControlName="chatId"
                   [matAutocomplete]="contactAuto"
                   placeholder="Search contacts or enter ID…">
            <mat-autocomplete #contactAuto [displayWith]="displayContact">
              @for (c of filteredContacts; track c.id) {
                <mat-option [value]="c">
                  <div class="contact-option">
                    <span class="contact-name">{{ c.name }}</span>
                    <span class="contact-id">{{ c.id }}</span>
                  </div>
                </mat-option>
              }
            </mat-autocomplete>
            @if (form.get('chatId')?.hasError('required') && form.get('chatId')?.touched) {
              <mat-error>Chat ID is required</mat-error>
            }
            <mat-hint>Type 3+ characters to search, or enter a chat ID directly</mat-hint>
          </mat-form-field>
        }

        <div class="webhooks-section" formArrayName="targetUrls">
          <p class="section-label">Webhook URLs</p>
          @for (ctrl of urlControls; track $index) {
            <div class="url-row">
              <mat-form-field appearance="outline" class="url-field">
                <mat-label>Webhook URL {{ $index + 1 }}</mat-label>
                <input matInput [formControlName]="$index"
                       placeholder="https://n8n.example.com/webhook/…">
                @if (ctrl.hasError('required') && ctrl.touched) {
                  <mat-error>URL is required</mat-error>
                }
                @if (ctrl.hasError('url') && ctrl.touched) {
                  <mat-error>Must be a valid http:// or https:// URL</mat-error>
                }
              </mat-form-field>
              <button mat-icon-button color="warn" type="button"
                      (click)="removeUrl($index)"
                      [disabled]="urlControls.length === 1"
                      matTooltip="Remove webhook">
                <mat-icon>remove_circle_outline</mat-icon>
              </button>
            </div>
          }
          <button mat-button type="button" (click)="addUrl()">
            <mat-icon>add</mat-icon> Add another webhook URL
          </button>
        </div>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="saving">
        @if (saving) {
          <mat-progress-spinner diameter="20" mode="indeterminate" />
        } @else {
          Save
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 4px; min-width: 300px; padding-top: 8px; }
    .full-width { width: 100%; }
    .url-row { display: flex; align-items: flex-start; gap: 8px; }
    .url-field { flex: 1; }
    .webhooks-section { display: flex; flex-direction: column; }
    .section-label { margin: 8px 0 4px; font-size: 13px; opacity: 0.7; }
    .contact-option { display: flex; flex-direction: column; line-height: 1.4; }
    .contact-id { font-size: 11px; opacity: 0.6; }
  `],
})
export class RouteDialogComponent implements OnInit {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form!: any;
  saving = false;
  filteredContacts: Contact[] = [];
  isEdit: boolean;
  routeData: Route;

  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<RouteDialogComponent>);
  private routeSvc = inject(RouteService);
  private contactsSvc = inject(ContactsService);
  private snackBar = inject(MatSnackBar);
  private injectedData: Route | null = inject(MAT_DIALOG_DATA, { optional: true });

  constructor() {
    this.isEdit = !!(this.injectedData && this.injectedData.chatId);
    this.routeData = this.injectedData ?? { chatId: '', name: '', targetUrls: [] };
  }

  ngOnInit(): void {
    const initialUrls = this.isEdit && this.routeData.targetUrls.length
      ? this.routeData.targetUrls : [''];

    this.form = this.fb.group({
      name: [this.isEdit ? this.routeData.name : '', Validators.required],
      chatId: [{ value: '', disabled: this.isEdit }, this.isEdit ? [] : [Validators.required]],
      targetUrls: this.fb.array(
        initialUrls.map(url => new FormControl(url, [Validators.required, urlValidator]))
      ),
    });

    if (!this.isEdit) {
      this.form.get('chatId').valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        filter((v: unknown) => typeof v === 'string' && v.trim().length >= 3),
        switchMap((v: unknown) => this.contactsSvc.search(typeof v === 'string' ? v : '')),
      ).subscribe((contacts: Contact[]) => this.filteredContacts = contacts);
    }
  }

  get urlControls(): AbstractControl[] {
    return (this.form.get('targetUrls') as FormArray).controls;
  }

  displayContact(c: Contact | string | null): string {
    if (!c) return '';
    return typeof c === 'string' ? c : c.id;
  }

  addUrl(): void {
    (this.form.get('targetUrls') as FormArray).push(
      new FormControl('', [Validators.required, urlValidator])
    );
  }

  removeUrl(i: number): void {
    (this.form.get('targetUrls') as FormArray).removeAt(i);
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving = true;

    const raw = this.form.value;
    const chatIdRaw = this.form.get('chatId').value;
    const chatId = this.isEdit
      ? this.routeData.chatId
      : (typeof chatIdRaw === 'object' && chatIdRaw !== null
          ? (chatIdRaw as Contact).id
          : (chatIdRaw as string).trim());

    const payload = {
      chat_id: chatId,
      name: raw.name ?? chatId,
      target_urls: (raw.targetUrls as string[]).map((u: string) => u.trim()),
    };

    const op$ = this.isEdit
      ? this.routeSvc.updateRoute(chatId, payload)
      : this.routeSvc.createRoute(payload);

    op$.subscribe({
      next: () => { this.saving = false; this.dialogRef.close(true); },
      error: (err: { error?: { detail?: string } }) => {
        this.saving = false;
        this.snackBar.open(err.error?.detail ?? 'Failed to save route', 'Dismiss', { duration: 4000 });
      },
    });
  }
}
