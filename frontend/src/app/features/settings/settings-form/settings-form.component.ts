import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { SettingsService } from '../../../core/services/settings.service';
import { PERMISSIONS } from '../../../core/constants/permissions';

@Component({
  selector: 'app-settings-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './settings-form.component.html',
})
export class SettingsFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly authService = inject(AuthService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly canUpdate = this.authService.hasPermission(PERMISSIONS.SETTINGS_UPDATE);

  readonly form = this.fb.nonNullable.group({
    company: this.fb.nonNullable.group({
      name: ['', [Validators.required]],
      address: [''],
      phone: [''],
      email: [''],
    }),
    interest: this.fb.nonNullable.group({
      defaultInterestRate: [0],
      defaultPenaltyChargePerDay: [0],
    }),
    receipt: this.fb.nonNullable.group({
      prefix: ['RCPT'],
      footerNote: [''],
    }),
  });

  ngOnInit(): void {
    this.settingsService.get().subscribe((res) => {
      this.form.patchValue(res.data);
      this.loading.set(false);
      if (!this.canUpdate) this.form.disable();
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.settingsService.update(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open('Settings saved', 'Dismiss', { duration: 3000 });
      },
      error: () => this.saving.set(false),
    });
  }
}
