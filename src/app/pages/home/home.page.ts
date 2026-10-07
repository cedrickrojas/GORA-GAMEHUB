import { PhotoPipe } from '../../shared/photo.pipe';
import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { Game, Person, Community } from '../../models';
import { IconComponent } from '../../shared/icon.component';
import { AvatarComponent } from '../../components/avatar.component';
import { CategoryChipComponent } from '../../components/category-chip.component';
import { EventCardComponent } from '../../components/event-card.component';
import { UserCardComponent } from '../../components/user-card.component';
import { EmptyStateComponent, LoadingStateComponent } from '../../components/states.component';
import { DialogComponent } from '../../components/dialog.component';
import { SearchBarComponent } from '../../components/search-bar.component';
@Component({
  standalone: true,
  imports: [
    PhotoPipe,
    DatePipe,
    RouterLink,
    IconComponent,
    AvatarComponent,
    CategoryChipComponent,
    EventCardComponent,
    UserCardComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    DialogComponent,
    SearchBarComponent,
  ],
  template: `
    @if (api.settings()['maintenance_banner']?.trim()) {
      <div class="system-banner" role="status">
        <g-icon name="notifications-outline" />{{ api.settings()['maintenance_banner'] }}
      </div>
    }
    <div class="page-heading home-heading">
      <div>
        <div class="eyebrow"><span class="orange-line"></span>YOUR NEXT GAME STARTS HERE</div>
        <h1>What’s your game<span class="orange-text">?</span></h1>
        <p>Good games. Great people. All in one place.</p>
      </div>
      <div class="greeting">
        <span>{{ today | date: 'EEEE, MMMM d' : '+0800' }}</span
        ><strong>
          @if (api.user()) {
            Let’s go, {{ firstName }}<g-icon name="flash-outline" />
          } @else {
            Find your people.<g-icon name="flash-outline" />
          }
        </strong>
      </div>
    </div>
    <div class="mobile-home-search"><g-search (search)="homeSearch($event)" /></div>
    @if (error()) {
      <g-empty
        title="Can’t load the game plan"
        [description]="error()"
        action="Try again"
        (retry)="load()"
      />
    } @else if (loading()) {
      <g-loading />
    } @else {
      <div class="home-layout">
        <div class="home-main">
          <section class="hero">
            <img
              src="/images/hero.jpg"
              alt="Basketball rising toward the hoop"
              fetchpriority="high"
            />
            <div class="hero-shade"></div>
            <div class="hero-copy">
              <span class="hero-label"><span></span>THE COURT IS CALLING</span>
              <h2>MORE THAN<br />A GAME<span>.</span></h2>
              <p>Find your game. Find your people. GORA!</p>
              <a routerLink="/tabs/discover" class="button hero-button"
                >Find my game<g-icon name="arrow-forward-outline"
              /></a>
            </div>
            <div class="hero-footer">
              <div class="avatar-stack">
                @for (p of people().slice(0, 3); track p.id) {
                  <g-avatar [src]="p.avatar_url | photo" [name]="p.full_name" [size]="25" />
                }
              </div>
              <span>Your next crew is waiting.</span><span class="hero-index">GAME ON.</span>
            </div>
          </section>
          <section class="sports-section">
            <div class="section-heading">
              <h2>Pick your sport</h2>
              <a routerLink="/tabs/discover" [queryParams]="{ catalog: '1' }"
                >All sports<g-icon name="arrow-forward-outline"
              /></a>
            </div>
            <div class="category-row">
              @for (s of api.sports().slice(0, 5); track s.id) {
                <g-category
                  [name]="s.name"
                  [icon]="s.icon + '-outline'"
                  [active]="selectedSport() === s.name"
                  (select)="filterSport(s.name)"
                />
              }
              <a routerLink="/tabs/discover" class="more-sports" aria-label="More sports"
                ><g-icon name="ellipsis-horizontal"
              /></a>
            </div>
          </section>
          <section>
            <div class="section-heading">
              <div class="section-title">
                <h2>Upcoming near you</h2>
                <span class="subtle-tag"><g-icon name="location-outline" />Metro Manila</span>
              </div>
              <a routerLink="/tabs/discover">See all<g-icon name="arrow-forward-outline" /></a>
            </div>
            <div class="event-grid">
              @for (e of visibleEvents(); track e.id) {
                <g-event-card [game]="e" [busy]="joining() === e.id" (join)="join($event)" />
              }
            </div>
            @if (!visibleEvents().length) {
              <g-empty
                title="A fresh court awaits"
                description="No upcoming games for this sport. Create one and bring your crew."
              />
            }
          </section>
          <section class="people-section">
            <div class="section-heading">
              <div>
                <h2>Find your watch party</h2>
                <p class="section-description">The game’s better with good company.</p>
              </div>
              <a routerLink="/people">Find people<g-icon name="arrow-forward-outline" /></a>
            </div>
            <div class="people-grid">
              @for (p of people().slice(0, 3); track p.id) {
                <g-user-card [person]="p" (invite)="openPeopleInvite($event)" />
              }
            </div>
          </section>
          <section>
            <div class="section-heading">
              <h2>Recommended for your next run</h2>
              <a routerLink="/tabs/discover">Explore<g-icon name="arrow-forward-outline" /></a>
            </div>
            <div class="event-grid">
              @for (e of events().slice(3, 6); track e.id) {
                <g-event-card [game]="e" [busy]="joining() === e.id" (join)="join($event)" />
              }
            </div>
          </section>
          <footer class="page-footer">
            <span class="mini-brand">GORA.</span>
            <p>Find your game. Find your people.</p>
            <span>PLAY. CONNECT. REPEAT.</span>
          </footer>
        </div>
        <aside class="home-rail">
          <section class="rail-card game-plan">
            <div class="section-heading">
              <h2>Your game plan</h2>
              <g-icon name="calendar-outline" />
            </div>
            <div class="mini-calendar">
              <div class="calendar-month">
                {{ today | date: 'MMMM yyyy' : '+0800'
                }}<a routerLink="/tabs/schedule" aria-label="Open schedule"
                  ><g-icon name="arrow-forward-outline"
                /></a>
              </div>
              <div class="mini-week">
                @for (d of week; track d.getTime()) {
                  <a routerLink="/tabs/schedule" [class.today]="d.getDate() === today.getDate()"
                    ><span>{{ d | date: 'EEEEE' : '+0800' }}</span
                    ><strong>{{ d | date: 'd' : '+0800' }}</strong
                    ><i></i
                  ></a>
                }
              </div>
            </div>
            <div class="rail-label">ON YOUR SCHEDULE</div>
            @if (myGames().length) {
              @for (e of myGames().slice(0, 2); track e.id) {
                <a [routerLink]="['/event', e.id]" class="schedule-preview"
                  ><span class="schedule-icon"><g-icon [name]="e.sport_icon + '-outline'" /></span>
                  <div>
                    <strong>{{ e.title }}</strong
                    ><span>{{ e.starts_at | date: 'EEE, MMM d · h:mm a' : '+0800' }}</span
                    ><small>{{ e.venue }}</small>
                  </div></a
                >
              }
            } @else {
              <div class="schedule-empty">
                <g-icon name="calendar-outline" />
                <p>Your calendar has room<br />for something great.</p>
                <a routerLink="/tabs/discover"
                  >Find a game<g-icon name="arrow-forward-outline"
                /></a>
              </div>
            }
            <a routerLink="/tabs/schedule" class="rail-link"
              >View my schedule<g-icon name="arrow-forward-outline"
            /></a>
          </section>
          <section class="rail-card">
            <div class="section-heading">
              <h2>Trending sports</h2>
              <g-icon name="flash-outline" />
            </div>
            @for (s of trendingSports; track s.id; let i = $index) {
              <a [routerLink]="['/sports', s.id]" class="trending-row"
                ><span class="trend-rank">0{{ i + 1 }}</span
                ><span class="trend-icon"><g-icon [name]="s.icon + '-outline'" /></span>
                <div>
                  <strong>{{ s.name }}</strong
                  ><small>{{ s.active_games }} active games</small>
                </div>
                <g-icon name="arrow-forward-outline"
              /></a>
            }
          </section>
          <section class="rail-card communities-rail">
            <div class="section-heading">
              <h2>Find your community</h2>
              <g-icon name="people-outline" />
            </div>
            @for (c of communities().slice(0, 2); track c.id) {
              <a [routerLink]="['/community', c.id]" class="community-preview"
                ><img [src]="c.image_url | photo" [alt]="c.sport" loading="lazy" />
                <div>
                  <strong>{{ c.name }}</strong
                  ><span>{{ c.members }} members · {{ c.sport }}</span>
                </div>
                <g-icon name="chevron-forward-outline"
              /></a>
            }
            <a routerLink="/communities" class="rail-link"
              >Explore communities<g-icon name="arrow-forward-outline"
            /></a>
          </section>
          <div class="rail-brand">
            <span>GORA<span class="orange-text">.</span></span>
            <p>SHOW UP. GAME ON.</p>
          </div>
        </aside>
      </div>
    }
    <g-dialog
      [open]="!!invitePerson()"
      [title]="'Invite ' + (invitePerson()?.full_name || 'your crew')"
      (closed)="invitePerson.set(null)"
      ><p class="muted">Choose a game you’re hosting or have joined.</p>
      <div class="invite-list">
        @for (e of myGames(); track e.id) {
          <button (click)="sendInvite(e)">
            <g-icon [name]="e.sport_icon + '-outline'" /><span
              >{{ e.title
              }}<small>{{ e.starts_at | date: 'MMM d · h:mm a' : '+0800' }}</small></span
            ><g-icon name="arrow-forward-outline" />
          </button>
        }
        @if (!myGames().length) {
          <g-empty
            title="Start with a game"
            description="Join or create a game, then invite your people."
          /><a routerLink="/create-event" class="button primary" (click)="invitePerson.set(null)"
            >Create a game</a
          >
        }
      </div></g-dialog
    >
  `,
})
export class HomePage {
  api = inject(ApiService);
  ui = inject(UiService);
  router = inject(Router);
  events = signal<Game[]>([]);
  people = signal<Person[]>([]);
  communities = signal<Community[]>([]);
  myGames = signal<Game[]>([]);
  loading = signal(true);
  error = signal('');
  selectedSport = signal('');
  joining = signal('');
  invitePerson = signal<Person | null>(null);
  today = new Date();
  week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + i);
    return d;
  });
  get firstName() {
    return this.api.user()?.full_name.split(' ')[0];
  }
  get trendingSports() {
    return [...this.api.sports()].sort((a, b) => b.active_games - a.active_games).slice(0, 4);
  }
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      if (!this.api.ready()) await this.api.initialize();
      const [events, people, communities] = await Promise.all([
        this.api.get<Game[]>('/events'),
        this.api.get<Person[]>('/people'),
        this.api.get<Community[]>('/communities'),
      ]);
      this.events.set(events);
      this.people.set(people);
      this.communities.set(communities);
      await this.loadSchedule();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
  async loadSchedule() {
    if (this.api.user())
      this.myGames.set(
        (await this.api.get<Game[]>('/events?scope=mine')).filter(
          (e) => e.status === 'active' && new Date(e.ends_at) > new Date(),
        ),
      );
  }
  visibleEvents() {
    return this.events()
      .filter((e) => !this.selectedSport() || e.sport === this.selectedSport())
      .slice(0, 3);
  }
  filterSport(s: string) {
    this.selectedSport.set(this.selectedSport() === s ? '' : s);
  }
  homeSearch(q: string) {
    void this.router.navigate(['/tabs/discover'], { queryParams: { q } });
  }
  async join(e: Game) {
    if (!this.api.requireUser()) return;
    if (e.joined_status) {
      void this.router.navigate(['/event', e.id]);
      return;
    }
    this.joining.set(e.id);
    await this.ui.run(
      async () => {
        const r = await this.api.post('/events/' + e.id + '/join');
        e.joined_status = r.status;
        if (r.status === 'approved') e.participants++;
        this.events.set([...this.events()]);
        await this.loadSchedule();
      },
      e.privacy === 'Private' ? 'Request sent to the host.' : 'You’re in. See you at the game!',
    );
    this.joining.set('');
  }
  async openPeopleInvite(p: Person) {
    if (!this.api.requireUser()) return;
    await this.ui.run(async () => {
      await this.loadSchedule();
      this.invitePerson.set(p);
    });
  }
  async sendInvite(e: Game) {
    const person = this.invitePerson();
    if (!person || !this.api.requireUser()) return;
    await this.ui.run(
      () => this.api.post('/events/' + e.id + '/invite', { user_id: person.id }),
      'Invite sent. Bring the crew!',
    );
    this.invitePerson.set(null);
  }
}
