import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
import { OrganizationsService } from '../../../core/services/organizations.service';
import { AuthService } from '../../../core/services/auth.service';
import { Organization } from '../../../core/models/organization.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-organization-list',
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
  templateUrl: './organization-list.component.html',
})
export class OrganizationListComponent implements OnInit {
  private readonly organizationsService = inject(OrganizationsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  readonly authService = inject(AuthService);

  readonly columns = ['name', 'code', 'status', 'actions'];
  readonly organizations = signal<Organization[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly pageSize = signal(20);
  readonly pageIndex = signal(0);

  readonly isSuperAdmin = computed(
    () => this.authService.currentUser()?.accountType === 'super_admin',
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.organizationsService
      .list({ page: this.pageIndex() + 1, limit: this.pageSize() })
      .subscribe({
        next: (res) => {
          this.organizations.set(res.data.items);
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

  remove(organization: Organization): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Delete organization',
          message: `Delete "${organization.name}"? This is blocked while it still has users.`,
          danger: true,
          confirmLabel: 'Delete',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.organizationsService.delete(organization._id).subscribe({
          next: () => this.load(),
          error: (err: { error?: { message?: string } }) => {
            this.snackBar.open(err.error?.message ?? 'Could not delete organization', 'Dismiss', {
              duration: 4000,
            });
          },
        });
      });
  }
}
