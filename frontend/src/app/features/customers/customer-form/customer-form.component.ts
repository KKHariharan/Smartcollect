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
import { OrganizationsService } from '../../../core/services/organizations.service';
import { AuthService } from '../../../core/services/auth.service';
import { Agent } from '../../../core/models/agent.model';
import { Organization } from '../../../core/models/organization.model';
import { strongPasswordValidator } from '../../../shared/validators/strong-password.validator';
import { passwordMatchValidator } from '../../../shared/validators/password-match.validator';

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
  private readonly organizationsService = inject(OrganizationsService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly customerId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly agents = signal<Agent[]>([]);
  readonly organizations = signal<Organization[]>([]);
  readonly isSuperAdmin = this.authService.currentUser()?.accountType === 'super_admin';

  readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      email: ['', [Validators.required, Validators.email]],
      occupation: [''],
      monthlyIncome: [null as number | null],
      assignedAgent: [''],
      address: this.fb.nonNullable.group({
        line1: [''],
        city: [''],
        state: [''],
        pincode: [''],
      }),
      password: ['', [strongPasswordValidator]],
      confirmPassword: [''],
      organizationId: [''],
    },
    { validators: [passwordMatchValidator] },
  );

  ngOnInit(): void {
    this.agentsService.list({ limit: 100 }).subscribe((res) => this.agents.set(res.data.items));
    if (this.isSuperAdmin) {
      this.organizationsService
        .list({ limit: 100 })
        .subscribe((res) => this.organizations.set(res.data.items));
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.customerId.set(id);
      this.form.controls.password.clearValidators();
      this.form.controls.password.updateValueAndValidity();
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
    } else {
      this.form.controls.password.addValidators(Validators.required);
      this.form.controls.confirmPassword.addValidators(Validators.required);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const profile = {
      name: raw.name,
      mobile: raw.mobile,
      email: raw.email,
      occupation: raw.occupation || undefined,
      monthlyIncome: raw.monthlyIncome ?? undefined,
      assignedAgent: raw.assignedAgent || undefined,
      address: raw.address,
    };

    this.saving.set(true);
    const id = this.customerId();
    const request = id
      ? this.customersService.update(id, profile)
      : this.customersService.create({
          ...profile,
          password: raw.password,
          confirmPassword: raw.confirmPassword,
          organizationId: this.isSuperAdmin ? raw.organizationId : undefined,
        });

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
