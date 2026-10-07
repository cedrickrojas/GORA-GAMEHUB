import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Message } from '../models';
import { AvatarComponent } from './avatar.component';
import { IconComponent } from '../shared/icon.component';
@Component({
  selector: 'g-message',
  standalone: true,
  imports: [DatePipe, AvatarComponent, IconComponent],
  template: `<div class="message-row" [class.own]="own">
    @if (!own) {
      <g-avatar [src]="message.avatar_url" [name]="message.full_name" [size]="30" />
    }
    <div class="message-content">
      @if (!own) {
        <span class="message-author"
          >{{ message.full_name }} <small>&#64;{{ message.username }}</small></span
        >
      }
      <div class="message-bubble">{{ message.body }}</div>
      <span class="message-time">{{ message.created_at | date: 'MMM d · h:mm a' : '+0800' }}</span>
    </div>
    @if (!own) {
      <button
        class="message-report icon-button"
        aria-label="Report message"
        (click)="report.emit(message)"
      >
        <g-icon name="flag-outline" />
      </button>
    }
  </div>`,
})
export class MessageBubbleComponent {
  @Input({ required: true }) message!: Message;
  @Input() own = false;
  @Output() report = new EventEmitter<Message>();
}
