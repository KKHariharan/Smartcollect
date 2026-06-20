import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrganizationsService } from '../../../core/services/organizations.service';

@Component({
  selector: 'app-organization-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './organization-form.component.html',
})
export class OrganizationFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly organizationsService = inject(OrganizationsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly organizationId = signal<string | null>(null);
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    status: ['active' as 'active' | 'inactive'],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.organizationId.set(id);
      this.organizationsService.getById(id).subscribe((res) => {
        this.form.patchValue({ name: res.data.name, status: res.data.status });
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saving.set(true);
    const id = this.organizationId();
    const request = id
      ? this.organizationsService.update(id, raw)
      : this.organizationsService.create(raw);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open(id ? 'Organization updated' : 'Organization created', 'Dismiss', {
          duration: 3000,
        });
        this.router.navigate(['/organizations']);
      },
      error: () => this.saving.set(false),
    });
  }
}
