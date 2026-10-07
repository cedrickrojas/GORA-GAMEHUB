import { PhotoPipe } from '../../shared/photo.pipe';
import { Component, inject, signal, OnDestroy } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { Community, Person } from '../../models';
import { IconComponent } from '../../shared/icon.component';
import { AvatarComponent } from '../../components/avatar.component';
import { EmptyStateComponent, LoadingStateComponent } from '../../components/states.component';
@Component({
  standalone: true,
  imports: [
    PhotoPipe,
    RouterLink,
    IconComponent,
    AvatarComponent,
    EmptyStateComponent,
    LoadingStateComponent,
  ],
  template: `@if (loading()) {
      <g-loading />
    } @else if (error()) {
      <g-empty
        title="Community unavailable"
        [description]="error()"
        action="Try again"
        (retry)="load()"
      />
    } @else if (detail(); as c) {
      <a routerLink="/communities" class="back-link"
        ><g-icon name="arrow-back-outline" />All communities</a
      >
      <div class="event-detail-banner community-banner">
        <img [src]="c.image_url | photo" [alt]="c.sport" />
        <div class="detail-banner-shade"></div>
        <div>
          <span class="sport-tag">{{ c.sport }}</span>
          <h1>{{ c.name }}</h1>
          <p>{{ c.location }} · {{ members().length }} members</p>
        </div>
      </div>
      <div class="detail-layout">
        <section class="panel">
          <h2>Find your people</h2>
          <p class="description-text">{{ c.description }}</p>
          @if (api.settings()['community_guidelines']) {
            <div class="community-guidelines">
              <h3>Our ground rules</h3>
              <p class="description-text">{{ api.settings()['community_guidelines'] }}</p>
            </div>
          }
          <h3>Meet the community</h3>
          <div class="community-member-grid">
            @for (p of members(); track p.id) {
              <a [routerLink]="['/user', p.id]"
                ><g-avatar [src]="p.avatar_url | photo" [name]="p.full_name" /><span
                  >{{ p.full_name }}<small>&#64;{{ p.username }}</small></span
                ></a
              >
            }
          </div>
        </section>
        <aside class="panel join-panel">
          <h2>{{ c.joined ? 'You’re part of the crew.' : 'Your people are here.' }}</h2>
          <p>Connect with local fans and players who share your love of the game.</p>
          <button class="button primary full-width" [disabled]="busy()" (click)="join()">
            {{ c.joined ? 'Leave community' : 'Join community'
            }}<g-icon [name]="c.joined ? 'checkmark-outline' : 'arrow-forward-outline'" /></button
          ><a
            routerLink="/tabs/discover"
            [queryParams]="{ sport: c.sport }"
            class="button secondary full-width"
            >Find {{ c.sport.toLowerCase() }} games</a
          >
        </aside>
      </div>
    } @else {
      <div class="page-heading">
        <div>
          <div class="eyebrow">SAME PASSION. YOUR PEOPLE.</div>
          <h1>Find your community<span class="orange-text">.</span></h1>
          <p>Local crews. Shared passions. More reasons to show up.</p>
        </div>
      </div>
      <div class="community-grid">
        @for (c of communities(); track c.id) {
          <a [routerLink]="['/community', c.id]" class="community-card"
            ><img [src]="c.image_url | photo" [alt]="c.sport" />
            <div>
              <span class="eyebrow">{{ c.sport }}</span>
              <h2>{{ c.name }}</h2>
              <p>{{ c.description }}</p>
              <div class="community-card-footer">
                <span><g-icon name="people-outline" />{{ c.members }} members</span
                ><span>Meet the crew<g-icon name="arrow-forward-outline" /></span>
              </div></div
          ></a>
        }
      </div>
    }`,
})
export class CommunitiesPage implements OnDestroy {
  api = inject(ApiService);
  ui = inject(UiService);
  route = inject(ActivatedRoute);
  communities = signal<Community[]>([]);
  detail = signal<Community | null>(null);
  loading = signal(true);
  error = signal('');
  busy = signal(false);
  sub: Subscription;
  constructor() {
    this.sub = this.route.paramMap.subscribe(() => void this.load());
  }
  members() {
    return (this.detail()?.members || []) as Person[];
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      if (!this.api.ready()) await this.api.initialize();
      const id = this.route.snapshot.paramMap.get('id');
      if (id) this.detail.set(await this.api.get<Community>('/communities/' + id));
      else {
        this.detail.set(null);
        this.communities.set(await this.api.get<Community[]>('/communities'));
      }
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
  async join() {
    if (!this.api.requireUser()) return;
    const c = this.detail()!;
    if (
      c.joined &&
      !(await this.ui.confirm(
        'Leave this community?',
        'You can always come back when you’re ready.',
        'Leave community',
      ))
    )
      return;
    this.busy.set(true);
    await this.ui.run(
      async () => {
        if (c.joined) await this.api.delete('/communities/' + c.id + '/leave');
        else await this.api.post('/communities/' + c.id + '/join');
        await this.load();
      },
      c.joined ? 'You’ve left this community.' : 'Welcome to the crew!',
    );
    this.busy.set(false);
  }
  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
