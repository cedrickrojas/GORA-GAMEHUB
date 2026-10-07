import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IconComponent } from '../shared/icon.component';
@Component({
  selector: 'g-category',
  standalone: true,
  imports: [IconComponent],
  template: `<button
    class="category-chip"
    [class.active]="active"
    [attr.aria-pressed]="active"
    (click)="select.emit()"
  >
    <g-icon [name]="icon" />{{ name }}
    @if (count !== null) {
      <span>{{ count }}</span>
    }
  </button>`,
})
export class CategoryChipComponent {
  @Input() name = 'All sports';
  @Input() icon = 'grid-outline';
  @Input() active = false;
  @Input() count: number | null = null;
  @Output() select = new EventEmitter<void>();
}
