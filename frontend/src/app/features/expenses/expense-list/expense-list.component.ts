import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ExpensesService } from '../../../core/services/expenses.service';
import { AuthService } from '../../../core/services/auth.service';
import { Expense, ExpenseSummary } from '../../../core/models/expense.model';
import { PERMISSIONS } from '../../../core/constants/permissions';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-expense-list',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatCardModule,
    MatDialogModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './expense-list.component.html',
})
export class ExpenseListComponent implements OnInit {
  private readonly expensesService = inject(ExpensesService);
  private readonly dialog = inject(MatDialog);
  readonly authService = inject(AuthService);

  readonly columns = ['date', 'category', 'amount', 'description', 'actions'];
  readonly expenses = signal<Expense[]>([]);
  readonly summary = signal<ExpenseSummary | null>(null);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly pageSize = signal(20);
  readonly pageIndex = signal(0);

  readonly canCreate = this.authService.hasPermission(PERMISSIONS.EXPENSES_CREATE);
  readonly canUpdate = this.authService.hasPermission(PERMISSIONS.EXPENSES_UPDATE);
  readonly canDelete = this.authService.hasPermission(PERMISSIONS.EXPENSES_DELETE);

  ngOnInit(): void {
    this.expensesService.getSummary().subscribe((res) => this.summary.set(res.data));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.expensesService.list({ page: this.pageIndex() + 1, limit: this.pageSize() }).subscribe({
      next: (res) => {
        this.expenses.set(res.data.items);
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

  remove(expense: Expense): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Delete expense',
          message: `Delete this ${expense.category} expense of ₹${expense.amount}?`,
          danger: true,
          confirmLabel: 'Delete',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.expensesService.delete(expense._id).subscribe(() => this.load());
      });
  }
}
