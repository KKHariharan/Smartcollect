import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResult } from '../models/api.model';
import { CreateTicketPayload, SupportTicket, TicketStatus } from '../models/support.model';
import { buildHttpParams } from '../utils/http-params.util';

@Injectable({ providedIn: 'root' })
export class SupportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/support-tickets`;

  list(
    params: Record<string, unknown> = {},
  ): Observable<ApiResponse<PaginatedResult<SupportTicket>>> {
    return this.http.get<ApiResponse<PaginatedResult<SupportTicket>>>(this.baseUrl, {
      params: buildHttpParams(params),
    });
  }

  getById(id: string): Observable<ApiResponse<SupportTicket>> {
    return this.http.get<ApiResponse<SupportTicket>>(`${this.baseUrl}/${id}`);
  }

  create(dto: CreateTicketPayload): Observable<ApiResponse<SupportTicket>> {
    return this.http.post<ApiResponse<SupportTicket>>(this.baseUrl, dto);
  }

  updateStatus(id: string, status: TicketStatus): Observable<ApiResponse<SupportTicket>> {
    return this.http.patch<ApiResponse<SupportTicket>>(`${this.baseUrl}/${id}/status`, { status });
  }

  addMessage(id: string, message: string): Observable<ApiResponse<SupportTicket>> {
    return this.http.post<ApiResponse<SupportTicket>>(`${this.baseUrl}/${id}/messages`, {
      message,
    });
  }
}
