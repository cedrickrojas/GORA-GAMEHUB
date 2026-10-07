import { PhotoPipe } from '../../shared/photo.pipe';
import { Component, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { Person, Game } from '../../models';
import { ProfileHeaderComponent } from '../../components/profile-header.component';
import { AvatarComponent } from '../../components/avatar.component';
import { CategoryChipComponent } from '../../components/category-chip.component';
import { EmptyStateComponent, LoadingStateComponent } from '../../components/states.component';
import { DialogComponent } from '../../components/dialog.component';
import { IconComponent } from '../../shared/icon.component';
@Component({
  standalone: true,
  imports: [
    PhotoPipe,
    FormsModule,
    DatePipe,
    RouterLink,
    ProfileHeaderComponent,
    AvatarComponent,
    CategoryChipComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    DialogComponent,
    IconComponent,
  ],
  template: `@if (loading()) {
      <g-loading />
    } @else if (error()) {
      <g-empty
        title="Profile unavailable"
        [description]="error()"
        action="Try again"
        (retry)="load()"
      />
    } @else if (person(); as p) {
      <div class="panel profile-panel">
        <g-profile-header
          [person]="p"
          [own]="own()"
          [busy]="busy()"
          (edit)="edit()"
          (follow)="follow()"
          (message)="message()"
          (connections)="connections($event)"
        />
        <div class="profile-tabs">
          @for (t of tabs; track t) {
            <button [class.active]="tab === t" (click)="tab = t">{{ t }}</button>
          }
        </div>
        <div class="profile-tab-content">
          @if (tab === 'About') {
            <div class="profile-about">
              <div>
                <span class="eyebrow">OFF THE COURT</span>
                <h2>A little about {{ own() ? 'you' : p.full_name.split(' ')[0] }}</h2>
                <p class="description-text">
                  {{ p.bio || 'This player is ready to find their next game.' }}
                </p>
                <h3>Favorite sports</h3>
                <div class="category-row">
                  @for (s of p.favorite_sports; track s) {
                    <g-category [name]="s" [icon]="sportIcon(s)" (select)="sport(s)" />
                  }
                </div>
                @if (p.favorite_team) {
                  <div class="favorite-team">
                    <g-icon name="flag-outline" /><span
                      >Repping <strong>{{ p.favorite_team }}</strong></span
                    >
                  </div>
                }
              </div>
              <aside class="profile-about-side">
                <div class="profile-about-card">
                  <g-icon name="shield-checkmark-outline" />
                  <h3>Part of the GORA crew</h3>
                  <p>Here to play, connect, and make every game count.</p>
                </div>
                @if (!own()) {
                  <button
                    class="button secondary full-width"
                    [disabled]="busy()"
                    (click)="friend()"
                  >
                    <g-icon name="person-add-outline" />{{
                      p.friendship_status === 'accepted'
                        ? 'Remove friend'
                        : p.friendship_status === 'pending'
                          ? p.friendship_incoming
                            ? 'Accept request'
                            : 'Cancel request'
                          : 'Add friend'
                    }}
                  </button>
                  @if (p.friendship_status === 'pending' && p.friendship_incoming) {
                    <button class="text-button" (click)="rejectFriend()">Reject request</button>
                  }
                  <button class="text-button report-button" (click)="report()">
                    Report profile
                  </button>
                } @else {
                  @if (p.role === 'admin') {
                    <a routerLink="/admin" class="button secondary full-width"
                      ><g-icon name="shield-checkmark-outline" />Admin dashboard</a
                    >
                  }
                  <button class="text-button" (click)="logout()">
                    <g-icon name="log-out-outline" />Sign out
                  </button>
                }
              </aside>
            </div>
          } @else {
            <div class="profile-game-list">
              @for (e of filteredGames(); track e.id) {
                <a [routerLink]="['/event', e.id]" class="profile-game-row"
                  ><img [src]="e.image_url | photo" [alt]="e.sport" />
                  <div>
                    <span class="eyebrow">{{ e.sport }}</span>
                    <h3>{{ e.title }}</h3>
                    <p>{{ e.starts_at | date: 'MMM d · h:mm a' : '+0800' }} · {{ e.venue }}</p>
                  </div>
                  <g-icon name="arrow-forward-outline"
                /></a>
              }
              @if (!filteredGames().length) {
                <g-empty
                  [title]="
                    tab === 'Upcoming'
                      ? 'The next game is out there'
                      : 'The first chapter starts on the court'
                  "
                  description="Find a game, bring your energy, and make some memories."
                />
              }
            </div>
          }
        </div>
      </div>
    }
    <g-dialog [open]="editOpen()" title="Make it yours" (closed)="closeEdit()">
      @if (editModel; as m) {
        <form #form="ngForm" (ngSubmit)="form.valid && save()">
          <div class="form-grid">
            <div class="span-2 profile-photo-editor">
              <label for="profile-photo">Profile photo</label>
              <div class="photo-editor-row">
                <g-avatar [src]="photoPreview() || m.avatar_url" [name]="m.full_name" [size]="72" />
                <div class="photo-editor-controls">
                  <input
                    #photoInput
                    id="profile-photo"
                    class="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    [disabled]="busy()"
                    (change)="selectPhoto($event)"
                    aria-describedby="photo-help"
                  />
                  <div class="photo-editor-actions">
                    <button
                      type="button"
                      class="button secondary small"
                      [disabled]="busy()"
                      (click)="photoInput.click()"
                    >
                      <g-icon name="image-outline" />{{
                        selectedPhoto ? 'Change photo' : 'Upload photo'
                      }}
                    </button>
                    @if (selectedPhoto || m.avatar_url || photoError()) {
                      <button
                        type="button"
                        class="text-button"
                        [disabled]="busy()"
                        (click)="removePhoto(); photoInput.value = ''"
                      >
                        Remove photo
                      </button>
                    }
                  </div>
                  <p id="photo-help" class="photo-help">
                    JPG, PNG, or WebP. Max 5 MB. Saved with your profile.
                  </p>
                  @if (photoName()) {
                    <p class="photo-filename">{{ photoName() }}</p>
                  }
                </div>
              </div>
              @if (photoError()) {
                <p class="form-error" role="alert">{{ photoError() }}</p>
              }
            </div>
            <label class="span-2"
              >Full name<input
                required
                name="full_name"
                [(ngModel)]="m.full_name"
                maxlength="80" /></label
            ><label class="span-2"
              >Bio<textarea
                name="bio"
                [(ngModel)]="m.bio"
                maxlength="500"
                rows="3"
              ></textarea></label
            ><label
              >Location<input
                required
                name="location"
                [(ngModel)]="m.location"
                maxlength="120" /></label
            ><label
              >Favorite team<input name="team" [(ngModel)]="m.favorite_team" maxlength="80"
            /></label>
            <label
              >Available seats<input
                type="number"
                required
                min="0"
                max="100"
                name="seats"
                [(ngModel)]="m.available_seats" /></label
            ><label
              >Preferred group size<input
                type="number"
                required
                min="1"
                max="100"
                name="group"
                [(ngModel)]="m.group_size" /></label
            ><label
              >Latitude <span class="muted">(optional)</span
              ><input
                type="number"
                step="any"
                min="-90"
                max="90"
                name="latitude"
                [(ngModel)]="m.latitude" /></label
            ><label
              >Longitude <span class="muted">(optional)</span
              ><input
                type="number"
                step="any"
                min="-180"
                max="180"
                name="longitude"
                [(ngModel)]="m.longitude"
            /></label>
          </div>
          <label>Favorite sports</label>
          <div class="sport-checkboxes">
            @for (s of api.sports(); track s.id) {
              <label
                ><input
                  type="checkbox"
                  [checked]="m.favorite_sports.includes(s.name)"
                  (change)="toggleSport(s.name)"
                /><span>{{ s.name }}</span></label
              >
            }
          </div>
          @if (saveError()) {
            <p class="form-error" role="alert">{{ saveError() }}</p>
          }
          <button
            class="button primary full-width"
            [disabled]="busy() || !form.valid || !m.favorite_sports.length || !!photoError()"
          >
            {{ busy() ? (selectedPhoto ? 'Uploading photo…' : 'Saving…') : 'Save profile' }}
          </button>
          <details class="delete-account">
            <summary>Account settings</summary>
            <p>Deleting your account removes your profile, hosted games, and messages.</p>
            <label
              >Confirm your password<input
                type="password"
                name="deletePassword"
                [(ngModel)]="deletePassword"
                autocomplete="current-password" /></label
            ><button
              type="button"
              class="text-button danger-text"
              [disabled]="busy() || !deletePassword"
              (click)="deleteAccount()"
            >
              Delete my account
            </button>
          </details>
        </form>
      }
    </g-dialog>
    <g-dialog
      [open]="connectionsOpen()"
      [title]="connectionKind"
      (closed)="connectionsOpen.set(false)"
      ><div class="invite-list">
        @for (p of connectionPeople(); track p.id) {
          <a [routerLink]="['/user', p.id]" (click)="connectionsOpen.set(false)"
            ><g-avatar [src]="p.avatar_url | photo" [name]="p.full_name" /><span
              >{{ p.full_name }}<small>&#64;{{ p.username }}</small></span
            ><g-icon name="arrow-forward-outline"
          /></a>
        }
        @if (!connectionPeople().length) {
          <g-empty title="Your crew is growing" description="New connections will show up here." />
        }</div
    ></g-dialog>`,
})
export class ProfilePage implements OnDestroy {
  api = inject(ApiService);
  ui = inject(UiService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  person = signal<Person | null>(null);
  games = signal<Game[]>([]);
  loading = signal(true);
  error = signal('');
  busy = signal(false);
  editOpen = signal(false);
  connectionsOpen = signal(false);
  connectionPeople = signal<Person[]>([]);
  connectionKind = 'Followers';
  tab = 'About';
  tabs = ['About', 'Upcoming', 'Past games'];
  editModel: Person | null = null;
  saveError = signal('');
  photoPreview = signal<string | null>(null);
  photoName = signal('');
  photoError = signal('');
  selectedPhoto: File | null = null;
  deletePassword = '';
  sub: Subscription;
  constructor() {
    this.sub = this.route.paramMap.subscribe(() => {
      this.tab = 'About';
      void this.load();
    });
  }
  own() {
    return this.person()?.id === this.api.user()?.id;
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      if (!this.api.ready()) await this.api.initialize();
      const id = this.route.snapshot.paramMap.get('id') || this.api.user()?.id;
      if (!id) {
        void this.router.navigate(['/login']);
        return;
      }
      const [p, g] = await Promise.all([
        this.api.get<Person>('/users/' + id),
        this.api.get<Game[]>('/users/' + id + '/events'),
      ]);
      this.person.set(p);
      this.games.set(g);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
  filteredGames() {
    return this.games().filter(
      (e) =>
        e.status !== 'cancelled' &&
        (this.tab === 'Upcoming'
          ? new Date(e.ends_at).getTime() >= Date.now()
          : new Date(e.ends_at).getTime() < Date.now()),
    );
  }
  sportIcon(name: string) {
    return (this.api.sports().find((s) => s.name === name)?.icon || 'fitness') + '-outline';
  }
  sport(name: string) {
    void this.router.navigate(['/tabs/discover'], { queryParams: { sport: name } });
  }
  edit() {
    this.resetPhoto();
    this.editModel = structuredClone(this.person());
    this.saveError.set('');
    this.editOpen.set(true);
  }
  closeEdit() {
    this.editOpen.set(false);
    if (!this.busy()) this.resetPhoto();
  }
  selectPhoto(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.photoError.set('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.photoError.set('Choose a JPG, PNG, or WebP photo.');
      input.value = '';
      return;
    }
    if (!file.size || file.size > 5 * 1024 * 1024) {
      this.photoError.set('Choose a photo up to 5 MB.');
      input.value = '';
      return;
    }
    this.resetPhoto();
    this.selectedPhoto = file;
    this.photoName.set(file.name);
    this.photoPreview.set(URL.createObjectURL(file));
  }
  removePhoto() {
    this.resetPhoto();
    if (this.editModel) this.editModel.avatar_url = '';
  }
  private resetPhoto() {
    const preview = this.photoPreview();
    if (preview) URL.revokeObjectURL(preview);
    this.photoPreview.set(null);
    this.photoName.set('');
    this.photoError.set('');
    this.selectedPhoto = null;
  }
  toggleSport(s: string) {
    if (this.editModel)
      this.editModel.favorite_sports = this.editModel.favorite_sports.includes(s)
        ? this.editModel.favorite_sports.filter((v) => v !== s)
        : [...this.editModel.favorite_sports, s];
  }
  async save() {
    this.busy.set(true);
    this.saveError.set('');
    try {
      let body: Person | FormData | null = this.editModel;
      if (this.selectedPhoto) {
        const upload = new FormData();
        upload.append('profile', JSON.stringify(this.editModel));
        upload.append('photo', this.selectedPhoto, this.selectedPhoto.name);
        body = upload;
      }
      const p = await this.api.put<Person>('/users/' + this.person()!.id, body);
      this.person.set(p);
      this.api.user.set(p);
      this.editOpen.set(false);
      this.resetPhoto();
      await this.ui.toast('Profile updated. Your game, your way.');
    } catch (e) {
      this.saveError.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
  async follow() {
    if (!this.api.requireUser()) return;
    this.busy.set(true);
    await this.ui.run(async () => {
      const p = this.person()!;
      if (p.is_following) await this.api.delete('/people/' + p.id + '/follow');
      else await this.api.post('/people/' + p.id + '/follow');
      await this.load();
    });
    this.busy.set(false);
  }
  async message() {
    if (!this.api.requireUser()) return;
    await this.ui.run(async () => {
      const c = await this.api.post('/conversations', { user_id: this.person()!.id });
      await this.router.navigate(['/tabs/messages'], { queryParams: { conversation: c.id } });
    });
  }
  async friend() {
    if (!this.api.requireUser()) return;
    const p = this.person()!;
    this.busy.set(true);
    await this.ui.run(async () => {
      if (
        p.friendship_status === 'accepted' ||
        (p.friendship_status === 'pending' && !p.friendship_incoming)
      ) {
        if (
          !(await this.ui.confirm(
            'Remove connection?',
            'You can always connect again later.',
            'Remove',
          ))
        )
          return;
        await this.api.delete('/friends/' + p.id);
      } else if (p.friendship_incoming) await this.api.post('/friends/' + p.id + '/accept');
      else await this.api.post('/friends/' + p.id + '/request');
      await this.load();
    });
    this.busy.set(false);
  }
  async rejectFriend() {
    await this.ui.run(async () => {
      await this.api.delete('/friends/' + this.person()!.id);
      await this.load();
    }, 'Request declined.');
  }
  async connections(kind: string) {
    await this.ui.run(async () => {
      this.connectionKind = kind[0].toUpperCase() + kind.slice(1);
      this.connectionPeople.set(
        await this.api.get<Person[]>('/users/' + this.person()!.id + '/connections?kind=' + kind),
      );
      this.connectionsOpen.set(true);
    });
  }
  async logout() {
    await this.ui.run(() => this.api.logout());
  }
  async report() {
    if (!this.api.requireUser()) return;
    const reason = await this.ui.prompt(
      'Report profile',
      'Tell the moderation team what happened.',
      'Reason for report',
    );
    if (reason)
      await this.ui.run(
        () => this.api.post('/reports', { user_id: this.person()!.id, reason }),
        'Report submitted.',
      );
  }
  async deleteAccount() {
    if (
      !(await this.ui.confirm(
        'Delete your account?',
        'Your profile, hosted games, and messages will be permanently deleted.',
        'Delete account',
      ))
    )
      return;
    this.busy.set(true);
    await this.ui.run(async () => {
      await this.api.delete('/users/' + this.person()!.id, { password: this.deletePassword });
      this.api.user.set(null);
      this.editOpen.set(false);
      await this.router.navigate(['/login']);
    }, 'Your account was deleted.');
    this.busy.set(false);
  }
  ngOnDestroy() {
    this.resetPhoto();
    this.sub.unsubscribe();
  }
}
