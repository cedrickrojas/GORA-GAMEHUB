import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonTabBar, IonTabButton, IonLabel } from '@ionic/angular/standalone';
import { IconComponent } from '../shared/icon.component';
@Component({
  selector: 'g-bottom-navigation',
  standalone: true,
  imports: [RouterLink, IonTabBar, IonTabButton, IonLabel, IconComponent],
  template: `<ion-tab-bar class="bottom-navigation" aria-label="Mobile navigation">
    @for (n of navigation; track n.path) {
      <ion-tab-button [routerLink]="n.path" [selected]="url.startsWith(n.path)"
        ><g-icon [name]="n.icon" /><ion-label>{{ n.label }}</ion-label></ion-tab-button
      >
    }
  </ion-tab-bar>`,
})
export class BottomNavigationComponent {
  @Input() url = '';
  navigation = [
    { label: 'Home', path: '/tabs/home', icon: 'home-outline' },
    { label: 'Discover', path: '/tabs/discover', icon: 'compass-outline' },
    { label: 'Schedule', path: '/tabs/schedule', icon: 'calendar-outline' },
    { label: 'Messages', path: '/tabs/messages', icon: 'chatbubble-ellipses-outline' },
    { label: 'Profile', path: '/tabs/profile', icon: 'person-outline' },
  ];
}
