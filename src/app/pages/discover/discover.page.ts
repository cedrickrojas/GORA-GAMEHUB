import { Component, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { Game } from '../../models';
import { SearchBarComponent } from '../../components/search-bar.component';
import { CategoryChipComponent } from '../../components/category-chip.component';
import { EventCardComponent } from '../../components/event-card.component';
import { EmptyStateComponent, LoadingStateComponent } from '../../components/states.component';
import { IconComponent } from '../../shared/icon.component';
import { Subscription } from 'rxjs';
import { PhotoPipe } from '../../shared/photo.pipe';
import { SportCardComponent } from '../../components/sport-card.component';
@Component({
  standalone: true,
  imports: [
    PhotoPipe,
    SportCardComponent,
    FormsModule,
    RouterLink,
    SearchBarComponent,
    CategoryChipComponent,
    EventCardComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    IconComponent,
  ],
  template: `<div class="page-heading">
      <div>
        <div class="eyebrow">GET OUT THERE</div>
        <h1>Find your next game<span class="orange-text">.</span></h1>
        <p>Pickup runs, big-screen moments, and everything in between.</p>
      </div>
      <a routerLink="/create-event" class="button primary"
        ><g-icon name="add-outline" />Create a game</a
      >
    </div>
    <div class="discovery-toolbar">
      <g-search
        placeholder="Try ‘Basketball near Manila’"
        [value]="q"
        (change)="search($event)"
      /><button class="button secondary" [class.active]="filters" (click)="filters = !filters">
        <g-icon name="options-outline" />Filters
      </button>
    </div>
    <div class="category-row discovery-categories">
      <g-category name="All sports" [active]="!sport" (select)="selectSport('')" />
      @for (s of api.sports(); track s.id) {
        <g-category
          [name]="s.name"
          [icon]="s.icon + '-outline'"
          [active]="sport === s.name"
          (select)="selectSport(s.name)"
        />
      }
    </div>
    @if (filters) {
      <div class="filter-panel">
        <label
          >Game type<select [(ngModel)]="type" (change)="load()">
            <option value="">All game types</option>
            @for (t of types; track t) {
              <option>{{ t }}</option>
            }
          </select></label
        ><label
          >Location<input
            [(ngModel)]="location"
            placeholder="e.g. Makati"
            (input)="debounce()" /></label
        ><label>Date<input type="date" [(ngModel)]="date" (change)="load()" /></label
        ><button class="text-button" (click)="reset()">Reset filters</button>
      </div>
    }
    @if (showSports) {
      <section class="sport-catalog">
        <div class="section-heading">
          <h2>Every sport. Your people.</h2>
          <button class="text-button" (click)="showSports = false">
            Back to games<g-icon name="arrow-forward-outline" />
          </button>
        </div>
        <div class="sport-card-grid">
          @for (s of api.sports(); track s.id) {
            <g-sport-card [sport]="s" />
          }
        </div>
      </section>
    }
    <div class="section-heading">
      <h2>
        {{ sport || 'Upcoming games' }} <span class="count-label">{{ games().length }}</span>
      </h2>
      <span class="muted">{{ q ? 'Search results' : 'Find a spot. Make it yours.' }}</span>
    </div>
    @if (loading()) {
      <g-loading />
    } @else if (error()) {
      <g-empty
        title="Couldn’t load games"
        [description]="error()"
        action="Try again"
        (retry)="load()"
      />
    } @else if (!games().length) {
      <g-empty
        title="No games match yet"
        description="Try a different sport, city, or date — or start your own."
        action="Clear filters"
        (retry)="reset()"
      />
    } @else {
      @if (!q && !sport && !location && !date && !type) {
        <div class="discovery-highlights">
          @for (e of games(); track e.id) {
            @if (e.featured) {
              <a [routerLink]="['/event', e.id]" class="featured-game">
                <img [src]="e.image_url | photo" [alt]="e.sport" />
                <div class="featured-game-shade"></div>
                <div>
                  <span class="eyebrow"><g-icon name="flash-outline" />FEATURED EVENT</span>
                  <h2>{{ e.title }}</h2>
                  <p>{{ e.venue }} · {{ e.participants }} / {{ e.max_participants }} players</p>
                  <span class="button primary small"
                    >View game<g-icon name="arrow-forward-outline"
                  /></span>
                </div>
              </a>
            }
          }
          <div class="discovery-shortcuts panel">
            <h2>Make the next move</h2>
            <a routerLink="/people"
              ><g-icon name="people-outline" /><span
                >Find your watch-party crew<small>Shared teams. Shared moments.</small></span
              ><g-icon name="arrow-forward-outline" /></a
            ><a routerLink="/communities"
              ><g-icon name="people-circle-outline" /><span
                >Popular communities<small>Your local sports people.</small></span
              ><g-icon name="arrow-forward-outline" /></a
            ><button (click)="type = 'Watch a Game'; load()">
              <g-icon name="eye-outline" /><span
                >Catch a game together<small>Browse upcoming watch parties.</small></span
              ><g-icon name="arrow-forward-outline" />
            </button>
          </div>
        </div>
        <div class="section-heading">
          <h2>Upcoming near you</h2>
          <span class="muted">Find your next crew in Metro Manila.</span>
        </div>
      }
      <div class="event-grid discover-grid">
        @for (e of games(); track e.id) {
          <g-event-card [game]="e" [busy]="joining() === e.id" (join)="join($event)" />
        }
      </div>
    }
    <section class="discover-people-banner">
      <div>
        <span class="eyebrow">SAME GAME. NEW PEOPLE.</span>
        <h2>Build your game-day crew.</h2>
        <p>Find sports fans who share your team, your city, and your energy.</p>
      </div>
      <a routerLink="/people" class="button secondary"
        >Find people<g-icon name="arrow-forward-outline"
      /></a>
    </section>`,
})
export class DiscoverPage implements OnDestroy {
  api = inject(ApiService);
  ui = inject(UiService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  games = signal<Game[]>([]);
  loading = signal(true);
  error = signal('');
  joining = signal('');
  q = '';
  sport = '';
  type = '';
  location = '';
  date = '';
  filters = false;
  showSports = false;
  types = ['Watch a Game', 'Play a Game', 'Practice', 'Tournament', 'Casual Match'];
  timer?: ReturnType<typeof setTimeout>;
  sub: Subscription;
  sequence = 0;
  constructor() {
    this.sub = this.route.queryParamMap.subscribe((p) => {
      this.q = p.get('q') || '';
      this.location = p.get('location') || '';
      this.sport = p.get('sport') || '';
      this.showSports = p.get('catalog') === '1';
      void this.init();
    });
  }
  async init() {
    if (!this.api.ready()) await this.api.initialize();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.sport = this.api.sports().find((s) => s.id === id)?.name || '';
    await this.load();
  }
  async load() {
    const seq = ++this.sequence;
    this.loading.set(true);
    this.error.set('');
    try {
      const r = await this.api.get<Game[]>(
        '/events?' +
          this.api.query({
            q: this.q,
            sport: this.sport,
            type: this.type,
            location: this.location,
            date: this.date,
          }),
      );
      if (seq === this.sequence) this.games.set(r);
    } catch (e) {
      if (seq === this.sequence) this.error.set((e as Error).message);
    } finally {
      if (seq === this.sequence) this.loading.set(false);
    }
  }
  search(q: string) {
    this.q = q;
    this.debounce();
  }
  debounce() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.load(), 300);
  }
  selectSport(s: string) {
    this.sport = s;
    void this.load();
  }
  reset() {
    this.q = this.sport = this.location = this.type = this.date = '';
    void this.load();
  }
  async join(e: Game) {
    if (!this.api.requireUser()) return;
    if (e.joined_status) {
      void this.router.navigate(['/event', e.id]);
      return;
    }
    this.joining.set(e.id);
    await this.ui.run(async () => {
      const r = await this.api.post('/events/' + e.id + '/join');
      await this.ui.toast(
        r.status === 'pending' ? 'Request sent to the host.' : 'You’re in. Game on!',
      );
      await this.load();
    });
    this.joining.set('');
  }
  ngOnDestroy() {
    this.sub.unsubscribe();
    clearTimeout(this.timer);
  }
}
