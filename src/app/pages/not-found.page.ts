import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '../components/states.component';
@Component({
  standalone: true,
  imports: [RouterLink, EmptyStateComponent],
  template:
    '<g-empty title="Out of bounds" description="This page isn’t on the playbook."/><a class="button primary" routerLink="/tabs/home">Back to home</a>',
})
export class NotFoundPage {}
