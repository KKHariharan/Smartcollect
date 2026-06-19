import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExpensesService } from '../../../core/services/expenses.service';

@Component({
  selector: 'app-expense-form',
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
  templateUrl: './expense-form.component.html',
})
export class ExpenseFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly expensesService = inject(ExpensesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly expenseId = signal<string | null>(null);
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    category: [
      'miscellaneous' as 'salary' | 'rent' | 'fuel' | 'internet' | 'utilities' | 'miscellaneous',
    ],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    description: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.expenseId.set(id);
      this.expensesService.getById(id).subscribe((res) => {
        this.form.patchValue({
          category: res.data.category,
          amount: res.data.amount,
          description: res.data.description,
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
    const payload = { ...raw, description: raw.description || undefined };

    this.saving.set(true);
    const id = this.expenseId();
    const request = id
      ? this.expensesService.update(id, payload)
      : this.expensesService.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open(id ? 'Expense updated' : 'Expense created', 'Dismiss', {
          duration: 3000,
        });
        this.router.navigate(['/expenses']);
      },
      error: () => this.saving.set(false),
    });
  }
}
