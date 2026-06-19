import { Component, OnInit, inject, signal } from '@angular/core';
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
import { RolesService } from '../../../core/services/roles.service';
import { AuthService } from '../../../core/services/auth.service';
import { Role } from '../../../core/models/role.model';
import { PERMISSIONS } from '../../../core/constants/permissions';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './role-list.component.html',
})
export class RoleListComponent implements OnInit {
  private readonly rolesService = inject(RolesService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  readonly authService = inject(AuthService);

  readonly columns = ['name', 'description', 'permissions', 'isSystem', 'actions'];
  readonly roles = signal<Role[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly pageSize = signal(20);
  readonly pageIndex = signal(0);

  readonly canCreate = this.authService.hasPermission(PERMISSIONS.ROLES_CREATE);
  readonly canUpdate = this.authService.hasPermission(PERMISSIONS.ROLES_UPDATE);
  readonly canDelete = this.authService.hasPermission(PERMISSIONS.ROLES_DELETE);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.rolesService.list({ page: this.pageIndex() + 1, limit: this.pageSize() }).subscribe({
      next: (res) => {
        this.roles.set(res.data.items);
        this.total.set(res.data.pagination.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  remove(role: Role): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Delete role',
          message: `Delete the role "${role.name}"?`,
          danger: true,
          confirmLabel: 'Delete',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.rolesService.delete(role._id).subscribe({
          next: () => this.load(),
          error: (err: { error?: { message?: string } }) => {
            this.snackBar.open(err.error?.message ?? 'Could not delete role', 'Dismiss', {
              duration: 4000,
            });
          },
        });
      });
  }
}
