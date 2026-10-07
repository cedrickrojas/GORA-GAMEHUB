import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { Notice } from '../../models';
import { NotificationItemComponent } from '../../components/notification-item.component';
import { EmptyStateComponent, LoadingStateComponent } from '../../components/states.component';
@Component({
  standalone: true,
  imports: [NotificationItemComponent, EmptyStateComponent, LoadingStateComponent],
  template: `<div class="page-heading">
      <div>
        <div class="eyebrow">STAY IN THE LOOP</div>
        <h1>Notifications<span class="orange-text">.</span></h1>
        <p>Invites, game updates, and news from your crew.</p>
      </div>
      <button class="button secondary" [disabled]="busy() || !unread()" (click)="markAll()">
        Mark all as read
      </button>
    </div>
    <div class="profile-tabs">
      <button [class.active]="!onlyUnread" (click)="onlyUnread = false">All activity</button
      ><button [class.active]="onlyUnread" (click)="onlyUnread = true">
        Unread <span class="count-label">{{ unread() }}</span>
      </button>
    </div>
    @if (loading()) {
      <g-loading />
    } @else if (error()) {
      <g-empty
        title="Couldn’t load activity"
        [description]="error()"
        action="Try again"
        (retry)="load()"
      />
    } @else {
      <div class="panel notification-list">
        @for (n of filtered(); track n.id) {
          <g-notification [notice]="n" (open)="open($event)" />
        }
        @if (!filtered().length) {
          <g-empty
            title="You’re all caught up"
            description="Your next game invite will land here."
            icon="notifications-outline"
          />
        }
      </div>
    }`,
})
export class NotificationsPage {
  api = inject(ApiService);
  ui = inject(UiService);
  router = inject(Router);
  notices = signal<Notice[]>([]);
  loading = signal(true);
  error = signal('');
  busy = signal(false);
  onlyUnread = false;
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.notices.set(await this.api.get<Notice[]>('/notifications'));
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
  unread() {
    return this.notices().filter((n) => !n.read_at).length;
  }
  filtered() {
    return this.notices().filter((n) => !this.onlyUnread || !n.read_at);
  }
  async open(n: Notice) {
    await this.ui.run(async () => {
      await this.api.put('/notifications/' + n.id + '/read');
      await this.router.navigateByUrl(n.link);
    });
  }
  async markAll() {
    this.busy.set(true);
    await this.ui.run(async () => {
      await Promise.all(
        this.notices()
          .filter((n) => !n.read_at)
          .map((n) => this.api.put('/notifications/' + n.id + '/read')),
      );
      await this.load();
    }, 'All caught up.');
    this.busy.set(false);
  }
}
