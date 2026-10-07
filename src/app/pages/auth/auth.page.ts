import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { IconComponent } from '../../shared/icon.component';
@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  template: `<div class="auth-screen">
    <section class="auth-brand-panel">
      <a routerLink="/" class="brand">GORA<span class="brand-dot">.</span></a
      ><img src="/images/hero.jpg" alt="Basketball court" />
      <div class="auth-photo-shade"></div>
      <div class="auth-brand-copy">
        <span class="hero-label">FIND YOUR GAME.</span>
        <h1>YOUR GAME.<br />YOUR PEOPLE.<br /><span>LET’S GORA.</span></h1>
        <p>Find your game. Find your people. GORA!</p>
        <a routerLink="/tabs/home" class="back-link"
          >Explore the games<g-icon name="arrow-forward-outline"
        /></a>
      </div>
      <span class="auth-footer">PLAY. CONNECT. REPEAT.</span>
    </section>
    <section class="auth-form-panel">
      <a routerLink="/" class="mobile-auth-brand brand">GORA<span class="brand-dot">.</span></a>
      <div class="auth-form-wrap">
        <span class="eyebrow">{{
          mode === 'register' ? 'YOUR CREW IS WAITING' : 'WELCOME TO THE CLUB'
        }}</span>
        <h2>{{ heading }}</h2>
        <p class="muted">{{ subtitle }}</p>
        <form #form="ngForm" (ngSubmit)="form.valid && submit()">
          @if (mode === 'register') {
            <div class="form-grid">
              <label
                >Full name<input
                  name="full_name"
                  required
                  maxlength="80"
                  autocomplete="name"
                  [(ngModel)]="model.full_name"
                  placeholder="Alex Reyes" /></label
              ><label
                >Username<input
                  name="username"
                  required
                  pattern="[a-zA-Z0-9_]{3,30}"
                  autocomplete="username"
                  [(ngModel)]="model.username"
                  placeholder="alexreyes"
              /></label>
            </div>
          }
          @if (mode !== 'reset-password') {
            <label
              >Email address<input
                type="email"
                name="email"
                required
                email
                autocomplete="email"
                [(ngModel)]="model.email"
                placeholder="you@example.com"
            /></label>
          }
          @if (mode !== 'forgot-password') {
            <label
              >{{ mode === 'reset-password' ? 'New password' : 'Password'
              }}<input
                type="password"
                name="password"
                required
                [minlength]="mode === 'login' ? 1 : 10"
                maxlength="72"
                [autocomplete]="mode === 'login' ? 'current-password' : 'new-password'"
                [(ngModel)]="model.password"
                placeholder="Enter your password"
            /></label>
            @if (mode === 'login') {
              <a routerLink="/forgot-password" class="forgot-link">Forgot password?</a>
            } @else {
              <p class="form-hint">
                At least 10 characters, with an uppercase letter, a lowercase letter, and a number.
              </p>
              <label
                >Confirm password<input
                  type="password"
                  name="confirm_password"
                  required
                  autocomplete="new-password"
                  [(ngModel)]="model.confirm_password"
                  placeholder="Enter it one more time"
              /></label>
            }
          }
          @if (mode === 'register') {
            <div class="form-grid">
              <label
                >Date of birth<input
                  type="date"
                  required
                  name="date_of_birth"
                  [(ngModel)]="model.date_of_birth" /></label
              ><label
                >Location<input
                  required
                  name="location"
                  maxlength="120"
                  autocomplete="address-level2"
                  [(ngModel)]="model.location"
                  placeholder="Makati, Manila"
              /></label>
            </div>
            <label>Favorite sports</label>
            <div class="sport-checkboxes">
              @for (s of api.sports(); track s.id) {
                <label
                  ><input
                    type="checkbox"
                    [checked]="model.favorite_sports.includes(s.name)"
                    (change)="toggleSport(s.name)"
                  /><span>{{ s.name }}</span></label
                >
              }
            </div>
          }
          @if (error()) {
            <p class="form-error" role="alert">{{ error() }}</p>
          }
          @if (message()) {
            <p class="success-message" role="status">{{ message() }}</p>
          }
          @if (resetLink()) {
            <p class="development-note">
              Development email preview:
              <a [routerLink]="'/reset-password'" [queryParams]="{ token: resetToken() }"
                >Open password reset</a
              >
            </p>
          }
          <button
            type="submit"
            class="button primary full-width"
            [disabled]="
              busy() || !form.valid || (mode === 'register' && !model.favorite_sports.length)
            "
          >
            {{ busy() ? 'One moment…' : buttonText }}<g-icon name="arrow-forward-outline" />
          </button>
        </form>
        @if (mode === 'login') {
          <p class="auth-switch">
            New to the crew? <a routerLink="/register">Create an account</a>
          </p>
          @if (api.demoAvailable()) {
            <div class="auth-divider"><span>OR TAKE A LOOK AROUND</span></div>
            <button class="button secondary full-width" [disabled]="busy()" (click)="demo()">
              Explore demo<g-icon name="compass-outline" />
            </button>
            <p class="demo-note">A real account with sample games. Development only.</p>
          }
        } @else if (mode === 'register') {
          <p class="auth-switch">Already part of the crew? <a routerLink="/login">Sign in</a></p>
        } @else {
          <a routerLink="/login" class="back-link"
            ><g-icon name="arrow-back-outline" />Back to sign in</a
          >
        }
        <p class="auth-bottom-note">Good games start with respect. Play fair. Show up.</p>
      </div>
    </section>
  </div>`,
})
export class AuthPage {
  api = inject(ApiService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  mode = this.route.snapshot.routeConfig?.path || 'login';
  busy = signal(false);
  error = signal('');
  message = signal('');
  resetLink = signal('');
  model = {
    full_name: '',
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    date_of_birth: '',
    location: '',
    favorite_sports: [] as string[],
  };
  get heading() {
    return this.mode === 'login'
      ? 'Back in the game.'
      : this.mode === 'register'
        ? 'Find your crew.'
        : this.mode === 'forgot-password'
          ? 'Let’s get you back in.'
          : 'A fresh start.';
  }
  get subtitle() {
    return this.mode === 'login'
      ? 'Sign in and see what’s happening near you.'
      : this.mode === 'register'
        ? 'Your next great game starts right here.'
        : this.mode === 'forgot-password'
          ? 'Enter your email and we’ll send you a reset link.'
          : 'Choose a strong new password for your account.';
  }
  get buttonText() {
    return this.mode === 'login'
      ? 'Sign in'
      : this.mode === 'register'
        ? 'Join GORA'
        : this.mode === 'forgot-password'
          ? 'Send reset link'
          : 'Reset password';
  }
  constructor() {
    if (!this.api.ready()) void this.api.initialize();
  }
  toggleSport(s: string) {
    this.model.favorite_sports = this.model.favorite_sports.includes(s)
      ? this.model.favorite_sports.filter((v) => v !== s)
      : [...this.model.favorite_sports, s];
  }
  resetToken() {
    return new URL(this.resetLink()).searchParams.get('token');
  }
  async finish() {
    let returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/tabs/home';
    if (!returnUrl.startsWith('/') || returnUrl.startsWith('//')) returnUrl = '/tabs/home';
    await this.router.navigateByUrl(returnUrl);
  }
  async demo() {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.signIn('demo', {});
      await this.finish();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
  async submit() {
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      if (this.mode === 'login' || this.mode === 'register') {
        await this.api.signIn(this.mode, this.model);
        await this.finish();
      } else if (this.mode === 'forgot-password') {
        const r = await this.api.post('/auth/forgot-password', { email: this.model.email });
        this.message.set(r.message);
        this.resetLink.set(r.development_reset_link || '');
      } else {
        const r = await this.api.post('/auth/reset-password', {
          token: this.route.snapshot.queryParamMap.get('token'),
          password: this.model.password,
          confirm_password: this.model.confirm_password,
        });
        this.message.set(r.message);
        this.model.password = this.model.confirm_password = '';
      }
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
