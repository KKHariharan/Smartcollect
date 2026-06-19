import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CustomersService } from '../../../core/services/customers.service';
import { AuthService } from '../../../core/services/auth.service';
import { Customer, CustomerDocumentFile, DocumentSlot } from '../../../core/models/customer.model';
import { PERMISSIONS } from '../../../core/constants/permissions';

type SingleDocumentSlot = Exclude<DocumentSlot, 'other'>;

const DOCUMENT_SLOTS: { slot: SingleDocumentSlot; label: string }[] = [
  { slot: 'photo', label: 'Photo' },
  { slot: 'aadhaarCopy', label: 'Aadhaar Copy' },
  { slot: 'panCopy', label: 'PAN Copy' },
];

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './customer-detail.component.html',
})
export class CustomerDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly customersService = inject(CustomersService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);

  readonly documentSlots = DOCUMENT_SLOTS;
  readonly customer = signal<Customer | null>(null);
  readonly loading = signal(true);
  readonly uploadingSlot = signal<DocumentSlot | null>(null);

  readonly canUpdate = this.authService.hasPermission(PERMISSIONS.CUSTOMERS_UPDATE);
  readonly canAddNote = this.authService.hasPermission(
    PERMISSIONS.CUSTOMERS_NOTES,
    PERMISSIONS.CUSTOMERS_UPDATE,
  );

  readonly noteForm = this.fb.nonNullable.group({
    text: ['', [Validators.required, Validators.minLength(1)]],
  });

  private get customerId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.customersService.getById(this.customerId).subscribe({
      next: (res) => {
        this.customer.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  addNote(): void {
    if (this.noteForm.invalid) return;
    const text = this.noteForm.getRawValue().text;
    this.customersService.addNote(this.customerId, text).subscribe((res) => {
      this.customer.set(res.data);
      this.noteForm.reset();
    });
  }

  onFileSelected(slot: DocumentSlot, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingSlot.set(slot);
    this.customersService.uploadDocument(this.customerId, slot, file).subscribe({
      next: (res) => {
        this.customer.set(res.data);
        this.uploadingSlot.set(null);
        this.snackBar.open('Document uploaded', 'Dismiss', { duration: 3000 });
      },
      error: () => this.uploadingSlot.set(null),
    });
    input.value = '';
  }

  agentLabel(customer: Customer): string {
    const agent = customer.assignedAgent;
    if (!agent) return 'Unassigned';
    return typeof agent === 'string' ? agent : `${agent.name} (${agent.agentCode})`;
  }

  getDocument(customer: Customer, slot: SingleDocumentSlot): CustomerDocumentFile | undefined {
    return customer.documents[slot];
  }
}
