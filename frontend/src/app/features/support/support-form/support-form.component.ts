import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupportService } from '../../../core/services/support.service';
import { CustomersService } from '../../../core/services/customers.service';
import { AuthService } from '../../../core/services/auth.service';
import { Customer } from '../../../core/models/customer.model';

/** Customer accountType users have the customer field overridden server-side;
 * this placeholder just satisfies the required-ObjectId-format validation. */
const SELF_CUSTOMER_PLACEHOLDER = '000000000000000000000000';

@Component({
  selector: 'app-support-form',
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
  templateUrl: './support-form.component.html',
})
export class SupportFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly supportService = inject(SupportService);
  private readonly customersService = inject(CustomersService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly saving = signal(false);
  readonly customers = signal<Customer[]>([]);
  readonly isCustomerPortal = this.authService.currentUser()?.accountType === 'customer';

  readonly form = this.fb.nonNullable.group({
    customer: [this.isCustomerPortal ? SELF_CUSTOMER_PLACEHOLDER : '', [Validators.required]],
    subject: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required]],
  });

  ngOnInit(): void {
    if (!this.isCustomerPortal) {
      this.customersService
        .list({ limit: 100 })
        .subscribe((res) => this.customers.set(res.data.items));
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.supportService.create(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.snackBar.open('Ticket created', 'Dismiss', { duration: 3000 });
        this.router.navigate(['/support', res.data._id]);
      },
      error: () => this.saving.set(false),
    });
  }
}
