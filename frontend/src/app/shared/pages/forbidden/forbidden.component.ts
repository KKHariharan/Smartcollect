import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="sc-status-page">
      <mat-icon class="sc-status-page__icon">block</mat-icon>
      <h1>Access denied</h1>
      <p>You don't have permission to view this page.</p>
      <a mat-flat-button color="primary" routerLink="/dashboard">Back to dashboard</a>
    </div>
  `,
  styleUrl: '../status-page.scss',
})
export class ForbiddenComponent {}
