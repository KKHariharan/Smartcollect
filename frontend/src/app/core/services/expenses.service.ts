import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CrudService } from './crud.service';
import { ApiResponse } from '../models/api.model';
import {
  CreateExpensePayload,
  Expense,
  ExpenseSummary,
  UpdateExpensePayload,
} from '../models/expense.model';
import { buildHttpParams } from '../utils/http-params.util';

@Injectable({ providedIn: 'root' })
export class ExpensesService extends CrudService<
  Expense,
  CreateExpensePayload,
  UpdateExpensePayload
> {
  protected readonly endpoint = '/expenses';

  getSummary(from?: string, to?: string): Observable<ApiResponse<ExpenseSummary>> {
    return this.http.get<ApiResponse<ExpenseSummary>>(`${this.baseUrl}/summary`, {
      params: buildHttpParams({ from, to }),
    });
  }
}
