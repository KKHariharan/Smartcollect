import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CollectionsService } from '../../../core/services/collections.service';
import { PendingInstallment } from '../../../core/models/collection.model';

@Component({
  selector: 'app-collection-pending',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './collection-pending.component.html',
})
export class CollectionPendingComponent implements OnInit {
  private readonly collectionsService = inject(CollectionsService);

  readonly columns = [
    'customer',
    'loan',
    'installmentNumber',
    'dueDate',
    'amountDue',
    'status',
    'actions',
  ];
  readonly items = signal<PendingInstallment[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly pageSize = signal(20);
  readonly pageIndex = signal(0);
  readonly overdueOnly = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.collectionsService
      .listPending({
        page: this.pageIndex() + 1,
        limit: this.pageSize(),
        overdueOnly: this.overdueOnly(),
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.data.items);
          this.total.set(res.data.pagination.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  toggleOverdue(value: boolean): void {
    this.overdueOnly.set(value);
    this.pageIndex.set(0);
    this.load();
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.load();
  }
}
