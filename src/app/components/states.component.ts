import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonSkeletonText, IonSpinner } from '@ionic/angular/standalone';
import { IconComponent } from '../shared/icon.component';
@Component({
  selector: 'g-empty',
  standalone: true,
  imports: [IconComponent],
  template: `<div class="empty-state">
    <g-icon [name]="icon" />
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    @if (action) {
      <button class="button secondary" (click)="retry.emit()">{{ action }}</button>
    }
  </div>`,
})
export class EmptyStateComponent {
  @Input() title = 'No games yet';
  @Input() description = 'Your next great game is just around the corner.';
  @Input() icon = 'basketball-outline';
  @Input() action = '';
  @Output() retry = new EventEmitter<void>();
}
@Component({
  selector: 'g-loading',
  standalone: true,
  imports: [IonSkeletonText, IonSpinner],
  template: `<div class="loading-state" role="status" aria-label="Loading">
    <ion-spinner name="crescent" /><span class="sr-only">Loading…</span>
    <div class="skeleton-grid">
      @for (i of [1, 2, 3]; track i) {
        <div>
          <ion-skeleton-text [animated]="true" style="height:160px" /><ion-skeleton-text
            [animated]="true"
            style="width:75%;height:24px"
          /><ion-skeleton-text [animated]="true" style="width:55%;height:16px" />
        </div>
      }
    </div>
  </div>`,
})
export class LoadingStateComponent {}
