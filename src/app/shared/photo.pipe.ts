import { Pipe, PipeTransform } from '@angular/core';
import { localPhotoIds } from './photo-manifest';
@Pipe({ name: 'photo', standalone: true })
export class PhotoPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    const id = value.match(/^https:\/\/images\.unsplash\.com\/(photo-\d+-[a-z0-9]+)/)?.[1];
    return id && localPhotoIds.has(id) ? '/images/' + id + '.jpg' : value;
  }
}
