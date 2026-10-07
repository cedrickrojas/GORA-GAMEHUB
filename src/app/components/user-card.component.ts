import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Person } from '../models';
import { AvatarComponent } from './avatar.component';
import { IconComponent } from '../shared/icon.component';
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
    <div class="person-actions">
      <button class="button secondary small" (click)="invite.emit(person)">
        <g-icon name="person-add-outline" />Invite</button
      ><a [routerLink]="['/user', person.id]"
        >View profile<g-icon name="arrow-forward-outline"
      /></a>
    </div>
  </article>`,
})
export class UserCardComponent {
  @Input({ required: true }) person!: Person;
  @Output() invite = new EventEmitter<Person>();
}
