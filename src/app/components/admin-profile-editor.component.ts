import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Person } from '../models';
import { ApiService } from '../services/api.service';
import { UiService } from '../services/ui.service';
import { IconComponent } from '../shared/icon.component';
import { AvatarComponent } from './avatar.component';
import { DialogComponent } from './dialog.component';

@Component({
  selector: 'g-admin-profile-editor',
  standalone: true,
  imports: [FormsModule, IconComponent, AvatarComponent, DialogComponent],
  template: `<g-dialog
    [open]="open"
    title="Edit admin profile"
    [dismissible]="!busy()"
    (closed)="close()"
  >
    @if (model; as m) {
      <form #form="ngForm" (ngSubmit)="form.valid && !photoError() && save()">
        <fieldset [disabled]="busy()" class="admin-profile-fields">
          <div class="profile-photo-editor">
            <label for="admin-profile-photo">Profile photo</label>
            <div class="photo-editor-row">
              <g-avatar [src]="photoPreview() || m.avatar_url" [name]="m.full_name" [size]="72" />
              <div class="photo-editor-controls">
                <input
                  #photoInput
                  id="admin-profile-photo"
                  class="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  (change)="selectPhoto($event)"
                  aria-describedby="admin-photo-help"
                />
                <div class="photo-editor-actions">
                  <button type="button" class="button secondary small" (click)="photoInput.click()">
                    <g-icon name="image-outline" />{{
                      selectedPhoto ? 'Change photo' : 'Upload photo'
                    }}
                  </button>
                  @if (selectedPhoto || m.avatar_url || photoError()) {
                    <button
                      type="button"
                      class="text-button"
                      (click)="removePhoto(); photoInput.value = ''"
                    >
                      Remove photo
                    </button>
                  }
                </div>
                <p id="admin-photo-help" class="photo-help">
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
          <label
            >Full name<input required name="full_name" [(ngModel)]="m.full_name" maxlength="80"
          /></label>
          <label
            >Bio<textarea name="bio" [(ngModel)]="m.bio" maxlength="500" rows="3"></textarea>
          </label>
          <label
            >Location <span class="muted">(optional)</span
            ><input name="location" [(ngModel)]="m.location" maxlength="120"
          /></label>
        </fieldset>
        @if (error()) {
          <p class="form-error" role="alert">{{ error() }}</p>
        }
        <div class="form-actions">
          <button type="button" class="button secondary" [disabled]="busy()" (click)="close()">
            Cancel
          </button>
          <button
            class="button primary"
            [disabled]="busy() || !form.valid || !m.full_name.trim() || !!photoError()"
          >
            {{ busy() ? (selectedPhoto ? 'Uploading photo…' : 'Saving…') : 'Save profile' }}
          </button>
        </div>
      </form>
    }
  </g-dialog>`,
})
export class AdminProfileEditorComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  api = inject(ApiService);
  ui = inject(UiService);
  model: Person | null = null;
  busy = signal(false);
  error = signal('');
  photoPreview = signal<string | null>(null);
  photoName = signal('');
  photoError = signal('');
  selectedPhoto: File | null = null;

  ngOnChanges() {
    if (!this.busy()) this.resetPhoto();
    if (this.open) {
      this.model = structuredClone(this.api.user());
      this.error.set('');
    }
  }
  close() {
    if (this.busy()) return;
    this.resetPhoto();
    this.closed.emit();
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
    if (this.model) this.model.avatar_url = '';
  }
  private resetPhoto() {
    const preview = this.photoPreview();
    if (preview) URL.revokeObjectURL(preview);
    this.photoPreview.set(null);
    this.photoName.set('');
    this.photoError.set('');
    this.selectedPhoto = null;
  }
  async save() {
    if (this.busy() || this.photoError() || !this.model?.full_name.trim()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      let body: Person | FormData = this.model;
      if (this.selectedPhoto) {
        const upload = new FormData();
        upload.append('profile', JSON.stringify(this.model));
        upload.append('photo', this.selectedPhoto, this.selectedPhoto.name);
        body = upload;
      }
      const saved = await this.api.put<Person>('/users/' + this.api.user()!.id, body);
      this.api.user.set(saved);
      this.resetPhoto();
      this.busy.set(false);
      this.closed.emit();
      await this.ui.toast('Admin profile updated.');
    } catch (error) {
      this.error.set((error as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
  ngOnDestroy() {
    this.resetPhoto();
  }
}
