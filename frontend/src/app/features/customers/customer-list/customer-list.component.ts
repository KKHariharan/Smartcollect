import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CustomersService } from '../../../core/services/customers.service';
import { AuthService } from '../../../core/services/auth.service';
import { Customer } from '../../../core/models/customer.model';
import { PERMISSIONS } from '../../../core/constants/permissions';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.scss',
})
export class CustomerListComponent implements OnInit {
  private readonly customersService = inject(CustomersService);
  readonly authService = inject(AuthService);

  readonly columns = ['customerCode', 'name', 'mobile', 'assignedAgent', 'isActive', 'actions'];
  readonly customers = signal<Customer[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly pageSize = signal(20);
  readonly pageIndex = signal(0);
  readonly search = signal('');

  readonly canCreate = this.authService.hasPermission(PERMISSIONS.CUSTOMERS_CREATE);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.customersService
      .list({
        page: this.pageIndex() + 1,
        limit: this.pageSize(),
        search: this.search() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.customers.set(res.data.items);
          this.total.set(res.data.pagination.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onSearch(value: string): void {
    this.search.set(value);
    this.pageIndex.set(0);
    this.load();
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  agentLabel(customer: Customer): string {
    const agent = customer.assignedAgent;
    if (!agent) return 'Unassigned';
    return typeof agent === 'string' ? agent : agent.name;
  }
}
