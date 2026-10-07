import { PhotoPipe } from '../../shared/photo.pipe';
import { Component, inject, signal, OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { Game, Person } from '../../models';
import { IconComponent } from '../../shared/icon.component';
import { AvatarComponent } from '../../components/avatar.component';
import { EmptyStateComponent, LoadingStateComponent } from '../../components/states.component';
import { DialogComponent } from '../../components/dialog.component';
@Component({
  standalone: true,
  imports: [
    PhotoPipe,
    DatePipe,
    RouterLink,
    IconComponent,
    AvatarComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    DialogComponent,
  ],
  template: `<a routerLink="/tabs/discover" class="back-link"
      ><g-icon name="arrow-back-outline" />Back to games</a
    >
    @if (loading()) {
      <g-loading />
    } @else if (error()) {
      <g-empty
        title="Game unavailable"
        [description]="error()"
        action="Try again"
        (retry)="load()"
      />
    } @else if (game(); as e) {
      <div class="event-detail-banner">
        <img [src]="e.image_url | photo" [alt]="e.sport" />
        <div class="detail-banner-shade"></div>
        <div>
          <span class="sport-tag"><g-icon [name]="e.sport_icon + '-outline'" />{{ e.sport }}</span>
          <h1>{{ e.title }}</h1>
          <p>
            {{ e.type }} <span>·</span>
            {{ e.skill_level === 'Any' ? 'All skill levels' : e.skill_level }} <span>·</span>
            {{ e.privacy }}
          </p>
        </div>
      </div>
      <div class="detail-layout">
        <div class="detail-main">
          <section class="panel detail-information">
            <div>
              <g-icon name="calendar-outline" /><span
                >Date & time<strong>{{ e.starts_at | date: 'EEEE, MMMM d, yyyy' : '+0800' }}</strong
                ><small
                  >{{ e.starts_at | date: 'h:mm a' : '+0800' }} –
                  {{ e.ends_at | date: 'h:mm a' : '+0800' }} · Philippine time</small
                ></span
              >
            </div>
            <div>
              <g-icon name="location-outline" /><span
                >Where we’re playing<strong>{{ e.venue }}</strong
                ><small>{{ e.location }}</small
                ><a [href]="mapUrl(e)" target="_blank" rel="noopener noreferrer"
                  >View on map<g-icon name="arrow-forward-outline" /></a
              ></span>
            </div>
          </section>
          <section class="panel">
            <h2>About this game</h2>
            <p class="description-text">{{ e.description }}</p>
            <div class="detail-tags">
              <span
                ><g-icon name="trophy-outline" />{{
                  e.skill_level === 'Any' ? 'All levels welcome' : e.skill_level
                }}</span
              ><span
                ><g-icon name="people-outline" />{{ e.required_participants }} minimum players</span
              ><span><g-icon name="shield-checkmark-outline" />{{ e.privacy }} game</span>
            </div>
          </section>
          <section class="panel">
            <div class="section-heading">
              <h2>
                The crew
                <span class="count-label">{{ e.participants }} / {{ e.max_participants }}</span>
              </h2>
              <span class="muted">{{ e.max_participants - e.participants }} spots left</span>
            </div>
            <div class="participant-list">
              @for (p of e.participant_list; track p.id) {
                <div class="participant-row">
                  <a [routerLink]="['/user', p.id]"
                    ><g-avatar [src]="p.avatar_url | photo" [name]="p.full_name" /><span
                      ><strong>{{ p.full_name }}</strong
                      ><small>&#64;{{ p.username }}</small></span
                    ></a
                  ><span class="muted">{{
                    p.id === e.host_id
                      ? 'Host'
                      : p.status === 'pending'
                        ? 'Pending approval'
                        : 'Player'
                  }}</span>
                  @if (isHost() && p.id !== e.host_id) {
                    @if (p.status === 'pending') {
                      <button
                        class="button primary small"
                        [disabled]="busy()"
                        (click)="manage(p.id, 'approve')"
                      >
                        Approve
                      </button>
                    }
                    <button
                      class="text-button danger-text"
                      [disabled]="busy()"
                      (click)="manage(p.id, 'remove')"
                    >
                      Remove
                    </button>
                  }
                </div>
              }
            </div>
          </section>
        </div>
        <aside>
          <section class="panel join-panel">
            <span class="eyebrow">YOUR SPOT IS WAITING</span>
            <h2>
              {{
                e.status === 'cancelled'
                  ? 'Game cancelled'
                  : past()
                    ? 'Game completed'
                    : e.joined_status === 'approved'
                      ? 'You’re on the roster.'
                      : e.joined_status === 'pending'
                        ? 'Request submitted.'
                        : 'Get in the game.'
              }}
            </h2>
            <p>
              {{
                e.status === 'cancelled'
                  ? 'The host has cancelled this game.'
                  : past()
                    ? 'Thanks for showing up for the game.'
                    : e.joined_status === 'pending'
                      ? 'The host will review your request.'
                      : e.max_participants - e.participants + ' spots left. Bring your energy.'
              }}
            </p>
            <div class="capacity-bar">
              <span [style.width.%]="(e.participants / e.max_participants) * 100"></span>
            </div>
            <div class="capacity-label">
              <span>{{ e.participants }} joined</span
              ><span>{{ e.max_participants }} spots total</span>
            </div>
            @if (!past() && e.status !== 'cancelled') {
              <button
                class="button primary full-width"
                [disabled]="
                  busy() || isHost() || (!e.joined_status && e.participants >= e.max_participants)
                "
                (click)="joinOrLeave()"
              >
                {{
                  busy()
                    ? 'One moment…'
                    : isHost()
                      ? 'You’re hosting'
                      : e.joined_status === 'pending'
                        ? 'Withdraw request'
                        : e.joined_status === 'approved'
                          ? 'Leave game'
                          : e.participants >= e.max_participants
                            ? 'Game full'
                            : e.privacy === 'Private'
                              ? 'Request to join'
                              : 'Join game'
                }}<g-icon
                  [name]="e.joined_status ? 'checkmark-outline' : 'arrow-forward-outline'"
                />
              </button>
            }
            @if (e.conversation_id) {
              <a
                routerLink="/tabs/messages"
                [queryParams]="{ conversation: e.conversation_id }"
                class="button secondary full-width"
                ><g-icon name="chatbubble-ellipses-outline" />Open game chat</a
              >
            }
            <div class="detail-social-actions">
              <button [disabled]="busy()" (click)="openInvite()">
                <g-icon name="person-add-outline" />Invite friends</button
              ><button (click)="share()"><g-icon name="share-social-outline" />Share game</button>
            </div>
            <div class="host-detail">
              <g-avatar [src]="e.host_avatar | photo" [name]="e.host_name" />
              <div>
                <small>HOSTED BY</small
                ><a [routerLink]="['/user', e.host_id]"
                  >{{ e.host_name }}<g-icon name="chevron-forward-outline"
                /></a>
              </div>
            </div>
          </section>
          @if (isHost()) {
            <section class="panel host-controls">
              <h3>Host controls</h3>
              <a [routerLink]="['/edit-event', e.id]" class="button secondary full-width"
                >Edit game</a
              ><button
                class="text-button danger-text"
                [disabled]="busy() || e.status === 'cancelled'"
                (click)="cancel()"
              >
                Cancel this game
              </button>
            </section>
          }
          <button class="text-button report-button" (click)="report()">
            <g-icon name="flag-outline" />Report this event
          </button>
        </aside>
      </div>
    }
    <g-dialog [open]="inviteOpen()" title="Bring your crew" (closed)="inviteOpen.set(false)"
      ><p class="muted">Invite someone to {{ game()?.title }}.</p>
      <div class="invite-list">
        @for (p of people(); track p.id) {
          <button [disabled]="busy()" (click)="invite(p)">
            <g-avatar [src]="p.avatar_url | photo" [name]="p.full_name" /><span
              >{{ p.full_name }}<small>{{ p.location }}</small></span
            ><g-icon name="add-outline" />
          </button>
        }
      </div>
      @if (!people().length) {
        <g-empty title="No people to invite" description="Your next crew is just a search away." />
      }
    </g-dialog>`,
})
export class EventPage implements OnDestroy {
  api = inject(ApiService);
  ui = inject(UiService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  game = signal<Game | null>(null);
  loading = signal(true);
  error = signal('');
  busy = signal(false);
  inviteOpen = signal(false);
  people = signal<Person[]>([]);
  sub: Subscription;
  constructor() {
    this.sub = this.route.paramMap.subscribe(() => void this.load());
  }
  isHost() {
    return this.game()?.host_id === this.api.user()?.id;
  }
  past() {
    return !!this.game() && new Date(this.game()!.ends_at).getTime() < Date.now();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      if (!this.api.ready()) await this.api.initialize();
      this.game.set(await this.api.get<Game>('/events/' + this.route.snapshot.paramMap.get('id')));
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
  async joinOrLeave() {
    if (!this.api.requireUser() || this.isHost()) return;
    const e = this.game()!;
    if (
      e.joined_status &&
      !(await this.ui.confirm(
        'Leave this game?',
        'Your spot will be available to another player.',
        'Leave game',
      ))
    )
      return;
    this.busy.set(true);
    await this.ui.run(
      async () => {
        if (e.joined_status) await this.api.delete('/events/' + e.id + '/leave');
        else await this.api.post('/events/' + e.id + '/join');
        await this.load();
      },
      e.joined_status
        ? 'You’ve left the game.'
        : e.privacy === 'Private'
          ? 'Request sent to the host.'
          : 'You’re in. See you at the game!',
    );
    this.busy.set(false);
  }
  async cancel() {
    if (
      !(await this.ui.confirm(
        'Cancel this game?',
        'Everyone on the roster will be notified.',
        'Cancel game',
      ))
    )
      return;
    this.busy.set(true);
    await this.ui.run(async () => {
      await this.api.delete('/events/' + this.game()!.id);
      await this.load();
    }, 'Game cancelled. The crew has been notified.');
    this.busy.set(false);
  }
  async manage(user: string, action: string) {
    if (
      action === 'remove' &&
      !(await this.ui.confirm(
        'Remove this player?',
        'They’ll lose their game and group chat access.',
        'Remove player',
      ))
    )
      return;
    this.busy.set(true);
    await this.ui.run(
      async () => {
        await this.api.put('/events/' + this.game()!.id + '/participants/' + user, { action });
        await this.load();
      },
      action === 'approve' ? 'Player approved.' : 'Player removed.',
    );
    this.busy.set(false);
  }
  async openInvite() {
    if (!this.api.requireUser()) return;
    if (!this.game()?.joined_status) {
      await this.ui.toast('Join this game before inviting your friends.');
      return;
    }
    await this.ui.run(async () => {
      this.people.set(await this.api.get<Person[]>('/people'));
      this.inviteOpen.set(true);
    });
  }
  async invite(p: Person) {
    this.busy.set(true);
    await this.ui.run(
      () => this.api.post('/events/' + this.game()!.id + '/invite', { user_id: p.id }),
      'Invite sent to ' + p.full_name + '.',
    );
    this.busy.set(false);
  }
  async share() {
    const url = window.location.origin + '/event/' + this.game()!.id;
    try {
      if (navigator.share)
        await navigator.share({
          title: this.game()!.title,
          text: 'Find your game. Find your people. GORA!',
          url,
        });
      else {
        await navigator.clipboard.writeText(url);
        await this.ui.toast('Game link copied.');
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') await this.ui.toast('Copy this game link: ' + url);
    }
  }
  mapUrl(e: Game) {
    return (
      'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(e.venue + ' ' + e.location)
    );
  }
  async report() {
    if (!this.api.requireUser()) return;
    const reason = await this.ui.prompt(
      'Report this event',
      'Tell our moderation team what happened.',
      'Reason for your report',
    );
    if (reason)
      await this.ui.run(
        () => this.api.post('/reports', { event_id: this.game()!.id, reason }),
        'Report sent to our moderation team.',
      );
  }
  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
