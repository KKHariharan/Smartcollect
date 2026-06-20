import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { UsersService } from '../../../core/services/users.service';
import { RolesService } from '../../../core/services/roles.service';
import { OrganizationsService } from '../../../core/services/organizations.service';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';
import { Role } from '../../../core/models/role.model';
import { Organization } from '../../../core/models/organization.model';
import { PERMISSIONS } from '../../../core/constants/permissions';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './user-list.component.html',
})
export class UserListComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly rolesService = inject(RolesService);
  private readonly organizationsService = inject(OrganizationsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  readonly authService = inject(AuthService);

  readonly columns = [
    'name',
    'email',
    'mobile',
    'accountType',
    'role',
    'organization',
    'createdBy',
    'isActive',
    'createdAt',
    'actions',
  ];
  readonly users = signal<User[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly pageSize = signal(20);
  readonly pageIndex = signal(0);
  readonly roleFilter = signal<string>('');
  readonly organizationFilter = signal<string>('');
  readonly roles = signal<Role[]>([]);
  readonly organizations = signal<Organization[]>([]);

  readonly canCreate = this.authService.hasPermission(PERMISSIONS.USERS_CREATE);
  readonly canUpdate = this.authService.hasPermission(PERMISSIONS.USERS_UPDATE);
  readonly canDelete = this.authService.hasPermission(PERMISSIONS.USERS_DELETE);
  readonly isSuperAdmin = computed(
    () => this.authService.currentUser()?.accountType === 'super_admin',
  );

  ngOnInit(): void {
    this.rolesService.list({ limit: 100 }).subscribe((res) => this.roles.set(res.data.items));
    if (this.isSuperAdmin()) {
      this.organizationsService
        .list({ limit: 100 })
        .subscribe((res) => this.organizations.set(res.data.items));
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.usersService
      .list({
        page: this.pageIndex() + 1,
        limit: this.pageSize(),
        role: this.roleFilter() || undefined,
        organizationId: this.organizationFilter() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.users.set(res.data.items);
          this.total.set(res.data.pagination.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onRoleFilterChange(value: string): void {
    this.roleFilter.set(value);
    this.pageIndex.set(0);
    this.load();
  }

  onOrganizationFilterChange(value: string): void {
    this.organizationFilter.set(value);
    this.pageIndex.set(0);
    this.load();
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  roleLabel(user: User): string {
    return typeof user.role === 'string' ? user.role : user.role.name;
  }

  organizationLabel(user: User): string {
    const organization = user.organizationId;
    if (!organization) return '—';
    return typeof organization === 'string' ? organization : organization.name;
  }

  createdByLabel(user: User): string {
    const createdBy = user.createdBy;
    if (!createdBy || typeof createdBy === 'string') return '—';
    const roleName = typeof createdBy.role === 'string' ? createdBy.role : createdBy.role.name;
    return `${createdBy.name} (${roleName})`;
  }

  remove(user: User): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Delete user',
          message: `Delete the account for ${user.name}?`,
          danger: true,
          confirmLabel: 'Delete',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.usersService.delete(user._id).subscribe({
          next: () => this.load(),
          error: (err: { error?: { message?: string } }) => {
            this.snackBar.open(err.error?.message ?? 'Could not delete user', 'Dismiss', {
              duration: 4000,
            });
          },
        });
      });
  }
}
