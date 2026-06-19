import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RolesService } from '../../../core/services/roles.service';
import { PERMISSIONS } from '../../../core/constants/permissions';

interface PermissionGroup {
  label: string;
  permissions: { value: string; label: string }[];
}

function buildPermissionGroups(): PermissionGroup[] {
  const groups = new Map<string, PermissionGroup>();
  for (const value of Object.values(PERMISSIONS)) {
    if (value === PERMISSIONS.WILDCARD) continue;
    const [prefix, action] = value.split(':');
    if (!groups.has(prefix)) {
      groups.set(prefix, { label: prefix, permissions: [] });
    }
    groups.get(prefix)!.permissions.push({ value, label: action });
  }
  return Array.from(groups.values());
}

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
  ],
  templateUrl: './role-form.component.html',
})
export class RoleFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly rolesService = inject(RolesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly roleId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly permissionGroups = buildPermissionGroups();
  readonly selectedPermissions = signal<Set<string>>(new Set());

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.roleId.set(id);
      this.rolesService.getById(id).subscribe((res) => {
        this.form.patchValue({ name: res.data.name, description: res.data.description });
        this.selectedPermissions.set(new Set(res.data.permissions));
      });
    }
  }

  isChecked(permission: string): boolean {
    return this.selectedPermissions().has(permission);
  }

  toggle(permission: string, checked: boolean): void {
    const next = new Set(this.selectedPermissions());
    if (checked) next.add(permission);
    else next.delete(permission);
    this.selectedPermissions.set(next);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      ...raw,
      description: raw.description || undefined,
      permissions: Array.from(this.selectedPermissions()),
    };

    this.saving.set(true);
    const id = this.roleId();
    const request = id ? this.rolesService.update(id, payload) : this.rolesService.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open(id ? 'Role updated' : 'Role created', 'Dismiss', { duration: 3000 });
        this.router.navigate(['/roles']);
      },
      error: () => this.saving.set(false),
    });
  }
}
