import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CustomersService } from '../../../core/services/customers.service';
import { AgentsService } from '../../../core/services/agents.service';
import { Agent } from '../../../core/models/agent.model';

@Component({
  selector: 'app-customer-form',
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
  templateUrl: './customer-form.component.html',
})
export class CustomerFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly customersService = inject(CustomersService);
  private readonly agentsService = inject(AgentsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly customerId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly agents = signal<Agent[]>([]);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    email: [''],
    occupation: [''],
    monthlyIncome: [null as number | null],
    assignedAgent: [''],
    address: this.fb.nonNullable.group({
      line1: [''],
      city: [''],
      state: [''],
      pincode: [''],
    }),
  });

  ngOnInit(): void {
    this.agentsService.list({ limit: 100 }).subscribe((res) => this.agents.set(res.data.items));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.customerId.set(id);
      this.customersService.getById(id).subscribe((res) => {
        const customer = res.data;
        this.form.patchValue({
          name: customer.name,
          mobile: customer.mobile,
          email: customer.email,
          occupation: customer.occupation,
          monthlyIncome: customer.monthlyIncome ?? null,
          assignedAgent:
            typeof customer.assignedAgent === 'string'
              ? customer.assignedAgent
              : (customer.assignedAgent?._id ?? ''),
          address: customer.address,
        });
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      ...raw,
      monthlyIncome: raw.monthlyIncome ?? undefined,
      assignedAgent: raw.assignedAgent || undefined,
      email: raw.email || undefined,
    };

    this.saving.set(true);
    const id = this.customerId();
    const request = id
      ? this.customersService.update(id, payload)
      : this.customersService.create(payload);

    request.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.snackBar.open(id ? 'Customer updated' : 'Customer created', 'Dismiss', {
          duration: 3000,
        });
        this.router.navigate(['/customers', res.data._id]);
      },
      error: () => this.saving.set(false),
    });
  }
}
