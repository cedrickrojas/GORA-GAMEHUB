import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Game } from '../models';
import { IconComponent } from '../shared/icon.component';
@Component({
  selector: 'g-calendar',
  standalone: true,
  imports: [DatePipe, IconComponent],
  template: `<div class="game-calendar">
    <div class="calendar-toolbar">
      <div class="calendar-controls">
        <button class="icon-button" aria-label="Previous period" (click)="move(-1)">
          <g-icon name="chevron-back-outline" />
        </button>
        <h2>{{ anchor | date: (view === 'Month' ? 'MMMM yyyy' : 'MMM d, yyyy') : '+0800' }}</h2>
        <button class="icon-button" aria-label="Next period" (click)="move(1)">
          <g-icon name="chevron-forward-outline" />
        </button>
      </div>
      <div class="segmented">
        @for (v of views; track v) {
          <button [class.selected]="view === v" (click)="setView(v)">{{ v }}</button>
        }
      </div>
      <button class="text-button" (click)="now()">Jump to today</button>
    </div>
    <div class="calendar-days" [class.month]="view === 'Month'" [class.day]="view === 'Today'">
      @for (d of days; track d.getTime()) {
        <button
          [class.other-month]="view === 'Month' && d.getMonth() !== anchor.getMonth()"
          [class.current]="same(d, newDate)"
          [class.selected]="same(d, selected)"
          [attr.aria-label]="d | date: 'EEEE, MMMM d' : '+0800'"
          (click)="pick(d)"
        >
          <span>{{ d | date: 'EEE' : '+0800' }}</span
          ><strong>{{ d | date: 'd' : '+0800' }}</strong>
          <div class="event-dots">
            @for (e of dayGames(d).slice(0, 3); track e.id) {
              <i [class.cancelled]="e.status === 'cancelled'"></i>
            }
          </div>
        </button>
      }
    </div>
  </div>`,
})
export class GameCalendarComponent {
  @Input() games: Game[] = [];
  @Output() selection = new EventEmitter<{ date: Date; view: string; dayOnly: boolean }>();
  anchor = new Date();
  selected: Date | null = null;
  newDate = new Date();
  view = 'Week';
  views = ['Today', 'Week', 'Month'];
  get days() {
    if (this.view === 'Today') return [this.anchor];
    const start = new Date(this.anchor);
    if (this.view === 'Month') {
      start.setDate(1);
      start.setDate(start.getDate() - start.getDay());
      return Array.from({ length: 42 }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d;
      });
    }
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }
  same(a: Date, b: Date | null) {
    return (
      !!b &&
      a.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }) ===
        b.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
    );
  }
  dayGames(d: Date) {
    return this.games.filter((e) => this.same(d, new Date(e.starts_at)));
  }
  move(n: number) {
    const d = new Date(this.anchor);
    if (this.view === 'Month') d.setMonth(d.getMonth() + n, 1);
    else d.setDate(d.getDate() + n * (this.view === 'Week' ? 7 : 1));
    this.anchor = d;
    this.selected = null;
    this.emit(false);
  }
  setView(v: string) {
    this.view = v;
    this.selected = null;
    this.emit(false);
  }
  pick(d: Date) {
    this.selected = d;
    this.selection.emit({ date: d, view: this.view, dayOnly: true });
  }
  now() {
    this.anchor = new Date();
    this.selected = null;
    this.emit(false);
  }
  emit(dayOnly: boolean) {
    this.selection.emit({ date: this.anchor, view: this.view, dayOnly });
  }
}
