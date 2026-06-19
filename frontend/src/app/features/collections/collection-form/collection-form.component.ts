import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CollectionsService } from '../../../core/services/collections.service';
import { CustomersService } from '../../../core/services/customers.service';
import { LoansService } from '../../../core/services/loans.service';
import { Customer } from '../../../core/models/customer.model';
import { Loan } from '../../../core/models/loan.model';

@Component({
  selector: 'app-collection-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './collection-form.component.html',
})
export class CollectionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly collectionsService = inject(CollectionsService);
  private readonly customersService = inject(CustomersService);
  private readonly loansService = inject(LoansService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly saving = signal(false);
  readonly customers = signal<Customer[]>([]);
  readonly loans = signal<Loan[]>([]);

  readonly form = this.fb.nonNullable.group({
    customer: ['', [Validators.required]],
    loan: ['', [Validators.required]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    paymentMode: ['cash' as 'cash' | 'upi' | 'bank_transfer' | 'card'],
    notes: [''],
  });

  ngOnInit(): void {
    this.customersService
      .list({ limit: 100 })
      .subscribe((res) => this.customers.set(res.data.items));

    const customerId = this.route.snapshot.queryParamMap.get('customer');
    if (customerId) {
      this.form.patchValue({ customer: customerId });
      this.loadLoansForCustomer(customerId);
    }

    this.form.controls.customer.valueChanges.subscribe((customerId) => {
      this.form.patchValue({ loan: '' });
      if (customerId) this.loadLoansForCustomer(customerId);
    });
  }

  private loadLoansForCustomer(customerId: string): void {
    this.loansService
      .list({ customer: customerId, status: 'active', limit: 50 })
      .subscribe((res) => {
        this.loans.set(res.data.items);
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saving.set(true);
    this.collectionsService.create({ ...raw, notes: raw.notes || undefined }).subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open('Payment recorded', 'Dismiss', { duration: 3000 });
        this.router.navigate(['/collections']);
      },
      error: () => this.saving.set(false),
    });
  }
}
