import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UsersService } from '../../../core/services/users.service';
import { RolesService } from '../../../core/services/roles.service';
import { Role } from '../../../core/models/role.model';
import { strongPasswordValidator } from '../../../shared/validators/strong-password.validator';

@Component({
  selector: 'app-user-form',
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
  templateUrl: './user-form.component.html',
})
export class UserFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly rolesService = inject(RolesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly userId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly roles = signal<Role[]>([]);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    password: ['', [strongPasswordValidator]],
    role: ['', [Validators.required]],
    accountType: ['admin' as 'admin' | 'agent' | 'customer'],
    isActive: [true],
  });

  ngOnInit(): void {
    this.rolesService.list({ limit: 100 }).subscribe((res) => this.roles.set(res.data.items));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.userId.set(id);
      this.form.controls.password.clearValidators();
      this.form.controls.password.updateValueAndValidity();
      this.usersService.getById(id).subscribe((res) => {
        const user = res.data;
        this.form.patchValue({
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          role: typeof user.role === 'string' ? user.role : user.role._id,
          accountType: user.accountType,
          isActive: user.isActive,
        });
      });
    } else {
      this.form.controls.password.addValidators(Validators.required);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saving.set(true);
    const id = this.userId();

    const request = id
      ? this.usersService.update(id, {
          name: raw.name,
          email: raw.email,
          mobile: raw.mobile,
          role: raw.role,
          accountType: raw.accountType,
          isActive: raw.isActive,
        })
      : this.usersService.create({
          name: raw.name,
          email: raw.email,
          mobile: raw.mobile,
          password: raw.password,
          role: raw.role,
          accountType: raw.accountType,
        });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open(id ? 'User updated' : 'User created', 'Dismiss', { duration: 3000 });
        this.router.navigate(['/users']);
      },
      error: () => this.saving.set(false),
    });
  }
}
