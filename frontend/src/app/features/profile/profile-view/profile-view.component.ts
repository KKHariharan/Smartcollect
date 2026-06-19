import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './profile-view.component.html',
})
export class ProfileViewComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  readonly saving = signal(false);
  readonly currentUser = this.authService.currentUser;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
  });

  ngOnInit(): void {
    this.authService.getProfile().subscribe((res) => {
      this.form.patchValue({ name: res.data.name, mobile: res.data.mobile });
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.authService.updateProfile(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open('Profile updated', 'Dismiss', { duration: 3000 });
      },
      error: () => this.saving.set(false),
    });
  }
}
