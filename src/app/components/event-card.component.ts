import { PhotoPipe } from '../shared/photo.pipe';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Game } from '../models';
import { IconComponent } from '../shared/icon.component';
import { AvatarComponent } from './avatar.component';
@Component({
  selector: 'g-event-card',
  standalone: true,
  imports: [PhotoPipe, DatePipe, RouterLink, IconComponent, AvatarComponent],
  template: `<article class="event-card">
    <a class="event-image" [routerLink]="['/event', game.id]"
      ><img [src]="game.image_url | photo" [alt]="game.sport + ' game'" loading="lazy" /><span
        class="sport-tag"
        ><g-icon [name]="game.sport_icon + '-outline'" />{{ game.sport }}</span
      ><span class="event-type">{{
        game.type === 'Watch a Game' ? 'WATCH' : game.type === 'Practice' ? 'PRACTICE' : 'PLAY'
      }}</span></a
    >
    <div class="event-card-body">
      <div class="card-date">
        {{ game.starts_at | date: 'EEE, MMM d' : '+0800' }}<span>·</span
        >{{ game.starts_at | date: 'h:mm a' : '+0800' }}
      </div>
      <a [routerLink]="['/event', game.id]" class="card-title">{{ game.title }}</a>
      <p class="card-location"><g-icon name="location-outline" />{{ game.venue }}</p>
      <div class="event-meta">
        <span class="level">{{ game.skill_level === 'Any' ? 'All levels' : game.skill_level }}</span
        ><span>{{ game.max_participants - game.participants }} spots left</span>
      </div>
      <div class="card-footer">
        <div class="avatar-stack">
          @for (a of game.avatars; track a.id) {
            <g-avatar [src]="a.avatar_url | photo" [name]="a.name" [size]="25" />
          }
          <span
            >{{ game.participants }}<small>/{{ game.max_participants }}</small></span
          >
        </div>
        <button
          class="join-button"
          [disabled]="
            busy ||
            game.status === 'cancelled' ||
            (!game.joined_status && game.participants >= game.max_participants)
          "
          (click)="join.emit(game)"
        >
          {{
            game.status === 'cancelled'
              ? 'Cancelled'
              : game.joined_status === 'pending'
                ? 'Pending'
                : game.joined_status
                  ? 'Joined'
                  : game.participants >= game.max_participants
                    ? 'Full'
                    : 'Join game'
          }}<g-icon [name]="game.joined_status ? 'checkmark-outline' : 'arrow-forward-outline'" />
        </button>
      </div>
    </div>
  </article>`,
})
export class EventCardComponent {
  @Input({ required: true }) game!: Game;
  @Input() busy = false;
  @Output() join = new EventEmitter<Game>();
}
