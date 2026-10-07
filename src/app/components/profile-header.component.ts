import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Person } from '../models';
import { AvatarComponent } from './avatar.component';
import { IconComponent } from '../shared/icon.component';
@Component({
  selector: 'g-profile-header',
  standalone: true,
  imports: [AvatarComponent, IconComponent],
  template: `<div class="profile-cover">
      <span>PLAY. CONNECT. REPEAT.</span>
      <div class="cover-lines"></div>
    </div>
    <div class="profile-header-content">
      <g-avatar [src]="person.avatar_url" [name]="person.full_name" [size]="112" />
      <div class="profile-identity">
        <h1>{{ person.full_name }}</h1>
        <span>&#64;{{ person.username }}</span>
        <p><g-icon name="location-outline" />{{ person.location }}</p>
      </div>
      <div class="profile-actions">
        @if (own) {
          <button class="button secondary" (click)="edit.emit()">
            <g-icon name="settings-outline" />Edit profile
          </button>
        } @else {
          <button class="button primary" [disabled]="busy" (click)="follow.emit()">
            <g-icon [name]="person.is_following ? 'checkmark-outline' : 'add-outline'" />{{
              person.is_following ? 'Following' : 'Follow'
            }}</button
          ><button class="button secondary" [disabled]="busy" (click)="message.emit()">
            <g-icon name="chatbubble-ellipses-outline" />Message
          </button>
        }
      </div>
    </div>
    <div class="profile-statistics">
      <div>
        <strong>{{ person.games_joined }}</strong
        ><span>Games joined</span>
      </div>
      <div>
        <strong>{{ person.games_created }}</strong
        ><span>Games created</span>
      </div>
      <button (click)="connections.emit('friends')">
        <strong>{{ person.friends }}</strong
        ><span>Friends</span></button
      ><button (click)="connections.emit('followers')">
        <strong>{{ person.followers }}</strong
        ><span>Followers</span></button
      ><button (click)="connections.emit('following')">
        <strong>{{ person.following }}</strong
        ><span>Following</span>
      </button>
    </div>`,
})
export class ProfileHeaderComponent {
  @Input({ required: true }) person!: Person;
  @Input() own = false;
  @Input() busy = false;
  @Output() edit = new EventEmitter<void>();
  @Output() follow = new EventEmitter<void>();
  @Output() message = new EventEmitter<void>();
  @Output() connections = new EventEmitter<string>();
}
