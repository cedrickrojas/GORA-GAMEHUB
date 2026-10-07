import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../shared/icon.component';
@Component({
  selector: 'g-search',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `<div class="search-box">
    <g-icon name="search-outline" /><input
      type="search"
      [placeholder]="placeholder"
      [attr.aria-label]="placeholder"
      [(ngModel)]="value"
      (ngModelChange)="change.emit($event)"
      (keydown.enter)="search.emit(value)"
    />
    @if (value) {
      <button class="icon-button" aria-label="Clear search" (click)="clear()">
        <g-icon name="close-outline" />
      </button>
    }
  </div>`,
})
export class SearchBarComponent {
  @Input() placeholder = 'Find games, people, or sports';
  @Input() value = '';
  @Output() change = new EventEmitter<string>();
  @Output() search = new EventEmitter<string>();
  clear() {
    this.value = '';
    this.change.emit('');
  }
}
