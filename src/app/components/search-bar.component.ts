import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../shared/icon.component';
@Component({
  selector: 'g-search',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `<form class="search-box" role="search" (ngSubmit)="submitted.emit(value)">
    <button type="submit" class="icon-button search-submit" aria-label="Search">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        aria-hidden="true"
      >
        <circle cx="10.5" cy="10.5" r="7.5" />
        <path d="M16 16 21 21" stroke-linecap="round" />
      </svg></button
    ><input
      type="search"
      name="query"
      maxlength="120"
      enterkeyhint="search"
      [placeholder]="placeholder"
      [attr.aria-label]="placeholder"
      [(ngModel)]="value"
      (ngModelChange)="queryChange.emit($event)"
    />
    @if (value) {
      <button type="button" class="icon-button" aria-label="Clear search" (click)="clear()">
        <g-icon name="close-outline" />
      </button>
    }
  </form>`,
})
export class SearchBarComponent {
  @Input() placeholder = 'Find games, people, or sports';
  @Input() value = '';
  @Output() queryChange = new EventEmitter<string>();
  @Output() submitted = new EventEmitter<string>();
  clear() {
    this.value = '';
    this.queryChange.emit('');
  }
}
