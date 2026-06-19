import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SupportService } from '../../../core/services/support.service';
import { AuthService } from '../../../core/services/auth.service';
import { SupportTicket, TicketStatus } from '../../../core/models/support.model';
import { PERMISSIONS } from '../../../core/constants/permissions';

@Component({
  selector: 'app-support-list',
  standalone: true,
  imports: [
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './support-list.component.html',
})
export class SupportListComponent implements OnInit {
  private readonly supportService = inject(SupportService);
  readonly authService = inject(AuthService);

  readonly columns = ['ticketNumber', 'subject', 'customer', 'status', 'actions'];
  readonly tickets = signal<SupportTicket[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly pageSize = signal(20);
  readonly pageIndex = signal(0);
  readonly statusFilter = signal<TicketStatus | ''>('');

  readonly canCreate = this.authService.hasPermission(PERMISSIONS.SUPPORT_CREATE);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.supportService
      .list({
        page: this.pageIndex() + 1,
        limit: this.pageSize(),
        status: this.statusFilter() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.tickets.set(res.data.items);
          this.total.set(res.data.pagination.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onStatusChange(status: TicketStatus | ''): void {
    this.statusFilter.set(status);
    this.pageIndex.set(0);
    this.load();
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  customerLabel(ticket: SupportTicket): string {
    return typeof ticket.customer === 'string' ? ticket.customer : ticket.customer.name;
  }
}
