import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Notice } from '../models';
import { AvatarComponent } from './avatar.component';
import { IconComponent } from '../shared/icon.component';
@Component({
  selector: 'g-notification',
  standalone: true,
  imports: [DatePipe, AvatarComponent, IconComponent],
  template: `<button
    class="notification-row"
    [class.unread]="!notice.read_at"
    (click)="open.emit(notice)"
  >
    @if (notice.avatar_url) {
      <g-avatar [src]="notice.avatar_url" name="Sender" [size]="44" />
    } @else {
      <span class="notification-symbol"
        ><g-icon
          [name]="
            notice.type === 'message'
              ? 'chatbubble-ellipses-outline'
              : notice.type === 'reminder'
                ? 'calendar-outline'
                : 'notifications-outline'
          "
      /></span>
    }
    <span
      ><strong>{{ notice.title }}</strong>
      @if (notice.body) {
        <p>{{ notice.body }}</p>
      }
      <small>{{ notice.created_at | date: 'MMM d, h:mm a' : '+0800' }}</small></span
    >
    @if (!notice.read_at) {
      <i></i>
    }
    <g-icon name="chevron-forward-outline" />
  </button>`,
})
export class NotificationItemComponent {
  @Input({ required: true }) notice!: Notice;
  @Output() open = new EventEmitter<Notice>();
}
