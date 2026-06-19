import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CrudService } from './crud.service';
import { ApiResponse } from '../models/api.model';
import { CreateLoanPayload, EmiInstallment, Loan, UpdateLoanPayload } from '../models/loan.model';

@Injectable({ providedIn: 'root' })
export class LoansService extends CrudService<Loan, CreateLoanPayload, UpdateLoanPayload> {
  protected readonly endpoint = '/loans';

  approve(id: string): Observable<ApiResponse<Loan>> {
    return this.http.post<ApiResponse<Loan>>(`${this.baseUrl}/${id}/approve`, {});
  }

  reject(id: string, reason: string): Observable<ApiResponse<Loan>> {
    return this.http.post<ApiResponse<Loan>>(`${this.baseUrl}/${id}/reject`, { reason });
  }

  close(id: string): Observable<ApiResponse<Loan>> {
    return this.http.post<ApiResponse<Loan>>(`${this.baseUrl}/${id}/close`, {});
  }

  getEmiSchedule(id: string): Observable<ApiResponse<EmiInstallment[]>> {
    return this.http.get<ApiResponse<EmiInstallment[]>>(`${this.baseUrl}/${id}/emi-schedule`);
  }
}
