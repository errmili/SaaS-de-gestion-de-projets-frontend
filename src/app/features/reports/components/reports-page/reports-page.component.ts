import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DashboardControllerService } from '../../../../services/projects/services/dashboard-controller.service';
import { TaskControllerService } from '../../../../services/projects/services/task-controller.service';
import { ProjectControllerService } from '../../../../services/projects/services/project-controller.service';
import { DashboardDto } from '../../../../services/projects/models/dashboard-dto';
import { TaskDto } from '../../../../services/projects/models/task-dto';
import { ProjectDto } from '../../../../services/projects/models/project-dto';

interface ChartData {
  labels: string[];
  values: number[];
  colors: string[];
}

@Component({
  selector: 'app-reports-page',
  templateUrl: './reports-page.component.html',
  styleUrls: ['./reports-page.component.css']
})
export class ReportsPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  dashboardData: DashboardDto | null = null;
  allTasks: TaskDto[] = [];
  allProjects: ProjectDto[] = [];

  isLoading = false;
  selectedPeriod = new FormControl('all');
  selectedProjectId = new FormControl('all');

  // Chart data
  statusChartData: ChartData | null = null;
  priorityChartData: ChartData | null = null;
  typeChartData: ChartData | null = null;

  // Stats
  completionRate = 0;
  avgTasksPerProject = 0;
  overdueTasks = 0;

  periods = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' }
  ];

  constructor(
    private dashboardService: DashboardControllerService,
    private taskService: TaskControllerService,
    private projectService: ProjectControllerService
  ) {}

  ngOnInit(): void {
    this.loadAllData();
    this.setupFilters();
  }

  setupFilters(): void {
    this.selectedPeriod.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateStats());

    this.selectedProjectId.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateStats());
  }

  loadAllData(): void {
    this.isLoading = true;
    const token = localStorage.getItem('access_token');

    if (!token) {
      this.isLoading = false;
      return;
    }

    // Load dashboard data
    this.dashboardService.getDashboard({
      Authorization: `Bearer ${token}`
    }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.dashboardData = response.data;
          this.loadTasks(token);
        }
      },
      error: (error) => {
        console.error('Error loading dashboard:', error);
        this.isLoading = false;
      }
    });
  }

  loadTasks(token: string): void {
  // Load all projects
  this.projectService.getUserProjects({
    Authorization: `Bearer ${token}`
  }).subscribe({
    next: (response) => {
      if (response.success && response.data) {
        this.allProjects = response.data;
      }
    },
    error: (error) => console.error('Error loading projects:', error)
  });

  // ✅ CORRECTION - Passer pageable comme objet
  this.taskService.getAllTasks1({
    Authorization: `Bearer ${token}`,
    pageable: {
      page: 0,
      size: 1000,
      sort: ['createdAt,desc']
    }
  }).subscribe({
    next: (response) => {
      if (response.success && response.data) {
        // Si c'est paginé (Page<TaskDto>)
        if (response.data.content) {
          this.allTasks = response.data.content;
        } else if (Array.isArray(response.data)) {
          this.allTasks = response.data;
        }
        this.calculateStats();
        this.isLoading = false;
      }
    },
    error: (error) => {
      console.error('Error loading tasks:', error);
      this.isLoading = false;
    }
  });
}

  calculateStats(): void {
    const filteredTasks = this.getFilteredTasks();

    // Status distribution
    this.statusChartData = this.calculateStatusDistribution(filteredTasks);

    // Priority distribution
    this.priorityChartData = this.calculatePriorityDistribution(filteredTasks);

    // Type distribution
    this.typeChartData = this.calculateTypeDistribution(filteredTasks);

    // Completion rate
    const doneTasks = filteredTasks.filter(t => t.status === 'DONE').length;
    this.completionRate = filteredTasks.length > 0
      ? Math.round((doneTasks / filteredTasks.length) * 100)
      : 0;

    // Avg tasks per project
    this.avgTasksPerProject = this.allProjects.length > 0
      ? Math.round(filteredTasks.length / this.allProjects.length)
      : 0;

    // Overdue tasks
    this.overdueTasks = filteredTasks.filter(t => this.isOverdue(t)).length;
  }

  getFilteredTasks(): TaskDto[] {
    let filtered = [...this.allTasks];

    // Filter by project
    const projectId = this.selectedProjectId.value;
    if (projectId && projectId !== 'all') {
      filtered = filtered.filter(t => t.projectId === projectId);
    }

    // Filter by period
    const period = this.selectedPeriod.value;
    if (period && period !== 'all') {
      const now = new Date();
      filtered = filtered.filter(t => {
        if (!t.createdAt) return false;
        const taskDate = new Date(t.createdAt);

        switch (period) {
          case 'today':
            return this.isSameDay(taskDate, now);
          case 'week':
            return this.isThisWeek(taskDate, now);
          case 'month':
            return this.isThisMonth(taskDate, now);
          case 'year':
            return this.isThisYear(taskDate, now);
          default:
            return true;
        }
      });
    }

    return filtered;
  }

  calculateStatusDistribution(tasks: TaskDto[]): ChartData {
    const statuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'];
    const counts = statuses.map(status =>
      tasks.filter(t => t.status === status).length
    );

    return {
      labels: ['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'],
      values: counts,
      colors: ['#6c757d', '#ff9800', '#2196f3', '#4caf50', '#f44336']
    };
  }

  calculatePriorityDistribution(tasks: TaskDto[]): ChartData {
    const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const counts = priorities.map(priority =>
      tasks.filter(t => t.priority === priority).length
    );

    return {
      labels: ['Low', 'Medium', 'High', 'Critical'],
      values: counts,
      colors: ['#4caf50', '#2196f3', '#ff9800', '#f44336']
    };
  }

  calculateTypeDistribution(tasks: TaskDto[]): ChartData {
    const types = ['TASK', 'BUG', 'STORY', 'EPIC'];
    const counts = types.map(type =>
      tasks.filter(t => t.taskType === type).length
    );

    return {
      labels: ['Task', 'Bug', 'Story', 'Epic'],
      values: counts,
      colors: ['#2196f3', '#f44336', '#9c27b0', '#ff9800']
    };
  }

  isOverdue(task: TaskDto): boolean {
    if (!task.dueDate || task.status === 'DONE') return false;
    return new Date(task.dueDate) < new Date();
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  isThisWeek(date: Date, now: Date): boolean {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return date >= weekStart;
  }

  isThisMonth(date: Date, now: Date): boolean {
    return date.getMonth() === now.getMonth() &&
           date.getFullYear() === now.getFullYear();
  }

  isThisYear(date: Date, now: Date): boolean {
    return date.getFullYear() === now.getFullYear();
  }

  refreshData(): void {
    this.loadAllData();
  }

  exportReport(): void {
    // TODO: Implement export functionality
    alert('Export functionality coming soon!');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
