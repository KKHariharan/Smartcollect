import { Component, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { CustomersService } from '../../core/services/customers.service';
import { AgentsService } from '../../core/services/agents.service';
import { LoansService } from '../../core/services/loans.service';
import { CollectionsService } from '../../core/services/collections.service';
import { ExpensesService } from '../../core/services/expenses.service';
import { PERMISSIONS } from '../../core/constants/permissions';
import { ApiResponse, PaginatedResult } from '../../core/models/api.model';

interface DashboardCard {
  label: string;
  value: string;
  icon: string;
  permissions?: string[];
}

function countFrom<T>(source: Observable<ApiResponse<PaginatedResult<T>>>): Observable<number> {
  return source.pipe(
    map((res) => res.data.pagination.total),
    catchError(() => of(0)),
  );
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly customersService = inject(CustomersService);
  private readonly agentsService = inject(AgentsService);
  private readonly loansService = inject(LoansService);
  private readonly collectionsService = inject(CollectionsService);
  private readonly expensesService = inject(ExpensesService);

  readonly loading = signal(true);
  readonly cards = signal<DashboardCard[]>([]);
  readonly userName = this.authService.currentUser()?.name ?? '';

  ngOnInit(): void {
    forkJoin({
      customers: countFrom(this.customersService.list({ limit: 1 })),
      agents: countFrom(this.agentsService.list({ limit: 1 })),
      activeLoans: countFrom(this.loansService.list({ limit: 1, status: 'active' })),
      closedLoans: countFrom(this.loansService.list({ limit: 1, status: 'closed' })),
      pendingCollections: countFrom(this.collectionsService.listPending({ limit: 1 })),
      expenseTotal: this.expensesService.getSummary().pipe(
        map((res) => res.data.grandTotal),
        catchError(() => of(0)),
      ),
    }).subscribe((result) => {
      this.loading.set(false);
      const allCards: DashboardCard[] = [
        {
          label: 'Total Customers',
          value: String(result.customers),
          icon: 'groups',
          permissions: [PERMISSIONS.CUSTOMERS_READ],
        },
        {
          label: 'Collection Agents',
          value: String(result.agents),
          icon: 'badge',
          permissions: [PERMISSIONS.AGENTS_READ],
        },
        {
          label: 'Active Loans',
          value: String(result.activeLoans),
          icon: 'account_balance',
          permissions: [PERMISSIONS.LOANS_READ],
        },
        {
          label: 'Closed Loans',
          value: String(result.closedLoans),
          icon: 'task_alt',
          permissions: [PERMISSIONS.LOANS_READ],
        },
        {
          label: 'Pending Collections',
          value: String(result.pendingCollections),
          icon: 'pending_actions',
          permissions: [PERMISSIONS.COLLECTIONS_READ],
        },
        {
          label: 'Total Expenses',
          value: `₹${result.expenseTotal.toLocaleString('en-IN')}`,
          icon: 'receipt_long',
          permissions: [PERMISSIONS.EXPENSES_READ],
        },
      ];
      this.cards.set(
        allCards.filter(
          (card) => !card.permissions || this.authService.hasPermission(...card.permissions),
        ),
      );
    });
  }
}
