import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CrudService } from './crud.service';
import { ApiResponse } from '../models/api.model';
import {
  CreateCustomerPayload,
  Customer,
  DocumentSlot,
  UpdateCustomerPayload,
} from '../models/customer.model';

@Injectable({ providedIn: 'root' })
export class CustomersService extends CrudService<
  Customer,
  CreateCustomerPayload,
  UpdateCustomerPayload
> {
  protected readonly endpoint = '/customers';

  addNote(id: string, text: string): Observable<ApiResponse<Customer>> {
    return this.http.post<ApiResponse<Customer>>(`${this.baseUrl}/${id}/notes`, { text });
  }

  uploadDocument(id: string, slot: DocumentSlot, file: File): Observable<ApiResponse<Customer>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<Customer>>(
      `${this.baseUrl}/${id}/documents/${slot}`,
      formData,
    );
  }
}
