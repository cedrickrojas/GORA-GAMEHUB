import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { IconComponent } from '../../shared/icon.component';
import { AvatarComponent } from '../../components/avatar.component';
import { DialogComponent } from '../../components/dialog.component';
import { AdminProfileEditorComponent } from '../../components/admin-profile-editor.component';
import { EmptyStateComponent, LoadingStateComponent } from '../../components/states.component';
@Component({
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    RouterLink,
    IconComponent,
    AvatarComponent,
    DialogComponent,
    AdminProfileEditorComponent,
    EmptyStateComponent,
    LoadingStateComponent,
  ],
  template: `<div class="admin-workspace">
    <header class="admin-header">
      <a routerLink="/admin" class="brand" aria-label="GORA admin dashboard"
        >GORA<span class="brand-dot">.</span></a
      >
      <div class="admin-account">
        <g-avatar
          [src]="api.user()?.avatar_url"
          [name]="api.user()?.full_name || 'Administrator'"
          [size]="36"
        />
        <span class="admin-account-name">{{ api.user()?.full_name }}</span>
        <button
          class="button secondary small"
          [disabled]="signingOut() || busy()"
          (click)="profileOpen.set(true)"
        >
          <g-icon name="person-outline" />Edit profile
        </button>
        <button
          class="button secondary small"
          [disabled]="signingOut() || busy()"
          (click)="signOut()"
        >
          <g-icon name="log-out-outline" />{{ signingOut() ? 'Signing out…' : 'Sign out' }}
        </button>
      </div>
    </header>
    <div class="page-heading">
      <div>
        <div class="eyebrow">GORA CONTROL ROOM</div>
        <h1>Keep the game fair<span class="orange-text">.</span></h1>
        <p>Manage the community. Protect the crew.</p>
      </div>
      <span class="status-pill"><g-icon name="shield-checkmark-outline" />Administrator</span>
    </div>
    <div class="profile-tabs admin-tabs">
      @for (t of tabs; track t) {
        <button [class.active]="tab === t" (click)="change(t)">{{ t }}</button>
      }
    </div>
    @if (loading()) {
      <g-loading />
    } @else if (error()) {
      <g-empty
        title="Couldn’t load the control room"
        [description]="error()"
        action="Try again"
        (retry)="load()"
      />
    } @else {
      @if (tab === 'Dashboard') {
        <div class="admin-stat-grid">
          @for (s of stats; track s.key) {
            <div class="panel">
              <g-icon [name]="s.icon" /><span>{{ s.label }}</span
              ><strong>{{ dashboard()[s.key] || 0 }}</strong>
            </div>
          }
        </div>
        <section class="panel">
          <h2>Popular sports</h2>
          <div class="admin-sports-chart">
            @for (s of dashboard().popular_sports || []; track s.name) {
              <div>
                <span>{{ s.name }}</span>
                <div><i [style.width.%]="(s.events / maxEvents()) * 100"></i></div>
                <strong>{{ s.events }} events</strong>
              </div>
            }
          </div>
        </section>
      }
      @if (tab === 'Users') {
        <div class="panel table-panel">
          <div class="section-heading">
            <h2>Community roster</h2>
            <span class="muted">{{ rows().length }} users</span>
          </div>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Moderation</th>
                </tr>
              </thead>
              <tbody>
                @for (u of rows(); track u.id) {
                  <tr>
                    <td>
                      <div class="table-person">
                        <g-avatar [src]="u.avatar_url" [name]="u.full_name" [size]="30" />
                        <span
                          >{{ u.full_name }}<small>&#64;{{ u.username }}</small></span
                        >
                      </div>
                    </td>
                    <td>{{ u.email }}</td>
                    <td>{{ u.role }}</td>
                    <td>
                      <span class="status-pill" [class.cancelled]="u.status !== 'active'">{{
                        u.status
                      }}</span>
                    </td>
                    <td>
                      <div class="table-actions">
                        <button
                          [disabled]="busy() || u.id === api.user()?.id"
                          (click)="setStatus(u, 'active')"
                        >
                          Restore</button
                        ><button
                          [disabled]="busy() || u.id === api.user()?.id"
                          (click)="setStatus(u, 'suspended')"
                        >
                          Suspend</button
                        ><button
                          class="danger-text"
                          [disabled]="busy() || u.id === api.user()?.id"
                          (click)="setStatus(u, 'banned')"
                        >
                          Ban
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
      @if (tab === 'Events') {
        <div class="panel table-panel">
          <h2>Game management</h2>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Host</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (e of rows(); track e.id) {
                  <tr>
                    <td>
                      <strong>{{ e.title }}</strong
                      ><small>{{ e.sport }}</small>
                    </td>
                    <td>{{ e.host_name }}</td>
                    <td>{{ e.starts_at | date: 'MMM d, yyyy' : '+0800' }}</td>
                    <td>{{ e.status }}</td>
                    <td>
                      <button
                        class="text-button danger-text"
                        [disabled]="busy()"
                        (click)="deleteEvent(e)"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
      @if (tab === 'Sports') {
        <div class="section-heading">
          <h2>Sports categories</h2>
          <button class="button primary" (click)="editSport(null)">
            <g-icon name="add-outline" />Add sport
          </button>
        </div>
        <div class="sport-admin-grid">
          @for (s of rows(); track s.id) {
            <div class="panel">
              <g-icon [name]="s.icon + '-outline'" />
              <h3>{{ s.name }}</h3>
              <p>{{ s.description }}</p>
              <small
                >{{ s.active_games }} active games · {{ s.active_communities }} communities</small
              ><button class="button secondary small" (click)="editSport(s)">Edit category</button>
            </div>
          }
        </div>
      }
      @if (tab === 'Reports') {
        <div class="report-list">
          @for (r of rows(); track r.id) {
            <article class="panel report-card">
              <div class="section-heading">
                <h3>
                  {{ r.reporter_name }} reported
                  {{ r.event_id ? 'an event' : r.message_id ? 'a message' : 'a user' }}
                </h3>
                <span class="status-pill" [class.cancelled]="r.status === 'open'">{{
                  r.status
                }}</span>
              </div>
              <p>{{ r.reason }}</p>
              <small>{{ r.created_at | date: 'MMM d, yyyy · h:mm a' : '+0800' }}</small>
              <div class="report-target">
                @if (r.event_id) {
                  <button (click)="change('Events')" class="text-button">Manage events</button>
                }
                @if (r.user_id) {
                  <button (click)="change('Users')" class="text-button">Manage users</button>
                }
                @if (r.message_id) {
                  <span class="muted">Message ID: {{ r.message_id }}</span
                  ><button class="text-button danger-text" (click)="removeMessage(r.message_id)">
                    Remove message
                  </button>
                }
              </div>
              @if (r.status === 'open') {
                <div class="form-actions">
                  <button
                    class="button secondary small"
                    [disabled]="busy()"
                    (click)="resolve(r, 'dismissed')"
                  >
                    Dismiss report</button
                  ><button
                    class="button primary small"
                    [disabled]="busy()"
                    (click)="resolve(r, 'resolved')"
                  >
                    Resolve report
                  </button>
                </div>
              } @else {
                <p class="muted">{{ r.resolution }}</p>
              }
            </article>
          }
          @if (!rows().length) {
            <g-empty
              title="Fair play, all clear"
              description="Community reports will appear here."
              icon="shield-checkmark-outline"
            />
          }
        </div>
      }
      @if (tab === 'Notifications') {
        <form class="panel admin-form" #notice="ngForm" (ngSubmit)="notice.valid && announce()">
          <h2>Send a community announcement</h2>
          <p class="muted">This will notify every active player.</p>
          <label
            >Announcement<textarea
              required
              name="announcement"
              [(ngModel)]="announcement"
              maxlength="200"
              rows="4"
              placeholder="Let your community know what’s happening."
            ></textarea></label
          ><button class="button primary" [disabled]="busy() || !notice.valid">
            Send announcement<g-icon name="send-outline" />
          </button>
        </form>
      }
      @if (tab === 'Settings') {
        <form
          class="panel admin-form"
          #settings="ngForm"
          (ngSubmit)="settings.valid && saveSettings()"
        >
          <h2>Community settings</h2>
          <label
            >Maintenance banner<input
              name="banner"
              [(ngModel)]="banner"
              maxlength="2000"
              placeholder="Optional message displayed at the top of home" /></label
          ><label
            >Community guidelines<textarea
              name="guidelines"
              required
              [(ngModel)]="guidelines"
              maxlength="2000"
              rows="6"
            ></textarea></label
          ><button class="button primary" [disabled]="busy() || !settings.valid">
            Save settings
          </button>
        </form>
      }
    }
    <g-admin-profile-editor [open]="profileOpen()" (closed)="profileOpen.set(false)" />
    <g-dialog
      [open]="sportOpen()"
      [title]="sportModel.id ? 'Edit sport' : 'Add a sport'"
      (closed)="sportOpen.set(false)"
      ><form #sportForm="ngForm" (ngSubmit)="sportForm.valid && saveSport()">
        <label
          >Name<input name="name" required [(ngModel)]="sportModel.name" maxlength="40" /></label
        ><label
          >Slug<input
            name="slug"
            required
            pattern="[a-z0-9-]{2,40}"
            [(ngModel)]="sportModel.slug" /></label
        ><label
          >Icon name<select name="icon" [(ngModel)]="sportModel.icon">
            @for (
              i of [
                'basketball',
                'football',
                'tennisball',
                'volleyball',
                'fitness',
                'game-controller',
                'trophy',
                'flag',
              ];
              track i
            ) {
              <option>{{ i }}</option>
            }
          </select></label
        ><label
          >Description<textarea
            name="description"
            required
            [(ngModel)]="sportModel.description"
            maxlength="500"
          ></textarea></label
        ><label
          >Image URL<input
            type="url"
            name="image"
            required
            [(ngModel)]="sportModel.image_url" /></label
        ><button class="button primary full-width" [disabled]="busy() || !sportForm.valid">
          Save sport
        </button>
      </form></g-dialog
    >
  </div>`,
})
export class AdminPage {
  api = inject(ApiService);
  ui = inject(UiService);
  tab = 'Dashboard';
  tabs = ['Dashboard', 'Users', 'Events', 'Sports', 'Reports', 'Notifications', 'Settings'];
  dashboard = signal<any>({});
  rows = signal<any[]>([]);
  loading = signal(true);
  error = signal('');
  busy = signal(false);
  signingOut = signal(false);
  profileOpen = signal(false);
  sportOpen = signal(false);
  sportModel = { id: '', name: '', slug: '', icon: 'fitness', description: '', image_url: '' };
  announcement = '';
  banner = '';
  guidelines = '';
  stats = [
    { key: 'total_users', label: 'Total users', icon: 'people-outline' },
    { key: 'active_users', label: 'Active users', icon: 'flash-outline' },
    { key: 'total_events', label: 'Total events', icon: 'basketball-outline' },
    { key: 'upcoming_events', label: 'Upcoming events', icon: 'calendar-outline' },
    { key: 'reports', label: 'Open reports', icon: 'flag-outline' },
  ];
  constructor() {
    void this.load();
  }
  async signOut() {
    this.signingOut.set(true);
    try {
      await this.ui.run(() => this.api.logout());
    } finally {
      this.signingOut.set(false);
    }
  }
  change(t: string) {
    this.tab = t;
    void this.load();
  }
  maxEvents() {
    return Math.max(1, ...(this.dashboard().popular_sports || []).map((s: any) => s.events));
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      if (this.tab === 'Dashboard') this.dashboard.set(await this.api.get('/admin/dashboard'));
      else if (this.tab === 'Sports') this.rows.set(await this.api.get('/sports'));
      else if (this.tab === 'Settings') {
        const s = await this.api.get<any[]>('/admin/settings');
        this.banner = s.find((x) => x.key === 'maintenance_banner')?.value || '';
        this.guidelines = s.find((x) => x.key === 'community_guidelines')?.value || '';
      } else if (this.tab !== 'Notifications')
        this.rows.set(await this.api.get('/admin/' + this.tab.toLowerCase()));
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
  async setStatus(u: any, status: string) {
    if (
      !(await this.ui.confirm(
        status === 'active'
          ? 'Restore this account?'
          : status === 'banned'
            ? 'Ban this player?'
            : 'Suspend this player?',
        status === 'active'
          ? 'They can sign in again.'
          : 'Their sessions will be revoked immediately.',
        'Confirm',
      ))
    )
      return;
    this.busy.set(true);
    await this.ui.run(async () => {
      await this.api.put('/admin/users/' + u.id, { status });
      await this.load();
    }, 'Account status updated.');
    this.busy.set(false);
  }
  async deleteEvent(e: any) {
    if (
      !(await this.ui.confirm(
        'Delete this event?',
        'The event, participants, and chat will be permanently removed.',
        'Delete event',
      ))
    )
      return;
    this.busy.set(true);
    await this.ui.run(async () => {
      await this.api.delete('/admin/events/' + e.id);
      await this.load();
    }, 'Event deleted.');
    this.busy.set(false);
  }
  editSport(s: any) {
    this.sportModel = s
      ? { ...s }
      : { id: '', name: '', slug: '', icon: 'fitness', description: '', image_url: '' };
    this.sportOpen.set(true);
  }
  async saveSport() {
    this.busy.set(true);
    await this.ui.run(async () => {
      if (this.sportModel.id)
        await this.api.put('/admin/sports/' + this.sportModel.id, this.sportModel);
      else await this.api.post('/admin/sports', this.sportModel);
      this.api.sports.set(await this.api.get('/sports'));
      this.sportOpen.set(false);
      await this.load();
    }, 'Sport saved.');
    this.busy.set(false);
  }
  async resolve(r: any, status: string) {
    const resolution = await this.ui.prompt(
      'Review this report',
      'Record the outcome for the moderation team.',
      'Resolution notes',
    );
    if (!resolution) return;
    this.busy.set(true);
    await this.ui.run(async () => {
      await this.api.put('/admin/reports/' + r.id, { status, resolution });
      await this.load();
    }, 'Report reviewed.');
    this.busy.set(false);
  }
  async removeMessage(id: string) {
    if (
      !(await this.ui.confirm(
        'Remove this message?',
        'The reported message will be permanently removed.',
        'Remove message',
      ))
    )
      return;
    await this.ui.run(() => this.api.delete('/admin/messages/' + id), 'Message removed.');
  }
  async announce() {
    if (
      !(await this.ui.confirm(
        'Send to the entire crew?',
        'All active players will receive this announcement.',
        'Send announcement',
      ))
    )
      return;
    this.busy.set(true);
    await this.ui.run(async () => {
      await this.api.post('/admin/notifications', { title: this.announcement });
      this.announcement = '';
    }, 'Announcement sent.');
    this.busy.set(false);
  }
  async saveSettings() {
    this.busy.set(true);
    await this.ui.run(async () => {
      await this.api.put('/admin/settings', {
        key: 'maintenance_banner',
        value: this.banner || ' ',
      });
      await this.api.put('/admin/settings', {
        key: 'community_guidelines',
        value: this.guidelines,
      });
      this.api.settings.set({
        maintenance_banner: this.banner,
        community_guidelines: this.guidelines,
      });
    }, 'Settings saved.');
    this.busy.set(false);
  }
}
