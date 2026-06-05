import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _isDark = new BehaviorSubject<boolean>(this.loadPreference());
  isDark$ = this._isDark.asObservable();

  private loadPreference(): boolean {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  init(): void {
    this._isDark.subscribe(dark => {
      document.documentElement.classList.toggle('light-theme', !dark);
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    });
  }

  toggle(): void {
    this._isDark.next(!this._isDark.value);
  }

  get isDark(): boolean {
    return this._isDark.value;
  }
}
