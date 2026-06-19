import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CrudService } from './crud.service';
import { ApiResponse } from '../models/api.model';
import {
  Agent,
  AgentPerformance,
  CreateAgentPayload,
  UpdateAgentPayload,
} from '../models/agent.model';
import { Customer } from '../models/customer.model';
import { buildHttpParams } from '../utils/http-params.util';

@Injectable({ providedIn: 'root' })
export class AgentsService extends CrudService<Agent, CreateAgentPayload, UpdateAgentPayload> {
  protected readonly endpoint = '/agents';

  getCustomers(id: string): Observable<ApiResponse<Customer[]>> {
    return this.http.get<ApiResponse<Customer[]>>(`${this.baseUrl}/${id}/customers`);
  }

  assignCustomers(
    id: string,
    customerIds: string[],
  ): Observable<ApiResponse<{ matched: number; modified: number }>> {
    return this.http.post<ApiResponse<{ matched: number; modified: number }>>(
      `${this.baseUrl}/${id}/assign-customers`,
      { customerIds },
    );
  }

  unassignCustomers(
    id: string,
    customerIds: string[],
  ): Observable<ApiResponse<{ matched: number; modified: number }>> {
    return this.http.post<ApiResponse<{ matched: number; modified: number }>>(
      `${this.baseUrl}/${id}/unassign-customers`,
      { customerIds },
    );
  }

  getPerformance(
    id: string,
    from?: string,
    to?: string,
  ): Observable<ApiResponse<AgentPerformance>> {
    return this.http.get<ApiResponse<AgentPerformance>>(`${this.baseUrl}/${id}/performance`, {
      params: buildHttpParams({ from, to }),
    });
  }
}
