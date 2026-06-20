import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AgentsService } from '../../../core/services/agents.service';
import { CustomersService } from '../../../core/services/customers.service';
import { AuthService } from '../../../core/services/auth.service';
import { Agent, AgentPerformance } from '../../../core/models/agent.model';
import { Customer } from '../../../core/models/customer.model';
import { PERMISSIONS } from '../../../core/constants/permissions';

@Component({
  selector: 'app-agent-detail',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './agent-detail.component.html',
})
export class AgentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly agentsService = inject(AgentsService);
  private readonly customersService = inject(CustomersService);
  private readonly snackBar = inject(MatSnackBar);
  readonly authService = inject(AuthService);

  readonly agent = signal<Agent | null>(null);
  readonly performance = signal<AgentPerformance | null>(null);
  readonly assignedCustomers = signal<Customer[]>([]);
  readonly unassignedCustomers = signal<Customer[]>([]);
  readonly selectedToAssign = signal<string | null>(null);
  readonly loading = signal(true);

  readonly canUpdate = this.authService.hasPermission(PERMISSIONS.AGENTS_UPDATE);

  readonly assignableOptions = computed(() => this.unassignedCustomers());

  private get agentId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.agentsService.getById(this.agentId).subscribe((res) => this.agent.set(res.data));
    this.agentsService
      .getPerformance(this.agentId)
      .subscribe((res) => this.performance.set(res.data));
    this.refreshCustomers();
  }

  private refreshCustomers(): void {
    this.agentsService.getCustomers(this.agentId).subscribe((res) => {
      this.assignedCustomers.set(res.data);
      const assignedIds = new Set(res.data.map((c) => c._id));
      this.customersService.list({ limit: 100 }).subscribe((all) => {
        this.unassignedCustomers.set(all.data.items.filter((c) => !assignedIds.has(c._id)));
        this.loading.set(false);
      });
    });
  }

  assign(): void {
    const customerId = this.selectedToAssign();
    if (!customerId) return;
    this.agentsService.assignCustomers(this.agentId, [customerId]).subscribe(() => {
      this.selectedToAssign.set(null);
      this.snackBar.open('Customer assigned', 'Dismiss', { duration: 3000 });
      this.refreshCustomers();
    });
  }

  unassign(customerId: string): void {
    this.agentsService.unassignCustomers(this.agentId, [customerId]).subscribe(() => {
      this.snackBar.open('Customer unassigned', 'Dismiss', { duration: 3000 });
      this.refreshCustomers();
    });
  }

  createdByLabel(agent: Agent): string {
    const createdBy = agent.createdBy;
    if (!createdBy || typeof createdBy === 'string') return '—';
    const roleName = typeof createdBy.role === 'string' ? createdBy.role : createdBy.role.name;
    return `${createdBy.name} (${roleName})`;
  }
}
