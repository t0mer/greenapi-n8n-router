import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-logs',
  standalone: true,
  template: `<p style="padding:24px">Logs tab</p>`,
})
export class LogsComponent {
  @Input() active = false;
}
