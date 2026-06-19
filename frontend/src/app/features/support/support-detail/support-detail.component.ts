import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SupportService } from '../../../core/services/support.service';
import { AuthService } from '../../../core/services/auth.service';
import { SupportTicket, TicketStatus } from '../../../core/models/support.model';
import { PERMISSIONS } from '../../../core/constants/permissions';

@Component({
  selector: 'app-support-detail',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './support-detail.component.html',
})
export class SupportDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly supportService = inject(SupportService);
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);

  readonly ticket = signal<SupportTicket | null>(null);
  readonly loading = signal(true);

  readonly canUpdateStatus = this.authService.hasPermission(PERMISSIONS.SUPPORT_UPDATE);

  readonly messageForm = this.fb.nonNullable.group({
    message: ['', [Validators.required]],
  });

  private get ticketId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.supportService.getById(this.ticketId).subscribe({
      next: (res) => {
        this.ticket.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  updateStatus(status: TicketStatus): void {
    this.supportService
      .updateStatus(this.ticketId, status)
      .subscribe((res) => this.ticket.set(res.data));
  }

  sendMessage(): void {
    if (this.messageForm.invalid) return;
    const message = this.messageForm.getRawValue().message;
    this.supportService.addMessage(this.ticketId, message).subscribe((res) => {
      this.ticket.set(res.data);
      this.messageForm.reset();
    });
  }

  authorLabel(author: { name: string } | string): string {
    return typeof author === 'string' ? author : author.name;
  }
}
