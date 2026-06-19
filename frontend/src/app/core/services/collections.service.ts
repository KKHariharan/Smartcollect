import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResult } from '../models/api.model';
import {
  Collection,
  CreateCollectionPayload,
  PendingInstallment,
} from '../models/collection.model';
import { buildHttpParams } from '../utils/http-params.util';

@Injectable({ providedIn: 'root' })
export class CollectionsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/collections`;

  list(params: Record<string, unknown> = {}): Observable<ApiResponse<PaginatedResult<Collection>>> {
    return this.http.get<ApiResponse<PaginatedResult<Collection>>>(this.baseUrl, {
      params: buildHttpParams(params),
    });
  }

  getById(id: string): Observable<ApiResponse<Collection>> {
    return this.http.get<ApiResponse<Collection>>(`${this.baseUrl}/${id}`);
  }

  create(dto: CreateCollectionPayload): Observable<ApiResponse<Collection>> {
    return this.http.post<ApiResponse<Collection>>(this.baseUrl, dto);
  }

  listPending(
    params: Record<string, unknown> = {},
  ): Observable<ApiResponse<PaginatedResult<PendingInstallment>>> {
    return this.http.get<ApiResponse<PaginatedResult<PendingInstallment>>>(
      `${this.baseUrl}/pending`,
      { params: buildHttpParams(params) },
    );
  }
}
