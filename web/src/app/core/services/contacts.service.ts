import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface Contact {
  id: string;
  name: string;
  display_text: string;
}

@Injectable({ providedIn: 'root' })
export class ContactsService {
  private http = inject(HttpClient);

  search(q: string): Observable<Contact[]> {
    if (!q || q.trim().length < 3) return of([]);
    return this.http
      .get<{ contacts: Contact[] }>('/api/v1/contacts/search', { params: { q } })
      .pipe(
        map(r => r.contacts),
        catchError(() => of([]))
      );
  }
}
