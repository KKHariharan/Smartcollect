import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoansService } from '../../../core/services/loans.service';
import { AuthService } from '../../../core/services/auth.service';
import { Loan, EmiInstallment } from '../../../core/models/loan.model';
import { PERMISSIONS } from '../../../core/constants/permissions';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-loan-detail',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTableModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './loan-detail.component.html',
})
export class LoanDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly loansService = inject(LoansService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  readonly authService = inject(AuthService);

  readonly loan = signal<Loan | null>(null);
  readonly schedule = signal<EmiInstallment[]>([]);
  readonly loading = signal(true);
  readonly scheduleColumns = ['installmentNumber', 'dueDate', 'amountDue', 'amountPaid', 'status'];

  readonly canApprove = this.authService.hasPermission(PERMISSIONS.LOANS_APPROVE);
  readonly canUpdate = this.authService.hasPermission(PERMISSIONS.LOANS_UPDATE);

  private get loanId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loansService.getById(this.loanId).subscribe({
      next: (res) => {
        this.loan.set(res.data);
        this.loading.set(false);
        if (res.data.status !== 'pending' && res.data.status !== 'rejected') {
          this.loansService.getEmiSchedule(this.loanId).subscribe((schedule) => {
            this.schedule.set(schedule.data);
          });
        }
      },
      error: () => this.loading.set(false),
    });
  }

  approve(): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Approve loan',
          message: 'This will generate the EMI schedule and activate the loan.',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.loansService.approve(this.loanId).subscribe(() => {
          this.snackBar.open('Loan approved', 'Dismiss', { duration: 3000 });
          this.load();
        });
      });
  }

  reject(reason: string): void {
    if (!reason.trim()) return;
    this.loansService.reject(this.loanId, reason).subscribe(() => {
      this.snackBar.open('Loan rejected', 'Dismiss', { duration: 3000 });
      this.load();
    });
  }

  close(): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: { title: 'Close loan', message: 'Manually mark this loan as closed?' },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.loansService.close(this.loanId).subscribe(() => {
          this.snackBar.open('Loan closed', 'Dismiss', { duration: 3000 });
          this.load();
        });
      });
  }

  customerLabel(loan: Loan): string {
    return typeof loan.customer === 'string'
      ? loan.customer
      : `${loan.customer.name} (${loan.customer.customerCode})`;
  }
}
