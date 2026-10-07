import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { IconComponent } from '../shared/icon.component';
@Component({
  selector: 'g-create-button',
  standalone: true,
  imports: [IconComponent],
  template: `<button
    [class]="mobile ? 'mobile-create' : 'button primary create-sidebar'"
    aria-label="Create a game"
    (click)="create()"
  >
    <g-icon name="add-outline" />
    @if (!mobile) {
      Create a game
    }
  </button>`,
})
export class CreateEventButtonComponent {
  @Input() mobile = false;
  api = inject(ApiService);
  router = inject(Router);
  create() {
    if (this.api.requireUser()) void this.router.navigate(['/create-event']);
  }
}
