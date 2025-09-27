import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateProjectRequest } from '../services/projects/models/create-project-request';

@Injectable({
  providedIn: 'root'
})
export class CustomProjectService {
  private baseUrl = 'http://localhost:8082/api/projects';

  constructor(private http: HttpClient) {}

  createProject(projectData: CreateProjectRequest, token: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    return this.http.post<any>(this.baseUrl, projectData, {
      headers,
      responseType: 'json' // ✅ FORCER JSON
    });
  }
}
