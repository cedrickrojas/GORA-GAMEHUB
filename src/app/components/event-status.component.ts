import { Component, Input } from '@angular/core';
@Component({
  selector: 'g-status',
  standalone: true,
  template: `<span
    class="status-pill"
    [class.cancelled]="status === 'Cancelled' || status === 'banned' || status === 'suspended'"
    >{{ status }}</span
  >`,
})
export class EventStatusComponent {
  @Input() status = 'Joined';
}
