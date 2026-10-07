import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { IconComponent } from '../../shared/icon.component';
import { LoadingStateComponent } from '../../components/states.component';
@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, LoadingStateComponent],
  template: `<a routerLink="/tabs/discover" class="back-link"
      ><g-icon name="arrow-back-outline" />Back to games</a
    >
    <div class="page-heading">
      <div>
        <div class="eyebrow">BRING PEOPLE TOGETHER</div>
        <h1>
          {{ edit ? 'Set your game plan' : 'Create a game' }}<span class="orange-text">.</span>
        </h1>
        <p>You bring the idea. Your next crew brings the energy.</p>
      </div>
    </div>
    @if (loading()) {
      <g-loading />
    } @else {
      <form class="event-form panel" #form="ngForm" (ngSubmit)="form.valid && save()">
        <div class="form-section-heading">
          <span>01</span>
          <h2>The game</h2>
        </div>
        <div class="form-grid">
          <label class="span-2"
            >Event title<input
              required
              maxlength="120"
              name="title"
              [(ngModel)]="model.title"
              placeholder="e.g. Sunday Basketball Run" /></label
          ><label
            >Sport<select required name="sport" [(ngModel)]="model.sport_id">
              <option value="" disabled>Choose your sport</option>
              @for (s of api.sports(); track s.id) {
                <option [value]="s.id">{{ s.name }}</option>
              }
            </select></label
          ><label
            >Game type<select name="type" [(ngModel)]="model.type">
              @for (t of types; track t) {
                <option>{{ t }}</option>
              }
            </select></label
          ><label class="span-2"
            >Description<textarea
              name="description"
              [(ngModel)]="model.description"
              rows="4"
              maxlength="3000"
              placeholder="What should your crew know? Gear, ground rules, and what to expect."
            ></textarea>
          </label>
        </div>
        <div class="form-section-heading">
          <span>02</span>
          <h2>When & where</h2>
        </div>
        <div class="form-grid">
          <label
            >Starts at<input
              type="datetime-local"
              required
              name="start"
              [(ngModel)]="start" /></label
          ><label
            >Ends at<input type="datetime-local" required name="end" [(ngModel)]="end" /></label
          ><span class="form-hint span-2">All event times are in Philippine time (UTC+8).</span
          ><label
            >City / location<input
              required
              name="location"
              maxlength="120"
              [(ngModel)]="model.location"
              placeholder="Makati, Manila" /></label
          ><label
            >Venue<input
              required
              name="venue"
              maxlength="160"
              [(ngModel)]="model.venue"
              placeholder="Court, club, or sports bar"
          /></label>
        </div>
        <div class="form-section-heading">
          <span>03</span>
          <h2>The crew</h2>
        </div>
        <div class="form-grid">
          <label
            >Maximum participants<input
              type="number"
              required
              min="2"
              max="500"
              name="maximum"
              [(ngModel)]="model.max_participants" /></label
          ><label
            >Minimum participants<input
              type="number"
              required
              min="1"
              [max]="model.max_participants"
              name="required"
              [(ngModel)]="model.required_participants" /></label
          ><label
            >Skill level<select name="skill" [(ngModel)]="model.skill_level">
              @for (s of skills; track s) {
                <option>{{ s }}</option>
              }
            </select></label
          ><label
            >Who can join?<select name="privacy" [(ngModel)]="model.privacy">
              <option>Public</option>
              <option>Friends</option>
              <option>Private</option>
            </select></label
          >
          <p class="form-hint span-2">
            Public games are open to everyone. Friends games are for your connections. Private games
            require host approval.
          </p>
          <label class="span-2"
            >Cover image URL <span class="muted">(optional)</span
            ><input
              type="url"
              name="image"
              [(ngModel)]="model.image_url"
              placeholder="https://… (a sport photo is included by default)"
          /></label>
        </div>
        @if (error()) {
          <p class="form-error" role="alert">{{ error() }}</p>
        }
        <div class="form-actions">
          <a routerLink="/tabs/discover" class="button secondary">Cancel</a
          ><button class="button primary" type="submit" [disabled]="busy() || !form.valid">
            {{ busy() ? 'Saving your game…' : edit ? 'Save game' : 'Publish game'
            }}<g-icon name="arrow-forward-outline" />
          </button>
        </div>
      </form>
    }`,
})
export class EventFormPage {
  api = inject(ApiService);
  ui = inject(UiService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  edit = !!this.route.snapshot.paramMap.get('id');
  types = ['Watch a Game', 'Play a Game', 'Practice', 'Tournament', 'Casual Match'];
  skills = ['Any', 'Beginner', 'Intermediate', 'Advanced'];
  start = '';
  end = '';
  model = {
    title: '',
    sport_id: '',
    description: '',
    location: 'Metro Manila',
    venue: '',
    max_participants: 12,
    required_participants: 2,
    type: 'Play a Game',
    skill_level: 'Any',
    privacy: 'Public',
    image_url: '',
  };
  constructor() {
    void this.init();
  }
  async init() {
    try {
      if (!this.api.ready()) await this.api.initialize();
      if (this.edit) {
        const e = await this.api.get('/events/' + this.route.snapshot.paramMap.get('id'));
        if (e.host_id !== this.api.user()?.id) {
          await this.router.navigate(['/event', e.id]);
          return;
        }
        this.model = { ...this.model, ...e };
        this.start = this.localDate(e.starts_at);
        this.end = this.localDate(e.ends_at);
      } else {
        const d = new Date(Date.now() + 86400000);
        d.setMinutes(0, 0, 0);
        this.start = this.localDate(d.toISOString());
        this.end = this.localDate(new Date(d.getTime() + 7200000).toISOString());
      }
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
  localDate(v: string) {
    return new Date(v)
      .toLocaleString('sv-SE', { timeZone: 'Asia/Manila' })
      .replace(' ', 'T')
      .slice(0, 16);
  }
  async save() {
    this.busy.set(true);
    this.error.set('');
    try {
      const data = {
        ...this.model,
        image_url: this.model.image_url || undefined,
        starts_at: new Date(this.start + ':00+08:00').toISOString(),
        ends_at: new Date(this.end + ':00+08:00').toISOString(),
      };
      const e = this.edit
        ? await this.api.put('/events/' + this.route.snapshot.paramMap.get('id'), data)
        : await this.api.post('/events', data);
      await this.ui.toast(
        this.edit
          ? 'Game updated. Your crew has been notified.'
          : 'Game published. Let’s bring the crew!',
      );
      await this.router.navigate(['/event', e.id]);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
