// src/app/features/dashboard/components/dashboard/dashboard.component.ts - VERSION AMÉLIORÉE
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DashboardControllerService } from '../../../../services/projects/services/dashboard-controller.service';
import { KanbanControllerService } from '../../../../services/projects/services/kanban-controller.service';
import { TaskControllerService } from '../../../../services/projects/services/task-controller.service';

// Modèles générés
import { DashboardDto } from '../../../../services/projects/models/dashboard-dto';
import { KanbanBoardDto } from '../../../../services/projects/models/kanban-board-dto';
import { KanbanColumn } from '../../../../services/projects/models/kanban-column';
import { TaskDto } from '../../../../services/projects/models/task-dto';
import { ProjectDto } from '../../../../services/projects/models/project-dto';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

// ✅ NOUVEAUX IMPORTS - Notifications temps réel
import { NotificationService } from '../../../../core/services/notification.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { NotificationCenterComponent } from '../../../../shared/components/notification-center/notification-center.component';

// Modals existants
import { CreateProjectModalComponent } from '../modals/create-project-modal/create-project-modal.component';
import { CreateTaskModalComponent, CreateTaskModalData } from '../modals/create-task-modal/create-task-modal/create-task-modal.component';
import { TaskDetailModalComponent, TaskDetailModalData, TaskDetailModalResult } from '../modals/task-detail-modal/task-detail-modal/task-detail-modal.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  // ✅ NOUVEAU - Gestion des subscriptions
  private destroy$ = new Subject<void>();

  // ✅ NOUVEAU - Référence au NotificationCenter
  @ViewChild(NotificationCenterComponent) notificationCenter!: NotificationCenterComponent;

  // État existant
  dashboardData: DashboardDto | null = null;
  kanbanBoard: KanbanBoardDto | null = null;
  isLoading = true;
  isUpdatingTask = false;
  selectedProjectId: string | null = null;

  // ✅ NOUVEAUX ÉTATS - Notifications temps réel
  unreadNotificationCount = 0;
  isWebSocketConnected = false;
  recentlyUpdatedTaskIds = new Set<string>();
  newTaskIds = new Set<string>();
  lastRefreshTime = new Date();

  constructor(
    private dashboardService: DashboardControllerService,
    private kanbanService: KanbanControllerService,
    private taskService: TaskControllerService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    // ✅ NOUVEAUX SERVICES - Notifications
    private notificationService: NotificationService,
    private webSocketService: WebSocketService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.initializeRealtimeNotifications();
  }

  // ===== NOUVELLES MÉTHODES - NOTIFICATIONS TEMPS RÉEL =====

  /**
   * Initialiser les notifications temps réel
   */
  private initializeRealtimeNotifications(): void {
    console.log('🔔 Initializing real-time notifications in Dashboard...');

    // Écouter le compteur de notifications non lues
    this.notificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(counts => {
        this.unreadNotificationCount = counts.unread;
      });

    // Écouter le statut de connexion WebSocket
    this.webSocketService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(connected => {
        this.isWebSocketConnected = connected;

        if (connected) {
          this.showNotificationToast(
            'success',
            'Real-time updates active',
            'You\'ll see live updates for tasks and projects'
          );
        }
      });

    // ✅ NOUVEAU - Écouter les messages WebSocket pour les tâches
    this.webSocketService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        this.handleRealtimeTaskUpdate(message);
      });

    // Écouter les erreurs WebSocket
    this.webSocketService.errors$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        console.error('🚨 WebSocket error in dashboard:', error);
        this.showNotificationToast(
          'warning',
          'Connection lost',
          'Real-time updates temporarily unavailable'
        );
      });
  }

  /**
   * Gérer les mises à jour temps réel des tâches
   */
  private handleRealtimeTaskUpdate(message: any): void {
    if (!message || !message.data) return;

    const { type, data } = message;

    switch (type) {
      case 'TASK_CREATED':
        this.handleTaskCreatedRealtime(data);
        break;

      case 'TASK_UPDATED':
        this.handleTaskUpdatedRealtime(data);
        break;

      case 'TASK_DELETED':
        this.handleTaskDeletedRealtime(data);
        break;

      case 'PROJECT_UPDATED':
        this.handleProjectUpdatedRealtime(data);
        break;

      default:
        console.log('📨 Unhandled WebSocket message type:', type);
    }
  }

  /**
   * Gérer création de tâche en temps réel
   */
  private handleTaskCreatedRealtime(taskData: any): void {
    console.log('🆕 Real-time task created:', taskData);

    // Marquer comme nouvelle tâche pour 30 secondes
    if (taskData.id) {
      this.newTaskIds.add(taskData.id);
      setTimeout(() => {
        this.newTaskIds.delete(taskData.id);
      }, 30000);
    }

    // Recharger le kanban si c'est dans le projet actuel
    if (taskData.projectId === this.selectedProjectId) {
      this.refreshKanbanSilently();

      this.showNotificationToast(
        'success',
        'New task created',
        `"${taskData.title}" has been added to the project`
      );
    }

    // Mettre à jour les métriques
    this.updateDashboardMetrics();
  }

  /**
   * Gérer mise à jour de tâche en temps réel
   */
  private handleTaskUpdatedRealtime(taskData: any): void {
    console.log('🔄 Real-time task updated:', taskData);

    // Marquer comme récemment mise à jour
    if (taskData.id) {
      this.recentlyUpdatedTaskIds.add(taskData.id);
      setTimeout(() => {
        this.recentlyUpdatedTaskIds.delete(taskData.id);
      }, 30000);
    }

    // Mettre à jour dans le kanban si visible
    if (taskData.projectId === this.selectedProjectId) {
      this.updateTaskInKanban(taskData);

      this.showNotificationToast(
        'info',
        'Task updated',
        `"${taskData.title}" has been modified`
      );
    }
  }

  /**
   * Gérer suppression de tâche en temps réel
   */
  private handleTaskDeletedRealtime(taskData: any): void {
    console.log('🗑️ Real-time task deleted:', taskData);

    // Supprimer du kanban si visible
    if (taskData.projectId === this.selectedProjectId) {
      this.removeTaskFromKanban(taskData.id);

      this.showNotificationToast(
        'warning',
        'Task deleted',
        `"${taskData.title}" has been removed`
      );
    }

    // Mettre à jour les métriques
    this.updateDashboardMetrics();
  }

  /**
   * Gérer mise à jour de projet en temps réel
   */
  private handleProjectUpdatedRealtime(projectData: any): void {
    console.log('📁 Real-time project updated:', projectData);

    if (projectData.id === this.selectedProjectId) {
      this.showNotificationToast(
        'info',
        'Project updated',
        `"${projectData.name}" has been modified`
      );

      // Rafraîchir le nom du projet dans le kanban
      if (this.kanbanBoard && projectData.name) {
        this.kanbanBoard.projectName = projectData.name;
      }
    }
  }

  /**
   * Mettre à jour une tâche dans le kanban
   */
  private updateTaskInKanban(taskData: any): void {
    if (!this.kanbanBoard?.columns) return;

    let taskFound = false;

    // Chercher la tâche dans toutes les colonnes
    for (const column of this.kanbanBoard.columns) {
      if (!column.tasks) continue;

      const taskIndex = column.tasks.findIndex(t => t.id === taskData.id);

      if (taskIndex !== -1) {
        // Vérifier si le statut a changé
        const currentTask = column.tasks[taskIndex];
        const newStatus = taskData.status?.toUpperCase();
        const currentStatus = currentTask.status?.toUpperCase();

        if (newStatus && newStatus !== currentStatus) {
          // Déplacer vers la nouvelle colonne
          const targetColumn = this.kanbanBoard.columns.find(col =>
            col.status?.toUpperCase() === newStatus
          );

          if (targetColumn) {
            // Supprimer de l'ancienne colonne
            column.tasks.splice(taskIndex, 1);
            column.taskCount = column.tasks.length;

            // Ajouter à la nouvelle colonne
            if (!targetColumn.tasks) targetColumn.tasks = [];
            targetColumn.tasks.push({ ...currentTask, ...taskData });
            targetColumn.taskCount = targetColumn.tasks.length;
          }
        } else {
          // Mettre à jour sur place
          column.tasks[taskIndex] = { ...currentTask, ...taskData };
        }

        taskFound = true;
        break;
      }
    }

    if (!taskFound) {
      // Tâche pas trouvée, recharger le kanban
      this.refreshKanbanSilently();
    }
  }

  /**
   * Supprimer une tâche du kanban
   */
  private removeTaskFromKanban(taskId: string): void {
    if (!this.kanbanBoard?.columns) return;

    for (const column of this.kanbanBoard.columns) {
      if (!column.tasks) continue;

      const taskIndex = column.tasks.findIndex(t => t.id === taskId);

      if (taskIndex !== -1) {
        column.tasks.splice(taskIndex, 1);
        column.taskCount = column.tasks.length;
        break;
      }
    }
  }

  /**
   * Rafraîchir le kanban silencieusement (sans loader)
   */
  private refreshKanbanSilently(): void {
    if (!this.selectedProjectId) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    this.kanbanService.getKanbanBoard({
      projectId: this.selectedProjectId,
      Authorization: `Bearer ${token}`
    }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.kanbanBoard = response.data;
          console.log('✅ Kanban silently refreshed');
        }
      },
      error: (error) => {
        console.error('❌ Error refreshing kanban silently:', error);
      }
    });
  }

  /**
   * Mettre à jour les métriques du dashboard
   */
  private updateDashboardMetrics(): void {
    // Rafraîchir les données dashboard silencieusement
    const token = localStorage.getItem('access_token');
    if (!token) return;

    this.dashboardService.getDashboard({
      Authorization: `Bearer ${token}`
    }).subscribe({
      next: (response) => {
        if (response.success && response.data?.stats) {
          // Mettre à jour seulement les stats
          if (this.dashboardData) {
            this.dashboardData.stats = response.data.stats;
          }
        }
      },
      error: (error) => {
        console.error('❌ Error updating dashboard metrics:', error);
      }
    });
  }

  /**
   * Afficher une notification toast personnalisée
   */
  private showNotificationToast(
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string
  ): void {
    this.notificationService.showToast(type, title, message, 4000);
  }

  /**
   * Ouvrir le centre de notifications
   */
  openNotificationCenter(): void {
    if (this.notificationCenter) {
      this.notificationCenter.open();
    }
  }

  /**
   * Vérifier si une tâche est récemment mise à jour
   */
  isTaskRecentlyUpdated(taskId?: string): boolean {
    return taskId ? this.recentlyUpdatedTaskIds.has(taskId) : false;
  }

  /**
   * Vérifier si une tâche est nouvelle
   */
  isTaskNew(taskId?: string): boolean {
    return taskId ? this.newTaskIds.has(taskId) : false;
  }

  /**
   * Obtenir la couleur du badge de notification
   */
  getNotificationBadgeColor(): 'primary' | 'accent' | 'warn' {
    if (!this.isWebSocketConnected && this.unreadNotificationCount > 0) {
      return 'warn';
    }
    return 'warn';
  }

  /**
   * Obtenir le tooltip du bouton notifications
   */
  getNotificationTooltip(): string {
    if (!this.isWebSocketConnected) {
      return 'Notifications disconnected';
    }
    if (this.unreadNotificationCount > 0) {
      return `${this.unreadNotificationCount} unread notification${this.unreadNotificationCount > 1 ? 's' : ''}`;
    }
    return 'No new notifications';
  }

  // ===== MÉTHODES EXISTANTES (inchangées) =====

  createNewProject(): void {
    const dialogRef = this.dialog.open(CreateProjectModalComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: false,
      autoFocus: true
    });

    dialogRef.afterClosed().subscribe((createdProject: ProjectDto) => {
      if (createdProject) {
        console.log('Project created:', createdProject);
        this.loadDashboardData();

        if (createdProject.id) {
          this.selectedProjectId = createdProject.id;
          this.loadKanbanData(createdProject.id);
        }
      }
    });
  }

  createNewTask(): void {
    if (!this.selectedProjectId) {
      this.snackBar.open('Please create a project first', 'Create Project', {
        duration: 5000
      }).onAction().subscribe(() => {
        this.createNewProject();
      });
      return;
    }

    this.openCreateTaskModal();
  }

  private openCreateTaskModal(initialStatus?: string): void {
    if (!this.selectedProjectId) {
      this.snackBar.open('No project selected', 'Close', { duration: 3000 });
      return;
    }

    const modalData: CreateTaskModalData = {
      projectId: this.selectedProjectId,
      projectName: this.kanbanBoard?.projectName,
      initialStatus: initialStatus
    };

    const dialogRef = this.dialog.open(CreateTaskModalComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: false,
      autoFocus: true,
      data: modalData
    });

    dialogRef.afterClosed().subscribe((createdTask: TaskDto) => {
      if (createdTask) {
        console.log('Task created:', createdTask);
        this.handleTaskCreated(createdTask, initialStatus);
      }
    });
  }

  private handleTaskCreated(task: TaskDto, initialStatus?: string): void {
    if (!this.kanbanBoard?.columns) {
      this.loadKanbanData(this.selectedProjectId!);
      return;
    }

    const targetStatus = initialStatus || task.status || 'TODO';
    const targetColumn = this.kanbanBoard.columns.find(col =>
      col.status?.toUpperCase() === targetStatus.toUpperCase()
    );

    if (targetColumn) {
      if (!targetColumn.tasks) {
        targetColumn.tasks = [];
      }
      targetColumn.tasks.push(task);
      targetColumn.taskCount = targetColumn.tasks.length;

      this.updateMetricsAfterTaskCreation();
      this.snackBar.open('Task added to kanban board', 'Close', { duration: 3000 });
    } else {
      this.loadKanbanData(this.selectedProjectId!);
    }
  }

  private updateMetricsAfterTaskCreation(): void {
    if (this.dashboardData?.stats) {
      this.dashboardData.stats.totalTasks = (this.dashboardData.stats.totalTasks || 0) + 1;
      this.dashboardData.stats.myOpenTasks = (this.dashboardData.stats.myOpenTasks || 0) + 1;
    }
  }

  addTaskToColumn(column: KanbanColumn): void {
    if (!this.selectedProjectId) {
      this.snackBar.open('Please select a project first', 'Close', { duration: 3000 });
      return;
    }

    console.log('Add task to column:', column.name, 'with status:', column.status);
    this.openCreateTaskModal(column.status);
  }

  onTaskDrop(event: CdkDragDrop<TaskDto[] | undefined>): void {
    if (!event.previousContainer.data || !event.container.data) {
      return;
    }

    const task = event.item.data as TaskDto;

    console.log('🎯 DRAG & DROP:', task.title);
    console.log('📦 From:', event.previousContainer.id, 'To:', event.container.id);

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const targetColumn = this.kanbanColumns.find(col => col.id === event.container.id);

      if (targetColumn && targetColumn.status && task.id) {
        const newStatus = targetColumn.status;
        console.log('🔄 New status from column:', newStatus);
        this.updateTaskStatus(task, newStatus, event);
      } else {
        console.error('❌ Cannot find target column or status');
        this.snackBar.open('Error: Cannot determine target status', 'Close', { duration: 3000 });
      }
    }
  }

  private updateTaskStatus(task: TaskDto, newStatus: string, event: CdkDragDrop<TaskDto[] | undefined>): void {
    if (!event.previousContainer.data || !event.container.data) {
      return;
    }

    console.log('🔄 Updating task status:');
    console.log('📋 Task:', task.title);
    console.log('📍 Current status:', task.status);
    console.log('📍 New status:', newStatus);

    this.isUpdatingTask = true;
    const token = localStorage.getItem('access_token');

    if (token && task.id) {
      this.taskService.changeTaskStatus({
        taskId: task.id,
        body: {
          newStatus: newStatus as 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
        },
        Authorization: `Bearer ${token}`
      }).subscribe({
        next: (response) => {
          console.log('✅ API Response:', response);

          if (response.success && event.previousContainer.data && event.container.data) {
            transferArrayItem(
              event.previousContainer.data,
              event.container.data,
              event.previousIndex,
              event.currentIndex
            );

            task.status = newStatus as any;
            this.updateColumnCounts();

            const columnName = this.getColumnNameFromStatus(newStatus);
            this.snackBar.open(`Task moved to ${columnName}`, 'Close', {
              duration: 3000
            });

            console.log('✅ Task successfully moved to:', newStatus);
          } else {
            console.error('❌ API returned unsuccessful response:', response);
            this.snackBar.open('Failed to update task status', 'Close', {
              duration: 3000
            });
          }
          this.isUpdatingTask = false;
        },
        error: (error) => {
          console.error('🚨 Error updating task status:', error);
          this.snackBar.open('Error updating task status', 'Close', {
            duration: 3000
          });
          this.isUpdatingTask = false;
        }
      });
    } else {
      console.log('⚠️ No token or task ID, updating locally only');
      if (event.previousContainer.data && event.container.data) {
        transferArrayItem(
          event.previousContainer.data,
          event.container.data,
          event.previousIndex,
          event.currentIndex
        );
        task.status = newStatus as any;
        this.updateColumnCounts();
      }
      this.isUpdatingTask = false;
    }
  }

  private getColumnNameFromStatus(status: string): string {
    const nameMap: {[key: string]: string} = {
      'TODO': 'To Do',
      'IN_PROGRESS': 'In Progress',
      'IN_REVIEW': 'In Review',
      'DONE': 'Done',
      'BLOCKED': 'Blocked'
    };
    return nameMap[status] || status;
  }

  private updateColumnCounts(): void {
    if (this.kanbanBoard?.columns) {
      this.kanbanBoard.columns.forEach(column => {
        column.taskCount = column.tasks?.length || 0;
      });
    }
  }

  trackByColumnId(index: number, column: KanbanColumn): string {
    return column.id || index.toString();
  }

  trackByTaskId(index: number, task: TaskDto): string {
    return task.id || index.toString();
  }

  refreshKanban(): void {
    if (this.selectedProjectId) {
      this.isLoading = true;
      this.loadKanbanData(this.selectedProjectId);
    }
  }

  private loadDashboardData(): void {
    const token = localStorage.getItem('access_token');
    console.log('🔍 Loading dashboard with token:', token?.substring(0, 50) + '...');

    if (token) {
      this.dashboardService.getDashboard({
        Authorization: `Bearer ${token}`
      }).subscribe({
        next: (response) => {
          console.log('🔍 RAW Dashboard Response:', response);

          if (response.success && response.data) {
            this.dashboardData = response.data;
            console.log('✅ Dashboard data loaded:', this.dashboardData);

            if (this.dashboardData.recentProjects && this.dashboardData.recentProjects.length > 0) {
              this.selectedProjectId = this.dashboardData.recentProjects[0].id!;
              console.log('✅ Selected project ID:', this.selectedProjectId);
              this.loadKanbanData(this.selectedProjectId);
            } else {
              console.log('❌ No projects found for this user');
              this.isLoading = false;

              setTimeout(() => {
                this.snackBar.open('Welcome! Create your first project to get started.', 'Create Project', {
                  duration: 8000
                }).onAction().subscribe(() => {
                  this.createNewProject();
                });
              }, 1000);
            }
          } else {
            console.error('❌ Dashboard response not successful:', response);
            this.isLoading = false;
          }
        },
        error: (error) => {
          console.error('🚨 Error loading dashboard:', error);
          this.snackBar.open('Error loading dashboard data', 'Close', { duration: 3000 });
          this.isLoading = false;
        }
      });
    } else {
      console.error('❌ No token found');
      this.snackBar.open('Please login first', 'Close', { duration: 3000 });
      this.isLoading = false;
    }
  }

  private loadKanbanData(projectId: string): void {
    const token = localStorage.getItem('access_token');
    if (token) {
      this.kanbanService.getKanbanBoard({
        projectId: projectId,
        Authorization: `Bearer ${token}`
      }).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.kanbanBoard = response.data;
            console.log('Kanban data loaded:', this.kanbanBoard);
          } else {
            console.error('No kanban data available');
            this.snackBar.open('No kanban data available for this project', 'Close', { duration: 3000 });
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading kanban:', error);
          this.snackBar.open('Error loading kanban data', 'Close', { duration: 3000 });
          this.isLoading = false;
        }
      });
    } else {
      this.snackBar.open('Please login first', 'Close', { duration: 3000 });
      this.isLoading = false;
    }
  }

  get stats() {
    return this.dashboardData?.stats;
  }

  get kanbanColumns(): KanbanColumn[] {
    return this.kanbanBoard?.columns || [];
  }

  getAssigneeInitials(assigneeName?: string): string {
    if (!assigneeName) return '?';
    return assigneeName.split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  formatDueDate(dueDate?: string): string {
    if (!dueDate) return '';
    const date = new Date(dueDate);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    return `Due in ${diffDays} days`;
  }

  formatUpdateTime(updatedAt?: string): string {
    if (!updatedAt) return '';
    const date = new Date(updatedAt);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  isDueDateOverdue(dueDate?: string): boolean {
    if (!dueDate) return false;
    const date = new Date(dueDate);
    const today = new Date();
    return date < today;
  }

  getColumnIcon(status: string): string {
    switch (status) {
      case 'TODO': return 'radio_button_unchecked';
      case 'IN_PROGRESS': return 'schedule';
      case 'IN_REVIEW': return 'search';
      case 'DONE': return 'check_circle';
      case 'BLOCKED': return 'block';
      default: return 'radio_button_unchecked';
    }
  }

  getTaskTypeLabel(taskType?: string): string {
    switch (taskType) {
      case 'TASK': return 'Task';
      case 'BUG': return 'Bug';
      case 'STORY': return 'Story';
      case 'EPIC': return 'Epic';
      case 'SUBTASK': return 'Subtask';
      default: return 'Task';
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

  openTask(task: TaskDto): void {
    console.log('Opening task detail:', task.taskKey);

    const modalData: TaskDetailModalData = {
      task: task,
      projectName: this.kanbanBoard?.projectName
    };

    const dialogRef = this.dialog.open(TaskDetailModalComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: false,
      autoFocus: true,
      data: modalData
    });

    dialogRef.afterClosed().subscribe((result: TaskDetailModalResult) => {
      if (result) {
        console.log('Task detail modal result:', result);

        switch (result.action) {
          case 'updated':
            this.handleTaskUpdated(result.task!, task);
            break;

          case 'deleted':
            this.handleTaskDeleted(result.task!);
            break;

          case 'cancelled':
            console.log('Task detail modal cancelled');
            break;
        }
      }
    });
  }

  private handleTaskUpdated(updatedTask: TaskDto, originalTask: TaskDto): void {
    console.log('🔄 Handling task update:', updatedTask.taskKey);

    if (!this.kanbanBoard?.columns) {
      console.log('No kanban columns, reloading...');
      this.loadKanbanData(this.selectedProjectId!);
      return;
    }

    const oldColumn = this.kanbanBoard.columns.find(col =>
      col.tasks?.some(t => t.id === originalTask.id)
    );

    const newColumn = this.kanbanBoard.columns.find(col =>
      col.status?.toUpperCase() === updatedTask.status?.toUpperCase()
    );

    if (oldColumn && newColumn) {
      if (oldColumn.tasks) {
        const taskIndex = oldColumn.tasks.findIndex(t => t.id === originalTask.id);
        if (taskIndex !== -1) {
          oldColumn.tasks.splice(taskIndex, 1);
          oldColumn.taskCount = oldColumn.tasks.length;
        }
      }

      if (!newColumn.tasks) {
        newColumn.tasks = [];
      }
      newColumn.tasks.push(updatedTask);
      newColumn.taskCount = newColumn.tasks.length;

      if (oldColumn.id !== newColumn.id) {
        const oldColumnName = this.getColumnNameFromStatus(oldColumn.status || '');
        const newColumnName = this.getColumnNameFromStatus(newColumn.status || '');
        this.snackBar.open(
          `Task moved from ${oldColumnName} to ${newColumnName}`,
          'Close',
          { duration: 4000 }
        );
      } else {
        this.snackBar.open('Task updated successfully', 'Close', { duration: 3000 });
      }

      console.log('✅ Task updated in kanban board');
    } else {
      console.log('❌ Could not find columns, reloading kanban...');
      this.loadKanbanData(this.selectedProjectId!);
    }
  }

  private handleTaskDeleted(deletedTask: TaskDto): void {
    console.log('🗑️ Handling task deletion:', deletedTask.taskKey);

    if (!this.kanbanBoard?.columns) {
      console.log('No kanban columns, reloading...');
      this.loadKanbanData(this.selectedProjectId!);
      return;
    }

    let taskRemoved = false;
    this.kanbanBoard.columns.forEach(column => {
      if (column.tasks) {
        const taskIndex = column.tasks.findIndex(t => t.id === deletedTask.id);
        if (taskIndex !== -1) {
          column.tasks.splice(taskIndex, 1);
          column.taskCount = column.tasks.length;
          taskRemoved = true;
          console.log(`✅ Task removed from ${column.name} column`);
        }
      }
    });

    if (taskRemoved) {
      if (this.dashboardData?.stats) {
        this.dashboardData.stats.totalTasks = Math.max(0, (this.dashboardData.stats.totalTasks || 0) - 1);

        if (deletedTask.status !== 'DONE') {
          this.dashboardData.stats.myOpenTasks = Math.max(0, (this.dashboardData.stats.myOpenTasks || 0) - 1);
        }
      }

      this.snackBar.open(
        `Task "${deletedTask.title}" deleted successfully`,
        'Close',
        { duration: 4000 }
      );
    } else {
      console.log('❌ Task not found in kanban, reloading...');
      this.loadKanbanData(this.selectedProjectId!);
    }
  }

  get recentlyUpdatedTasks() {
    return this.dashboardData?.recentlyUpdatedTasks || [];
  }

  get myTasks() {
    return this.dashboardData?.myTasks || [];
  }

  get myTasksCount() {
    return this.dashboardData?.myTasks?.length || 0;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
