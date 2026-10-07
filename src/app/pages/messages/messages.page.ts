import { Component, inject, signal, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { UiService } from '../../services/ui.service';
import { Message, Conversation, Person } from '../../models';
import { AvatarComponent } from '../../components/avatar.component';
import { MessageBubbleComponent } from '../../components/message-bubble.component';
import { EmptyStateComponent } from '../../components/states.component';
import { IconComponent } from '../../shared/icon.component';
import { SearchBarComponent } from '../../components/search-bar.component';
import { DialogComponent } from '../../components/dialog.component';
@Component({
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    RouterLink,
    AvatarComponent,
    MessageBubbleComponent,
    EmptyStateComponent,
    IconComponent,
    SearchBarComponent,
    DialogComponent,
  ],
  template: `<div class="page-heading">
      <div>
        <div class="eyebrow">KEEP THE CREW CONNECTED</div>
        <h1>Messages<span class="orange-text">.</span></h1>
        <p>The conversation starts before the whistle.</p>
      </div>
      <button class="button primary" (click)="newChat()">
        <g-icon name="add-outline" />New message
      </button>
    </div>
    @if (error()) {
      <p class="form-error" role="alert">{{ error() }}</p>
    }
    <div class="messaging-layout panel" [class.chat-open]="!!selected()">
      <aside class="conversation-list">
        <div class="conversation-search">
          <g-search placeholder="Search conversations" (queryChange)="q = $event" />
        </div>
        @for (c of filtered(); track c.id) {
          <button
            class="conversation-row"
            [class.active]="selected()?.id === c.id"
            (click)="select(c)"
          >
            <g-avatar
              [src]="c.avatar_url"
              [name]="c.event_id ? c.title : c.peer_name"
              [size]="44"
            /><span class="conversation-copy"
              ><strong>{{ c.event_id ? c.title : c.peer_name }}</strong
              ><small>{{ c.last_message || 'Start the conversation.' }}</small></span
            ><span class="conversation-meta"
              ><small>{{ c.last_message_at | date: 'MMM d' : '+0800' }}</small>
              @if (c.unread) {
                <b>{{ c.unread }}</b>
              }
            </span>
          </button>
        }
        @if (!conversations().length) {
          <g-empty
            title="Your crew is one message away"
            description="Start a conversation or join a game chat."
          />
        }
      </aside>
      <section class="chat-panel">
        @if (selected(); as c) {
          <div class="chat-header">
            <button
              class="icon-button mobile-chat-back"
              aria-label="Back to conversations"
              (click)="selected.set(null)"
            >
              <g-icon name="arrow-back-outline" /></button
            ><g-avatar [src]="c.avatar_url" [name]="c.event_id ? c.title : c.peer_name" />
            <div>
              <h3>{{ c.event_id ? c.title : c.peer_name }}</h3>
              <small>{{ c.event_id ? 'Event group chat' : 'Direct message' }}</small>
            </div>
            @if (c.event_id) {
              <a [routerLink]="['/event', c.event_id]" class="text-button"
                >View game<g-icon name="arrow-forward-outline"
              /></a>
            }
          </div>
          <div class="chat-messages" #chatScroll aria-live="polite">
            @for (m of messages(); track m.id) {
              <g-message
                [message]="m"
                [own]="m.sender_id === api.user()?.id"
                (report)="report($event)"
              />
            }
            @if (!messages().length) {
              <g-empty title="Break the ice" description="Say hello to your crew." />
            }
          </div>
          <form class="message-composer" (ngSubmit)="send()">
            <input
              name="message"
              [(ngModel)]="draft"
              maxlength="2000"
              autocomplete="off"
              aria-label="Message"
              placeholder="Message your crew…"
            /><button
              class="send-button"
              type="submit"
              [disabled]="sending() || !draft.trim()"
              aria-label="Send message"
            >
              <g-icon name="send-outline" />
            </button>
          </form>
        } @else {
          <g-empty
            title="Good games start with a conversation"
            description="Select a chat or message someone new."
            icon="chatbubble-ellipses-outline"
          />
        }
      </section>
    </div>
    <g-dialog [open]="newOpen()" title="Start a conversation" (closed)="newOpen.set(false)"
      ><g-search placeholder="Find a person" (queryChange)="searchPeople($event)" />
      <div class="invite-list">
        @for (p of people(); track p.id) {
          <button (click)="start(p)">
            <g-avatar [src]="p.avatar_url" [name]="p.full_name" /><span
              >{{ p.full_name }}<small>&#64;{{ p.username }}</small></span
            ><g-icon name="arrow-forward-outline" />
          </button>
        }</div
    ></g-dialog>`,
})
export class MessagesPage implements OnDestroy {
  api = inject(ApiService);
  ui = inject(UiService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  conversations = signal<Conversation[]>([]);
  selected = signal<Conversation | null>(null);
  messages = signal<Message[]>([]);
  people = signal<Person[]>([]);
  error = signal('');
  sending = signal(false);
  newOpen = signal(false);
  q = '';
  draft = '';
  timer: ReturnType<typeof setInterval>;
  searchTimer?: ReturnType<typeof setTimeout>;
  sub: Subscription;
  @ViewChild('chatScroll') chatScroll?: ElementRef<HTMLElement>;
  sequence = 0;
  constructor() {
    this.sub = this.route.queryParamMap.subscribe(() => void this.load());
    this.timer = setInterval(() => void this.poll(), 5000);
  }
  filtered() {
    return this.conversations().filter((c) =>
      (c.title + ' ' + c.peer_name).toLowerCase().includes(this.q.toLowerCase()),
    );
  }
  async load() {
    try {
      this.conversations.set(await this.api.get<Conversation[]>('/conversations'));
      const id = this.route.snapshot.queryParamMap.get('conversation');
      if (id) {
        const c = this.conversations().find((c) => c.id === id);
        if (c) await this.select(c, false);
      }
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
  async select(c: Conversation, navigate = true) {
    this.selected.set(c);
    this.draft = '';
    if (navigate) {
      await this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { conversation: c.id },
      });
      return;
    }
    await this.loadMessages(true);
  }
  async loadMessages(scroll = false) {
    const c = this.selected();
    if (!c) return;
    const seq = ++this.sequence;
    try {
      const before = this.messages().at(-1)?.id;
      const r = await this.api.get<Message[]>('/conversations/' + c.id + '/messages');
      if (seq !== this.sequence || this.selected()?.id !== c.id) return;
      this.messages.set(r);
      this.error.set('');
      if (scroll || before !== r.at(-1)?.id)
        setTimeout(() => {
          const el = this.chatScroll?.nativeElement;
          if (el) el.scrollTop = el.scrollHeight;
        }, 30);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
  async poll() {
    if (document.hidden) return;
    await this.loadMessages();
    try {
      this.conversations.set(await this.api.get<Conversation[]>('/conversations'));
    } catch {
      /* The next poll retries connection failures. */
    }
  }
  async send() {
    const body = this.draft.trim(),
      c = this.selected();
    if (!body || !c || this.sending()) return;
    this.sending.set(true);
    await this.ui.run(async () => {
      await this.api.post('/conversations/' + c.id + '/messages', { body });
      this.draft = '';
      await this.loadMessages(true);
    });
    this.sending.set(false);
  }
  async newChat() {
    await this.ui.run(async () => {
      this.people.set(await this.api.get<Person[]>('/people'));
      this.newOpen.set(true);
    });
  }
  searchPeople(q: string) {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(
      () =>
        void this.ui.run(async () =>
          this.people.set(await this.api.get<Person[]>('/people?q=' + encodeURIComponent(q))),
        ),
      300,
    );
  }
  async start(p: Person) {
    await this.ui.run(async () => {
      const c = await this.api.post('/conversations', { user_id: p.id });
      this.newOpen.set(false);
      await this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { conversation: c.id },
      });
      await this.load();
    });
  }
  async report(m: Message) {
    const reason = await this.ui.prompt(
      'Report message',
      'Tell us why this message needs review.',
      'Reason for your report',
    );
    if (reason)
      await this.ui.run(
        () => this.api.post('/reports', { message_id: m.id, reason }),
        'Report sent for review.',
      );
  }
  ngOnDestroy() {
    clearInterval(this.timer);
    clearTimeout(this.searchTimer);
    this.sub.unsubscribe();
  }
}
