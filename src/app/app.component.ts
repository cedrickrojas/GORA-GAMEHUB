import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { IonApp } from '@ionic/angular/standalone';
import { filter } from 'rxjs';
import { ApiService } from './services/api.service';
import { UiService } from './services/ui.service';
import { IconComponent } from './shared/icon.component';
import { AvatarComponent } from './components/avatar.component';
import { SearchBarComponent } from './components/search-bar.component';
import { BottomNavigationComponent } from './components/bottom-navigation.component';
import { CreateEventButtonComponent } from './components/create-event-button.component';
@Component({
  selector: 'gora-app',
  standalone: true,
  imports: [
    IonApp,
    BottomNavigationComponent,
    CreateEventButtonComponent,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    IconComponent,
    AvatarComponent,
    SearchBarComponent,
  ],
  template: ` <ion-app
    ><div class="app-body" [class.auth-layout]="standalonePage()">
      @if (!standalonePage()) {
        <aside class="sidebar">
          <a routerLink="/tabs/home" class="brand" aria-label="GORA home"
            ><span class="brand-mark"><i></i><i></i><i></i></span>GORA<span class="brand-dot"
              >.</span
            ></a
          ><span class="brand-caption">FIND YOUR GAME.</span>
          <div class="nav-caption">YOUR PLAYBOOK</div>
          <nav aria-label="Main navigation">
            @for (n of navigation; track n.path) {
              <a [routerLink]="n.path" routerLinkActive="active"
                ><g-icon [name]="n.icon" /><span>{{ n.label }}</span>
                @if (n.label === 'Messages' && unread()) {
                  <b class="nav-count">{{ unread() }}</b>
                }
              </a>
            }
          </nav>
          <g-create-button />
          <div class="sidebar-bottom">
            <div class="sidebar-promo">
              <span class="mini-brand">PLAY. CONNECT. REPEAT.</span>
              <h3>Better games.<br />Better company.</h3>
              <p>Your people are out there.</p>
              <a routerLink="/people">Find your crew<g-icon name="arrow-forward-outline" /></a>
            </div>
            @if (api.user(); as user) {
              <a routerLink="/tabs/profile" class="sidebar-account"
                ><g-avatar [src]="user.avatar_url" [name]="user.full_name" />
                <div>
                  <strong>{{ user.full_name }}</strong
                  ><span>&#64;{{ user.username }}</span>
                </div>
                <g-icon name="settings-outline"
              /></a>
            } @else {
              <a routerLink="/login" class="sidebar-account"
                ><g-icon name="person-outline" />
                <div><strong>Join the crew</strong><span>Sign in to GORA</span></div>
                <g-icon name="arrow-forward-outline"
              /></a>
            }
          </div>
        </aside>
        <header class="topbar">
          <div class="mobile-brand">
            <a routerLink="/tabs/home" class="brand">GORA<span class="brand-dot">.</span></a>
          </div>
          <g-search (search)="search($event)" />
          <div class="topbar-actions">
            <button class="location-picker" (click)="location()">
              <g-icon name="location-outline" />{{ currentLocation()
              }}<g-icon name="chevron-down-outline" /></button
            ><span class="topbar-divider"></span
            ><a
              class="notification-button icon-button"
              routerLink="/notifications"
              aria-label="Notifications"
              ><g-icon name="notifications-outline" />
              @if (noticeCount()) {
                <i></i>
              }
            </a>
            @if (api.user(); as u) {
              <a routerLink="/tabs/profile" aria-label="Your profile"
                ><g-avatar [src]="u.avatar_url" [name]="u.full_name" [size]="36"
              /></a>
            } @else {
              <a routerLink="/login" class="button secondary small">Sign in</a>
            }
          </div>
        </header>
      }
      <main class="workspace" id="main-content"><router-outlet /></main>
      @if (!standalonePage()) {
        <g-create-button [mobile]="true" /><g-bottom-navigation [url]="url()" />
      }</div
  ></ion-app>`,
})
export class AppComponent {
  api = inject(ApiService);
  ui = inject(UiService);
  router = inject(Router);
  url = signal(this.router.url);
  standalonePage = signal(true);
  unread = signal(0);
  noticeCount = signal(0);
  currentLocation = signal('Metro Manila');
  navigation = [
    { label: 'Home', path: '/tabs/home', icon: 'home-outline' },
    { label: 'Discover', path: '/tabs/discover', icon: 'compass-outline' },
    { label: 'Find people', path: '/people', icon: 'people-outline' },
    { label: 'Schedule', path: '/tabs/schedule', icon: 'calendar-outline' },
    { label: 'Messages', path: '/tabs/messages', icon: 'chatbubble-ellipses-outline' },
    { label: 'Communities', path: '/communities', icon: 'people-circle-outline' },
  ];
  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.url.set(this.router.url);
      const path = this.router.url.split(/[?#]/)[0];
      this.standalonePage.set(
        path === '/' || /^\/(login|register|forgot-password|reset-password)(\/|$)/.test(path),
      );
      document.querySelector('.app-body')?.scrollTo({ top: 0 });
      void this.badges();
    });
    void this.api.initialize().then(() => this.badges());
  }
  async badges() {
    if (!this.api.user()) {
      this.noticeCount.set(0);
      this.unread.set(0);
      return;
    }
    const results = await Promise.allSettled([
      this.api.get<any[]>('/notifications'),
      this.api.get<any[]>('/conversations'),
    ]);
    if (results[0].status === 'fulfilled')
      this.noticeCount.set(results[0].value.filter((n) => !n.read_at).length);
    if (results[1].status === 'fulfilled')
      this.unread.set(results[1].value.reduce((a, c) => a + c.unread, 0));
  }
  create() {
    if (this.api.requireUser()) void this.router.navigate(['/create-event']);
  }
  search(q: string) {
    void this.router.navigate(['/tabs/discover'], { queryParams: { q } });
  }
  async location() {
    const loc = await this.ui.prompt(
      'Where’s your game?',
      'Find games in your city.',
      'e.g. Makati, Manila',
    );
    if (loc) {
      this.currentLocation.set(loc);
      void this.router.navigate(['/tabs/discover'], { queryParams: { location: loc } });
    }
  }
}
