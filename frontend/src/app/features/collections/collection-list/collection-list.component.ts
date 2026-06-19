import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CollectionsService } from '../../../core/services/collections.service';
import { AuthService } from '../../../core/services/auth.service';
import { Collection } from '../../../core/models/collection.model';
import { PERMISSIONS } from '../../../core/constants/permissions';

@Component({
  selector: 'app-collection-list',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './collection-list.component.html',
})
export class CollectionListComponent implements OnInit {
  private readonly collectionsService = inject(CollectionsService);
  readonly authService = inject(AuthService);

  readonly columns = [
    'receiptNumber',
    'customer',
    'loan',
    'amount',
    'paymentMode',
    'collectionDate',
  ];
  readonly collections = signal<Collection[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly pageSize = signal(20);
  readonly pageIndex = signal(0);

  readonly canCreate = this.authService.hasPermission(PERMISSIONS.COLLECTIONS_CREATE);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.collectionsService.list({ page: this.pageIndex() + 1, limit: this.pageSize() }).subscribe({
      next: (res) => {
        this.collections.set(res.data.items);
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

  customerLabel(collection: Collection): string {
    return typeof collection.customer === 'string' ? collection.customer : collection.customer.name;
  }

  loanLabel(collection: Collection): string {
    return typeof collection.loan === 'string' ? collection.loan : collection.loan.loanNumber;
  }
}
