import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Person } from '../models';
import { AvatarComponent } from './avatar.component';
import { IconComponent } from '../shared/icon.component';
import { ApiService } from '../services/api.service';
import { UiService } from '../services/ui.service';
@Component({
  selector: 'g-user-card',
  standalone: true,
  imports: [RouterLink, AvatarComponent, IconComponent],
  template: `<article class="user-card">
    <div class="user-top">
      <a [routerLink]="['/user', person.id]"
        ><g-avatar [src]="person.avatar_url" [name]="person.full_name" [size]="52"
      /></a>
      @if (person.match_percentage) {
        <span class="match-badge"><span></span>{{ person.match_percentage }}% match</span>
      }
    </div>
    <a class="person-name" [routerLink]="['/user', person.id]">{{ person.full_name }}</a
    ><span class="username">&#64;{{ person.username }}</span>
    <p class="person-location"><g-icon name="location-outline" />{{ person.location }}</p>
    <p class="person-bio">{{ person.bio }}</p>
    <div class="person-tags">
      @for (s of person.favorite_sports.slice(0, 2); track s) {
        <span>{{ s }}</span>
      }
    </div>
    @if (person.favorite_team) {
      <p class="team-label">
        <g-icon name="flag-outline" />{{ person.favorite_team
        }}<span>· {{ person.games_joined }} games</span>
      </p>
    }
    @if (socialActions && person.id !== api.user()?.id) {
      <div class="person-social-actions">
        <button
          class="button secondary small"
          [disabled]="following()"
          [attr.aria-pressed]="!!person.is_following"
          (click)="follow()"
        >
          <g-icon [name]="person.is_following ? 'checkmark-outline' : 'person-add-outline'" />{{
            following() ? 'Updating…' : person.is_following ? 'Following' : 'Follow'
          }}
        </button>
        <button class="button secondary small" [disabled]="messaging()" (click)="message()">
          <g-icon name="chatbubble-ellipses-outline" />{{ messaging() ? 'Opening…' : 'Message' }}
        </button>
      </div>
    }
    <div class="person-actions">
      @if (showInvite) {
        <button class="button secondary small" (click)="invite.emit(person)">
          <g-icon name="person-add-outline" />Invite
        </button>
      }
      <a [routerLink]="['/user', person.id]">View profile<g-icon name="arrow-forward-outline" /></a>
    </div>
  </article>`,
})
export class UserCardComponent {
  @Input({ required: true }) person!: Person;
  @Input() socialActions = false;
  @Input() showInvite = true;
  @Output() invite = new EventEmitter<Person>();
  api = inject(ApiService);
  ui = inject(UiService);
  router = inject(Router);
  following = signal(false);
  messaging = signal(false);
  async follow() {
    if (this.following() || !this.api.requireUser()) return;
    this.following.set(true);
    try {
      await this.ui.run(async () => {
        const followed = !!this.person.is_following;
        if (followed) await this.api.delete('/people/' + this.person.id + '/follow');
        else await this.api.post('/people/' + this.person.id + '/follow');
        this.person = {
          ...this.person,
          is_following: !followed,
          followers: this.person.followers + (followed ? -1 : 1),
        };
      });
    } finally {
      this.following.set(false);
    }
  }
  async message() {
    if (this.messaging() || !this.api.requireUser()) return;
    this.messaging.set(true);
    try {
      await this.ui.run(async () => {
        const conversation = await this.api.post<{ id: string }>('/conversations', {
          user_id: this.person.id,
        });
        await this.router.navigate(['/tabs/messages'], {
          queryParams: { conversation: conversation.id },
        });
      });
    } finally {
      this.messaging.set(false);
    }
  }
}
