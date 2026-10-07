import { Component, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { Person, Game } from '../../models';
import { SearchBarComponent } from '../../components/search-bar.component';
import { CategoryChipComponent } from '../../components/category-chip.component';
import { UserCardComponent } from '../../components/user-card.component';
import { EmptyStateComponent, LoadingStateComponent } from '../../components/states.component';
import { IconComponent } from '../../shared/icon.component';
import { DialogComponent } from '../../components/dialog.component';
@Component({
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    RouterLink,
    SearchBarComponent,
    CategoryChipComponent,
    UserCardComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    IconComponent,
    DialogComponent,
  ],
  template: `<div class="page-heading">
      <div>
        <div class="eyebrow">FIND YOUR PEOPLE</div>
        <h1>The game’s better together<span class="orange-text">.</span></h1>
        <p>Meet your next teammate, courtside companion, or watch-party crew.</p>
      </div>
    </div>
    <div class="discovery-toolbar">
      <g-search
        placeholder="Search people or places"
        [value]="q"
        (queryChange)="search($event)"
      /><button class="button secondary" (click)="filters = !filters">
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
      <div class="filter-panel people-filters">
        <label>Location<input [(ngModel)]="location" placeholder="Manila" /></label
        ><label>Favorite team<input [(ngModel)]="team" placeholder="LA Lakers" /></label
        ><label
          >Game / event<select [(ngModel)]="event_id">
            <option value="">Any event</option>
            @for (e of watchGames(); track e.id) {
              <option [value]="e.id">{{ e.title }}</option>
            }
          </select></label
        ><label>Date<input type="date" [(ngModel)]="date" /></label
        ><label>Time after<input type="time" [(ngModel)]="time" /></label
        ><label>Min. age<input type="number" [(ngModel)]="age_min" min="13" max="120" /></label
        ><label>Max. age<input type="number" [(ngModel)]="age_max" min="13" max="120" /></label
        ><label
          >Distance (km)<input
            type="number"
            [(ngModel)]="distance"
            min="1"
            max="1000"
            placeholder="From your profile coordinates" /></label
        ><label>Available seats<input type="number" [(ngModel)]="seats" min="0" max="100" /></label
        ><label
          >Max. group size<input type="number" [(ngModel)]="group_size" min="1" max="100" /></label
        ><button class="button primary small" (click)="load()">Apply filters</button
        ><button class="text-button" (click)="reset()">Reset</button>
      </div>
    }
    <div class="section-heading">
      <h2>
        People you may know <span class="count-label">{{ people().length }}</span>
      </h2>
      <span class="muted">{{
        api.user() ? 'Matched by sports & location' : 'Sign in to see your matches'
      }}</span>
    </div>
    @if (loading()) {
      <g-loading />
    } @else if (error()) {
      <g-empty
        title="Couldn’t find your crew"
        [description]="error()"
        action="Try again"
        (retry)="load()"
      />
    } @else if (!people().length) {
      <g-empty
        title="No matches yet"
        description="Broaden your filters and discover a new crew."
        action="Clear filters"
        (retry)="reset()"
      />
    } @else {
      <div class="people-grid people-discover-grid">
        @for (p of people(); track p.id) {
          <g-user-card [person]="p" [socialActions]="true" (invite)="invite($event)" />
        }
      </div>
    }
    <g-dialog
      [open]="!!invitePerson()"
      [title]="'Invite ' + (invitePerson()?.full_name || 'your crew')"
      (closed)="invitePerson.set(null)"
      ><p class="muted">Choose a game you’ve joined or created.</p>
      <div class="invite-list">
        @for (e of myGames(); track e.id) {
          <button (click)="send(e)">
            <g-icon [name]="e.sport_icon + '-outline'" /><span
              >{{ e.title
              }}<small>{{ e.starts_at | date: 'MMM d · h:mm a' : '+0800' }}</small></span
            ><g-icon name="arrow-forward-outline" />
          </button>
        }
        @if (!myGames().length) {
          <g-empty
            title="Start with a game"
            description="Join or create a game before sending an invite."
          /><a routerLink="/create-event" class="button primary" (click)="invitePerson.set(null)"
            >Create a game</a
          >
        }
      </div></g-dialog
    >`,
})
export class PeoplePage implements OnDestroy {
  api = inject(ApiService);
  ui = inject(UiService);
  people = signal<Person[]>([]);
  watchGames = signal<Game[]>([]);
  myGames = signal<Game[]>([]);
  invitePerson = signal<Person | null>(null);
  loading = signal(true);
  error = signal('');
  q = '';
  sport = '';
  location = '';
  team = '';
  event_id = '';
  date = '';
  time = '';
  age_min: number | null = null;
  age_max: number | null = null;
  distance: number | null = null;
  seats: number | null = null;
  group_size: number | null = null;
  filters = false;
  timer?: ReturnType<typeof setTimeout>;
  sequence = 0;
  constructor() {
    void this.load();
    void this.api
      .get<Game[]>('/events?type=Watch%20a%20Game')
      .then((g) => this.watchGames.set(g))
      .catch(() => {});
  }
  async load() {
    const seq = ++this.sequence;
    this.loading.set(true);
    this.error.set('');
    try {
      if (!this.api.ready()) await this.api.initialize();
      const r = await this.api.get<Person[]>(
        '/people?' +
          this.api.query({
            q: this.q,
            sport: this.sport,
            location: this.location,
            team: this.team,
            event_id: this.event_id,
            date: this.date,
            time: this.time,
            age_min: this.age_min,
            age_max: this.age_max,
            distance: this.distance,
            seats: this.seats,
            group_size: this.group_size,
          }),
      );
      if (seq === this.sequence) this.people.set(r);
    } catch (e) {
      if (seq === this.sequence) this.error.set((e as Error).message);
    } finally {
      if (seq === this.sequence) this.loading.set(false);
    }
  }
  search(q: string) {
    this.q = q;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.load(), 300);
  }
  selectSport(s: string) {
    this.sport = s;
    void this.load();
  }
  reset() {
    this.q = this.sport = this.location = this.team = this.event_id = this.date = this.time = '';
    this.age_min = this.age_max = this.distance = this.seats = this.group_size = null;
    void this.load();
  }
  async invite(p: Person) {
    if (!this.api.requireUser()) return;
    await this.ui.run(async () => {
      this.myGames.set(
        (await this.api.get<Game[]>('/events?scope=mine')).filter(
          (e) =>
            e.status === 'active' &&
            new Date(e.ends_at) > new Date() &&
            e.joined_status === 'approved',
        ),
      );
      this.invitePerson.set(p);
    });
  }
  async send(e: Game) {
    await this.ui.run(
      () => this.api.post('/events/' + e.id + '/invite', { user_id: this.invitePerson()!.id }),
      'Invite sent. Bring the crew!',
    );
    this.invitePerson.set(null);
  }
  ngOnDestroy() {
    clearTimeout(this.timer);
  }
}
