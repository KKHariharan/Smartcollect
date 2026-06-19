import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoansService } from '../../../core/services/loans.service';
import { CustomersService } from '../../../core/services/customers.service';
import { Customer } from '../../../core/models/customer.model';

@Component({
  selector: 'app-loan-form',
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
  templateUrl: './loan-form.component.html',
})
export class LoanFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly loansService = inject(LoansService);
  private readonly customersService = inject(CustomersService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly saving = signal(false);
  readonly customers = signal<Customer[]>([]);

  readonly form = this.fb.nonNullable.group({
    customer: ['', [Validators.required]],
    principalAmount: [0, [Validators.required, Validators.min(1)]],
    interestRate: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    totalInstallments: [12, [Validators.required, Validators.min(1)]],
    emiType: ['monthly' as 'daily' | 'weekly' | 'monthly'],
    processingFee: [0],
    penaltyChargePerDay: [0],
  });

  ngOnInit(): void {
    this.customersService
      .list({ limit: 100 })
      .subscribe((res) => this.customers.set(res.data.items));

    const customerId = this.route.snapshot.queryParamMap.get('customer');
    if (customerId) {
      this.form.patchValue({ customer: customerId });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.loansService.create(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.snackBar.open('Loan created and pending approval', 'Dismiss', { duration: 3000 });
        this.router.navigate(['/loans', res.data._id]);
      },
      error: () => this.saving.set(false),
    });
  }
}
