import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { TaskControllerService } from '../../services/projects/services/task-controller.service';
import { ProjectControllerService } from '../../services/projects/services/project-controller.service';
import { UserControllerService } from '../../services/auth/services/user-controller.service';
import { TaskDto } from '../../services/projects/models/task-dto';
import { ProjectDto } from '../../services/projects/models/project-dto';
import { UserDto } from '../../services/auth/models/user-dto';

export interface SearchResult {
  type: 'task' | 'project' | 'member';
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  route: string[];
  data: TaskDto | ProjectDto | UserDto;
}

export interface SearchResults {
  tasks: SearchResult[];
  projects: SearchResult[];
  members: SearchResult[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  constructor(
    private taskService: TaskControllerService,
    private projectService: ProjectControllerService,
    private userService: UserControllerService
  ) {}

  search(query: string): Observable<SearchResults> {
    if (!query || query.trim().length < 2) {
      return of({
        tasks: [],
        projects: [],
        members: [],
        total: 0
      });
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      return of({
        tasks: [],
        projects: [],
        members: [],
        total: 0
      });
    }

    const searchQuery = query.trim();

    return forkJoin({
      tasks: this.searchTasks(searchQuery, token),
      projects: this.searchProjects(searchQuery, token),
      members: this.searchMembers(searchQuery, token)
    }).pipe(
      map(results => ({
        tasks: results.tasks,
        projects: results.projects,
        members: results.members,
        total: results.tasks.length + results.projects.length + results.members.length
      })),
      catchError(error => {
        console.error('Search error:', error);
        return of({
          tasks: [],
          projects: [],
          members: [],
          total: 0
        });
      })
    );
  }

  private searchTasks(query: string, token: string): Observable<SearchResult[]> {
    return this.taskService.searchTasks({
      q: query,
      Authorization: `Bearer ${token}`
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data.slice(0, 5).map(task => ({
            type: 'task' as const,
            id: task.id || '',
            title: task.title || 'Untitled Task',
            subtitle: `${task.taskKey} • ${task.projectName || 'No Project'}`,
            icon: 'assignment',
            route: ['/dashboard'], // TODO: Route vers task detail
            data: task
          }));
        }
        return [];
      }),
      catchError(() => of([]))
    );
  }

  private searchProjects(query: string, token: string): Observable<SearchResult[]> {
    return this.projectService.searchProjects({
      q: query,
      Authorization: `Bearer ${token}`
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data.slice(0, 5).map(project => ({
            type: 'project' as const,
            id: project.id || '',
            title: project.name || 'Untitled Project',
            subtitle: `${project.key} • ${project.description || 'No description'}`,
            icon: 'folder',
            route: ['/projects', project.id || ''],
            data: project
          }));
        }
        return [];
      }),
      catchError(() => of([]))
    );
  }

  private searchMembers(query: string, token: string): Observable<SearchResult[]> {
    return this.userService.getAllUsers({
      Authorization: `Bearer ${token}`
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          const searchLower = query.toLowerCase();
          return response.data
            .filter(user =>
              user.fullName?.toLowerCase().includes(searchLower) ||
              user.email?.toLowerCase().includes(searchLower) ||
              user.firstName?.toLowerCase().includes(searchLower) ||
              user.lastName?.toLowerCase().includes(searchLower)
            )
            .slice(0, 5)
            .map(user => ({
              type: 'member' as const,
              id: user.id || '',
              title: user.fullName || 'Unknown User',
              subtitle: user.email || '',
              icon: 'person',
              route: ['/team'], // TODO: Route vers member detail
              data: user
            }));
        }
        return [];
      }),
      catchError(() => of([]))
    );
  }
}
