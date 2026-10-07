import { PhotoPipe } from '../shared/photo.pipe';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
@Component({
  selector: 'g-avatar',
  standalone: true,
  imports: [PhotoPipe],
  template: `@if (src && !failed) {
      <img [src]="src | photo" [alt]="name" loading="lazy" (error)="failed = true" />
    } @else {
      <span [attr.aria-label]="name">{{ initials }}</span>
    }`,
  host: { '[style.width.px]': 'size', '[style.height.px]': 'size' },
})
export class AvatarComponent implements OnChanges {
  @Input() src: string | null | undefined;
  @Input() name = 'Player';
  @Input() size = 38;
  failed = false;
  ngOnChanges(changes: SimpleChanges) {
    if (changes['src']) this.failed = false;
  }
  get initials() {
    return this.name
      .split(' ')
      .slice(0, 2)
      .map((s) => s[0])
      .join('');
  }
}
