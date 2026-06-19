import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResult } from '../models/api.model';
import { buildHttpParams } from '../utils/http-params.util';

export abstract class CrudService<T, CreateDto = Partial<T>, UpdateDto = Partial<T>> {
  protected abstract readonly endpoint: string;
  protected readonly http = inject(HttpClient);

  protected get baseUrl(): string {
    return `${environment.apiUrl}${this.endpoint}`;
  }

  list(params: Record<string, unknown> = {}): Observable<ApiResponse<PaginatedResult<T>>> {
    return this.http.get<ApiResponse<PaginatedResult<T>>>(this.baseUrl, {
      params: buildHttpParams(params),
    });
  }

  getById(id: string): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}/${id}`);
  }

  create(dto: CreateDto): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(this.baseUrl, dto);
  }

  update(id: string, dto: UpdateDto): Observable<ApiResponse<T>> {
    return this.http.patch<ApiResponse<T>>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }
}
