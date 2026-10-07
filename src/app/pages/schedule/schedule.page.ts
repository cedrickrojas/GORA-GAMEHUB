import { PhotoPipe } from '../../shared/photo.pipe';
import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Game } from '../../models';
import { GameCalendarComponent } from '../../components/game-calendar.component';
import { EmptyStateComponent, LoadingStateComponent } from '../../components/states.component';
import { IconComponent } from '../../shared/icon.component';
import { EventStatusComponent } from '../../components/event-status.component';
@Component({
  standalone: true,
  imports: [
    EventStatusComponent,
    PhotoPipe,
    DatePipe,
    RouterLink,
    GameCalendarComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    IconComponent,
  ],
  template: `<div class="page-heading">
      <div>
        <div class="eyebrow">MAKE TIME FOR THE GAME</div>
        <h1>Your game plan<span class="orange-text">.</span></h1>
        <p>Show up. Connect. Leave it all on the court.</p>
      </div>
      <a routerLink="/create-event" class="button primary"
        ><g-icon name="add-outline" />Create a game</a
      >
    </div>
    @if (loading()) {
      <g-loading />
    } @else if (error()) {
      <g-empty
        title="Couldn’t load your schedule"
        [description]="error()"
        action="Try again"
        (retry)="load()"
      />
    } @else {
      <g-calendar [games]="games()" (selection)="period = $event" />
      <div class="profile-tabs schedule-tabs">
        @for (t of tabs; track t) {
          <button [class.active]="tab === t" (click)="tab = t; period = null">{{ t }}</button>
        }
      </div>
      <div class="section-heading">
        <h2>
          {{ period ? 'Games in this period' : tab + ' games' }}
          <span class="count-label">{{ filtered().length }}</span>
        </h2>
        @if (period) {
          <button class="text-button" (click)="period = null">
            Show all {{ tab.toLowerCase() }}
          </button>
        }
      </div>
      <div class="schedule-list">
        @for (e of filtered(); track e.id) {
          <a [routerLink]="['/event', e.id]" class="schedule-event"
            ><div class="schedule-date">
              <span>{{ e.starts_at | date: 'MMM' : '+0800' }}</span
              ><strong>{{ e.starts_at | date: 'd' : '+0800' }}</strong
              ><small>{{ e.starts_at | date: 'EEE' : '+0800' }}</small>
            </div>
            <img [src]="e.image_url | photo" [alt]="e.sport" loading="lazy" />
            <div class="schedule-event-info">
              <div class="card-date">{{ e.sport }}<span>·</span>{{ e.type }}</div>
              <h3>{{ e.title }}</h3>
              <p>
                <g-icon name="time-outline" />{{ e.starts_at | date: 'h:mm a' : '+0800' }} –
                {{ e.ends_at | date: 'h:mm a' : '+0800' }}<span>·</span
                ><g-icon name="location-outline" />{{ e.venue }}
              </p>
            </div>
            <div class="schedule-event-status">
              <g-status
                [status]="
                  e.status === 'cancelled'
                    ? 'Cancelled'
                    : e.host_id === api.user()?.id
                      ? 'Hosting'
                      : e.joined_status === 'pending'
                        ? 'Pending approval'
                        : 'Joined'
                "
              /><small>{{ e.participants }} / {{ e.max_participants }} players</small>
            </div>
            <g-icon name="chevron-forward-outline"
          /></a>
        }
        @if (!filtered().length) {
          <g-empty
            title="Room for your next great game"
            description="Discover a game, join the crew, and it will appear here."
          /><a routerLink="/tabs/discover" class="button primary"
            >Discover games<g-icon name="arrow-forward-outline"
          /></a>
        }
      </div>
    }`,
})
export class SchedulePage {
  api = inject(ApiService);
  games = signal<Game[]>([]);
  loading = signal(true);
  error = signal('');
  tab = 'Upcoming';
  tabs = ['Upcoming', 'Joined', 'Created', 'Past', 'Cancelled'];
  period: { date: Date; view: string; dayOnly: boolean } | null = null;
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.games.set(await this.api.get<Game[]>('/events?scope=mine&limit=100'));
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
  filtered() {
    const now = Date.now();
    return this.games()
      .filter((e) => {
        if (this.tab === 'Cancelled') return e.status === 'cancelled';
        if (e.status === 'cancelled') return false;
        if (this.tab === 'Past') return new Date(e.ends_at).getTime() < now;
        if (new Date(e.ends_at).getTime() < now) return false;
        if (this.tab === 'Created' && e.host_id !== this.api.user()?.id) return false;
        if (this.tab === 'Joined' && e.host_id === this.api.user()?.id) return false;
        return true;
      })
      .filter((e) => {
        if (!this.period) return true;
        const d = new Date(e.starts_at),
          a = this.period.date;
        if (this.period.dayOnly || this.period.view === 'Today')
          return (
            d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }) ===
            a.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
          );
        if (this.period.view === 'Month')
          return d.getMonth() === a.getMonth() && d.getFullYear() === a.getFullYear();
        const start = new Date(a);
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - start.getDay());
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        return d >= start && d < end;
      });
  }
}
