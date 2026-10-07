import { Component, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { Game, Person, Sport } from '../../models';
import { SearchBarComponent } from '../../components/search-bar.component';
import { UserCardComponent } from '../../components/user-card.component';
import { EventCardComponent } from '../../components/event-card.component';
import { SportCardComponent } from '../../components/sport-card.component';
import { EmptyStateComponent, LoadingStateComponent } from '../../components/states.component';

type SearchKind = 'All' | 'People' | 'Games' | 'Sports';
@Component({
  standalone: true,
  imports: [
    RouterLink,
    SearchBarComponent,
    UserCardComponent,
    EventCardComponent,
    SportCardComponent,
    EmptyStateComponent,
    LoadingStateComponent,
  ],
  template: `<div class="page-heading">
      <div>
        <div class="eyebrow">FIND YOUR NEXT CONNECTION</div>
        <h1>People. Games. Your crew<span class="orange-text">.</span></h1>
        <p>Search by name, username, game, sport, or location.</p>
      </div>
    </div>
    <div class="search-results-input">
      <g-search
        placeholder="Search people, usernames, games, or places"
        [value]="q"
        (queryChange)="search($event)"
        (submitted)="submit($event)"
      />
    </div>
    <nav class="profile-tabs search-result-tabs" aria-label="Search categories">
      @for (tab of kinds; track tab) {
        <button
          [class.active]="kind === tab"
          [attr.aria-pressed]="kind === tab"
          (click)="selectKind(tab)"
        >
          {{ tab }}
        </button>
      }
    </nav>
    @if (!q.trim()) {
      <g-empty
        title="Your next crew starts here"
        description="Enter a name, @username, game title, sport, or city to search GORA."
        icon="search-outline"
      />
      <div class="search-browse-actions">
        <a routerLink="/people" class="button secondary">Browse people</a
        ><a routerLink="/tabs/discover" class="button primary">Browse games</a>
      </div>
    } @else if (loading()) {
      <g-loading />
    } @else if (error()) {
      <g-empty
        title="Couldn’t search GORA"
        [description]="error()"
        action="Try again"
        (retry)="load()"
      />
    } @else {
      <p class="search-result-summary" role="status">
        {{ resultCount() }} {{ resultCount() === 1 ? 'result' : 'results' }} for “{{ q }}”
      </p>
      @if (!resultCount()) {
        <g-empty
          title="No results yet"
          description="Try another name, game title, sport, or city."
          action="Clear search"
          (retry)="submit('')"
        />
      }
      @if ((kind === 'All' || kind === 'People') && people().length) {
        <section class="search-result-section" aria-label="People results">
          <div class="section-heading">
            <h2>
              People <span class="count-label">{{ people().length }}</span>
            </h2>
            @if (kind === 'All' && people().length > 6) {
              <button class="text-button" (click)="selectKind('People')">See all people</button>
            }
          </div>
          <div class="people-grid people-discover-grid">
            @for (person of kind === 'All' ? people().slice(0, 6) : people(); track person.id) {
              <g-user-card [person]="person" [socialActions]="true" [showInvite]="false" />
            }
          </div>
        </section>
      }
      @if ((kind === 'All' || kind === 'Games') && games().length) {
        <section class="search-result-section" aria-label="Game results">
          <div class="section-heading">
            <h2>
              Games <span class="count-label">{{ games().length }}</span>
            </h2>
            @if (kind === 'All' && games().length > 6) {
              <button class="text-button" (click)="selectKind('Games')">See all games</button>
            }
          </div>
          <div class="event-grid discover-grid">
            @for (game of kind === 'All' ? games().slice(0, 6) : games(); track game.id) {
              <g-event-card [game]="game" [busy]="joining() === game.id" (join)="join($event)" />
            }
          </div>
        </section>
      }
      @if ((kind === 'All' || kind === 'Sports') && sports().length) {
        <section class="search-result-section" aria-label="Sport results">
          <div class="section-heading">
            <h2>
              Sports <span class="count-label">{{ sports().length }}</span>
            </h2>
          </div>
          <div class="sport-card-grid">
            @for (sport of sports(); track sport.id) {
              <g-sport-card [sport]="sport" />
            }
          </div>
        </section>
      }
    }`,
})
export class SearchPage implements OnDestroy {
  api = inject(ApiService);
  ui = inject(UiService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  people = signal<Person[]>([]);
  games = signal<Game[]>([]);
  sports = signal<Sport[]>([]);
  loading = signal(false);
  error = signal('');
  joining = signal('');
  q = '';
  kind: SearchKind = 'All';
  kinds: SearchKind[] = ['All', 'People', 'Games', 'Sports'];
  private sequence = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private sub: Subscription;
  constructor() {
    this.sub = this.route.queryParamMap.subscribe((params) => {
      clearTimeout(this.timer);
      this.q = (params.get('q') || '').trim().slice(0, 120);
      const kind = params.get('kind') as SearchKind;
      this.kind = this.kinds.includes(kind) ? kind : 'All';
      void this.load();
    });
  }
  resultCount() {
    if (this.kind === 'People') return this.people().length;
    if (this.kind === 'Games') return this.games().length;
    if (this.kind === 'Sports') return this.sports().length;
    return this.people().length + this.games().length + this.sports().length;
  }
  search(value: string) {
    this.q = value;
    ++this.sequence;
    this.loading.set(!!value.trim());
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.submit(value, true), 300);
  }
  submit(value: string, replaceUrl = false) {
    clearTimeout(this.timer);
    const q = value.trim();
    if (q === (this.route.snapshot.queryParamMap.get('q') || '')) {
      this.q = q;
      void this.load();
    } else {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { q: q || null, kind: this.kind === 'All' ? null : this.kind },
        replaceUrl,
      });
    }
  }
  selectKind(kind: SearchKind) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: this.q.trim() || null, kind: kind === 'All' ? null : kind },
    });
  }
  async load() {
    const sequence = ++this.sequence;
    this.error.set('');
    const query = this.q.trim();
    if (!query) {
      this.people.set([]);
      this.games.set([]);
      this.sports.set([]);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    try {
      if (!this.api.ready()) await this.api.initialize();
      const params = this.api.query({ q: query, limit: 50 });
      const [people, games, sports] = await Promise.all([
        this.api.get<Person[]>('/people?' + params),
        this.api.get<Game[]>('/events?' + params),
        this.api.get<Sport[]>('/sports'),
      ]);
      if (sequence !== this.sequence) return;
      this.people.set(people);
      this.games.set(games);
      const tokens = query.toLowerCase().split(/\s+/);
      this.sports.set(
        sports.filter((sport) =>
          tokens.every((token) =>
            (sport.name + ' ' + sport.description).toLowerCase().includes(token),
          ),
        ),
      );
    } catch (error) {
      if (sequence === this.sequence) this.error.set((error as Error).message);
    } finally {
      if (sequence === this.sequence) this.loading.set(false);
    }
  }
  async join(game: Game) {
    if (!this.api.requireUser() || this.joining()) return;
    if (game.joined_status) {
      void this.router.navigate(['/event', game.id]);
      return;
    }
    this.joining.set(game.id);
    try {
      await this.ui.run(async () => {
        const joined = await this.api.post<{ status: string }>('/events/' + game.id + '/join');
        await this.load();
        await this.ui.toast(
          joined.status === 'pending' ? 'Request sent to the host.' : 'You’re in. Game on!',
        );
      });
    } finally {
      this.joining.set('');
    }
  }
  ngOnDestroy() {
    clearTimeout(this.timer);
    ++this.sequence;
    this.sub.unsubscribe();
  }
}
