import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoansService } from '../../../core/services/loans.service';
import { AuthService } from '../../../core/services/auth.service';
import { Loan, LoanStatus } from '../../../core/models/loan.model';
import { PERMISSIONS } from '../../../core/constants/permissions';

@Component({
  selector: 'app-loan-list',
  standalone: true,
  imports: [
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './loan-list.component.html',
})
export class LoanListComponent implements OnInit {
  private readonly loansService = inject(LoansService);
  readonly authService = inject(AuthService);

  readonly columns = [
    'loanNumber',
    'customer',
    'principalAmount',
    'totalPayable',
    'status',
    'actions',
  ];
  readonly loans = signal<Loan[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly pageSize = signal(20);
  readonly pageIndex = signal(0);
  readonly statusFilter = signal<LoanStatus | ''>('');

  readonly canCreate = this.authService.hasPermission(PERMISSIONS.LOANS_CREATE);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loansService
      .list({
        page: this.pageIndex() + 1,
        limit: this.pageSize(),
        status: this.statusFilter() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.loans.set(res.data.items);
          this.total.set(res.data.pagination.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onStatusChange(status: LoanStatus | ''): void {
    this.statusFilter.set(status);
    this.pageIndex.set(0);
    this.load();
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  customerLabel(loan: Loan): string {
    return typeof loan.customer === 'string' ? loan.customer : loan.customer.name;
  }
}
