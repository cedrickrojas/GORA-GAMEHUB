import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonModal } from '@ionic/angular/standalone';
import { IconComponent } from '../shared/icon.component';
@Component({
  selector: 'g-dialog',
  standalone: true,
  imports: [IonModal, IconComponent],
  template: `<ion-modal
    [isOpen]="open"
    [canDismiss]="dismissible"
    (didDismiss)="closed.emit()"
    cssClass="gora-modal"
    ><ng-template
      ><div class="dialog-body">
        <div class="dialog-heading">
          <div>
            <span class="eyebrow">GORA CONNECTIONS</span>
            <h2>{{ title }}</h2>
          </div>
          <button
            class="icon-button"
            aria-label="Close dialog"
            [disabled]="!dismissible"
            (click)="closed.emit()"
          >
            <g-icon name="close-outline" />
          </button>
        </div>
        <ng-content /></div></ng-template
  ></ion-modal>`,
})
export class DialogComponent {
  @Input() open = false;
  @Input() dismissible = true;
  @Input() title = 'Invite your crew';
  @Output() closed = new EventEmitter<void>();
}
