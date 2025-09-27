import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

// Services
import { TaskControllerService } from '../../../../services/projects/services/task-controller.service';

// Models
import { TaskDto } from '../../../../services/projects/models/task-dto';

// Components (on va les importer du dashboard pour réutiliser)
// import { TaskDetailModalComponent, TaskDetailModalData, TaskDetailModalResult } from '../../dashboard/components/modals/task-detail-modal/task-detail-modal.component';

// Interfaces locales
interface TaskFilter {
  status?: string;
  priority?: string;
  project?: string;
  overdue?: boolean;
}

@Component({
  selector: 'app-my-tasks',
  templateUrl: './my-tasks.component.html',
  styleUrls: ['./my-tasks.component.css']
})
export class MyTasksComponent implements OnInit {
  // ===== DONNÉES =====
  tasks: TaskDto[] = [];
  filteredTasks: TaskDto[] = [];
  dataSource = new MatTableDataSource<TaskDto>([]);
  isLoading = true;

  // ===== CONTRÔLES =====
  searchControl = new FormControl('');
  statusFilter = new FormControl('');
  priorityFilter = new FormControl('');
  projectFilter = new FormControl('');
  overdueFilter = new FormControl(false);

  // ===== TABLE CONFIG =====
  displayedColumns: string[] = [
    'taskKey',
    'title',
    'project',
    'status',
    'priority',
    'dueDate',
    'actions'
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // ===== STATS =====
  totalTasks = 0;
  openTasks = 0;
  overdueTasks = 0;
  completedThisWeek = 0;

  // ===== FILTRES DISPONIBLES =====
  availableStatuses = [
    { value: '', label: 'All Statuses' },
    { value: 'TODO', label: 'To Do' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'IN_REVIEW', label: 'In Review' },
    { value: 'DONE', label: 'Done' },
    { value: 'BLOCKED', label: 'Blocked' }
  ];

  availablePriorities = [
    { value: '', label: 'All Priorities' },
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'CRITICAL', label: 'Critical' }
  ];

  availableProjects: { value: string; label: string }[] = [
    { value: '', label: 'All Projects' }
  ];

  constructor(
    private taskService: TaskControllerService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadMyTasks();
    this.setupFilters();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  // ===== CHARGEMENT DES DONNÉES =====
  private loadMyTasks(): void {
    this.isLoading = true;
    const token = localStorage.getItem('access_token');

    if (!token) {
      this.snackBar.open('Please login first', 'Close', { duration: 3000 });
      this.isLoading = false;
      return;
    }

    console.log('🔍 Loading my tasks...');

    this.taskService.getMyTasks({
      Authorization: `Bearer ${token}`
    }).subscribe({
      next: (response) => {
        console.log('✅ My tasks loaded:', response);

        if (response.success && response.data) {
          this.tasks = response.data;
          this.processTasksData();
          this.applyFilters();
        } else {
          console.log('❌ No tasks data available');
          this.tasks = [];
          this.processTasksData();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('🚨 Error loading my tasks:', error);
        this.snackBar.open('Error loading tasks', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  // ===== TRAITEMENT DES DONNÉES =====
  private processTasksData(): void {
    this.totalTasks = this.tasks.length;
    this.openTasks = this.tasks.filter(t => t.status !== 'DONE').length;
    this.overdueTasks = this.tasks.filter(t => this.isOverdue(t.dueDate)).length;

    // Tâches complétées cette semaine (approximation)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    this.completedThisWeek = this.tasks.filter(t =>
      t.status === 'DONE' &&
      t.updatedAt &&
      new Date(t.updatedAt) >= oneWeekAgo
    ).length;

    // Extraire les projets uniques
    const projects = [...new Set(this.tasks.map(t => t.projectName).filter(Boolean))];
    this.availableProjects = [
      { value: '', label: 'All Projects' },
      ...projects.map(p => ({ value: p!, label: p! }))
    ];

    console.log('📊 Tasks stats:', {
      total: this.totalTasks,
      open: this.openTasks,
      overdue: this.overdueTasks,
      completed: this.completedThisWeek
    });
  }

  // ===== FILTRES =====
  private setupFilters(): void {
    // Recherche en temps réel
    this.searchControl.valueChanges.subscribe(() => {
      this.applyFilters();
    });

    // Filtres status/priority/project
    this.statusFilter.valueChanges.subscribe(() => {
      this.applyFilters();
    });

    this.priorityFilter.valueChanges.subscribe(() => {
      this.applyFilters();
    });

    this.projectFilter.valueChanges.subscribe(() => {
      this.applyFilters();
    });

    this.overdueFilter.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  private applyFilters(): void {
    let filtered = [...this.tasks];

    // Recherche par titre/description
    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.title?.toLowerCase().includes(searchTerm) ||
        task.description?.toLowerCase().includes(searchTerm) ||
        task.taskKey?.toLowerCase().includes(searchTerm)
      );
    }

    // Filtre par statut
    const statusFilter = this.statusFilter.value;
    if (statusFilter) {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    // Filtre par priorité
    const priorityFilter = this.priorityFilter.value;
    if (priorityFilter) {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    // Filtre par projet
    const projectFilter = this.projectFilter.value;
    if (projectFilter) {
      filtered = filtered.filter(task => task.projectName === projectFilter);
    }

    // Filtre tâches en retard
    if (this.overdueFilter.value) {
      filtered = filtered.filter(task => this.isOverdue(task.dueDate));
    }

    this.filteredTasks = filtered;
    this.dataSource.data = filtered;

    console.log('🔍 Filters applied:', {
      original: this.tasks.length,
      filtered: filtered.length,
      search: searchTerm,
      status: statusFilter,
      priority: priorityFilter
    });
  }

  // ===== ACTIONS =====
  refreshTasks(): void {
    console.log('🔄 Refreshing tasks...');
    this.loadMyTasks();
  }

  clearFilters(): void {
    console.log('🧹 Clearing all filters...');
    this.searchControl.setValue('');
    this.statusFilter.setValue('');
    this.priorityFilter.setValue('');
    this.projectFilter.setValue('');
    this.overdueFilter.setValue(false);
  }

  quickStatusChange(task: TaskDto, newStatus: string): void {
    console.log('⚡ Quick status change:', task.taskKey, '→', newStatus);

    if (!task.id) {
      this.snackBar.open('Cannot update task - no ID', 'Close', { duration: 3000 });
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      this.snackBar.open('Please login first', 'Close', { duration: 3000 });
      return;
    }

    this.taskService.changeTaskStatus({
      taskId: task.id,
      body: { newStatus: newStatus as any },
      Authorization: `Bearer ${token}`
    }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Mettre à jour la tâche locale
          const taskIndex = this.tasks.findIndex(t => t.id === task.id);
          if (taskIndex !== -1) {
            this.tasks[taskIndex] = { ...response.data };
            this.processTasksData();
            this.applyFilters();
          }

          this.snackBar.open(
            `Task marked as ${this.getStatusLabel(newStatus)}`,
            'Close',
            { duration: 3000 }
          );
        }
      },
      error: (error) => {
        console.error('🚨 Error updating task status:', error);
        this.snackBar.open('Error updating task', 'Close', { duration: 3000 });
      }
    });
  }

  openTaskDetail(task: TaskDto): void {
    console.log('📋 Opening task detail:', task.taskKey);

    // TODO: Importer et utiliser TaskDetailModalComponent
    // Pour l'instant, on affiche juste un message
    this.snackBar.open(
      `Task detail modal for ${task.taskKey} - Coming soon!`,
      'Close',
      { duration: 3000 }
    );

    /* CODE À ACTIVER QUAND ON AURA RÉSOLU L'IMPORT :
    const modalData: TaskDetailModalData = {
      task: task,
      projectName: task.projectName
    };

    const dialogRef = this.dialog.open(TaskDetailModalComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: modalData
    });

    dialogRef.afterClosed().subscribe((result: TaskDetailModalResult) => {
      if (result?.action === 'updated' || result?.action === 'deleted') {
        this.loadMyTasks(); // Recharger pour avoir les dernières données
      }
    });
    */
  }

  // ===== UTILITAIRES =====
  isOverdue(dueDate?: string): boolean {
    if (!dueDate) return false;
    try {
      return new Date(dueDate) < new Date();
    } catch {
      return false;
    }
  }

  formatDueDate(dueDate?: string): string {
    if (!dueDate) return 'No due date';
    try {
      const date = new Date(dueDate);
      const today = new Date();
      const diffTime = date.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Due today';
      if (diffDays === 1) return 'Due tomorrow';
      if (diffDays === -1) return 'Due yesterday';
      if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
      return `Due in ${diffDays} days`;
    } catch {
      return 'Invalid date';
    }
  }

  getStatusLabel(status?: string): string {
    switch (status) {
      case 'TODO': return 'To Do';
      case 'IN_PROGRESS': return 'In Progress';
      case 'IN_REVIEW': return 'In Review';
      case 'DONE': return 'Done';
      case 'BLOCKED': return 'Blocked';
      default: return status || 'Unknown';
    }
  }

  getStatusIcon(status?: string): string {
    switch (status) {
      case 'TODO': return 'radio_button_unchecked';
      case 'IN_PROGRESS': return 'schedule';
      case 'IN_REVIEW': return 'search';
      case 'DONE': return 'check_circle';
      case 'BLOCKED': return 'block';
      default: return 'help_outline';
    }
  }

  getPriorityIcon(priority?: string): string {
    switch (priority) {
      case 'LOW': return 'keyboard_arrow_down';
      case 'MEDIUM': return 'remove';
      case 'HIGH': return 'keyboard_arrow_up';
      case 'CRITICAL': return 'priority_high';
      default: return 'remove';
    }
  }

  // ===== GETTERS POUR LE TEMPLATE =====
  get hasFiltersApplied(): boolean {
    return !!(
      this.searchControl.value ||
      this.statusFilter.value ||
      this.priorityFilter.value ||
      this.projectFilter.value ||
      this.overdueFilter.value
    );
  }

  get filteredTasksCount(): number {
    return this.filteredTasks.length;
  }
}
