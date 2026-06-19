import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AgentsService } from '../../../core/services/agents.service';

@Component({
  selector: 'app-agent-form',
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
  templateUrl: './agent-form.component.html',
})
export class AgentFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly agentsService = inject(AgentsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly agentId = signal<string | null>(null);
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    email: [''],
    area: [''],
    status: ['active' as 'active' | 'inactive'],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.agentId.set(id);
      this.agentsService.getById(id).subscribe((res) => {
        const agent = res.data;
        this.form.patchValue({
          name: agent.name,
          mobile: agent.mobile,
          email: agent.email,
          area: agent.area,
          status: agent.status,
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
    const payload = { ...raw, email: raw.email || undefined, area: raw.area || undefined };

    this.saving.set(true);
    const id = this.agentId();
    const request = id
      ? this.agentsService.update(id, payload)
      : this.agentsService.create(payload);

    request.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.snackBar.open(id ? 'Agent updated' : 'Agent created', 'Dismiss', { duration: 3000 });
        this.router.navigate(['/agents', res.data._id]);
      },
      error: () => this.saving.set(false),
    });
  }
}
