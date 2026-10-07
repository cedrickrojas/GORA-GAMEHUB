import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Game } from '../../models';
import { IconComponent } from '../../shared/icon.component';
import { EventCardComponent } from '../../components/event-card.component';
import { EmptyStateComponent, LoadingStateComponent } from '../../components/states.component';

@Component({
  standalone: true,
  imports: [
    RouterLink,
    IconComponent,
    EventCardComponent,
    EmptyStateComponent,
    LoadingStateComponent,
  ],
  templateUrl: './landing.page.html',
  styleUrl: './landing.page.scss',
})
export class LandingPage {
  api = inject(ApiService);
  private router = inject(Router);
  games = signal<Game[]>([]);
  loading = signal(true);
  error = signal('');
  year = new Date().getFullYear();
  sports = [
    { name: 'Basketball', icon: 'basketball-outline' },
    { name: 'Football', icon: 'football-outline' },
    { name: 'Volleyball', icon: 'volleyball-outline' },
    { name: 'Tennis', icon: 'tennisball-outline' },
    { name: 'Badminton', icon: 'fitness-outline' },
    { name: 'Esports', icon: 'game-controller-outline' },
  ];
  steps = [
    {
      number: '01',
      icon: 'compass-outline',
      title: 'Find your game.',
      description:
        'A pickup run, a watch party, or your next match. Discover what’s happening around you.',
    },
    {
      number: '02',
      icon: 'people-outline',
      title: 'Meet your people.',
      description:
        'Connect with fans and players who share your sports, your teams, and your energy.',
    },
    {
      number: '03',
      icon: 'calendar-outline',
      title: 'Make it happen.',
      description:
        'Join a game or host your own. Get the crew together in chat, then show up and play.',
    },
  ];

  constructor() {
    void this.loadGames();
  }

  async loadGames() {
    this.loading.set(true);
    this.error.set('');
    try {
      const games = await this.api.get<Game[]>('/events');
      this.games.set(
        games
          .filter((game) => game.status === 'active' && new Date(game.starts_at) > new Date())
          .slice(0, 3),
      );
    } catch (error) {
      this.error.set((error as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  scrollTo(event: Event, section: string) {
    event.preventDefault();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const target = document.getElementById(section);
    target?.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'start' });
    if (section === 'landing-content') target?.focus({ preventScroll: true });
  }

  openGame(game: Game) {
    void this.router.navigate(['/event', game.id]);
  }
}
