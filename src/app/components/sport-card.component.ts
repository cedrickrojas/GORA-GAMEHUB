import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Sport } from '../models';
import { PhotoPipe } from '../shared/photo.pipe';
import { IconComponent } from '../shared/icon.component';
@Component({
  selector: 'g-sport-card',
  standalone: true,
  imports: [RouterLink, PhotoPipe, IconComponent],
  template: `<a class="sport-card" [routerLink]="['/sports', sport.id]"
    ><img [src]="sport.image_url | photo" [alt]="sport.name" loading="lazy" />
    <div>
      <span class="sport-card-icon"><g-icon [name]="sport.icon + '-outline'" /></span>
      <h3>{{ sport.name }}</h3>
      <p>{{ sport.description }}</p>
      <span
        >{{ sport.active_games }} active games · {{ sport.active_communities }} communities<g-icon
          name="arrow-forward-outline"
      /></span></div
  ></a>`,
})
export class SportCardComponent {
  @Input({ required: true }) sport!: Sport;
}
