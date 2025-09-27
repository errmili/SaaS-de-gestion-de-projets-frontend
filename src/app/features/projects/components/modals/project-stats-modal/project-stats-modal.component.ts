import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { DashboardControllerService } from './../../../../../services/projects/services/dashboard-controller.service';
import { ProjectDto } from './../../../../../services/projects/models/project-dto';
import { ProjectStatsDto } from './../../../../../services/projects/models/project-stats-dto';

// Interface pour les données passées au modal
export interface ProjectStatsModalData {
  project: ProjectDto;
}

// Interface pour les données du graphique
interface ChartData {
  name: string;
  value: number;
  color?: string;
}

@Component({
  selector: 'app-project-stats-modal',
  templateUrl: './project-stats-modal.component.html',
  styleUrls: ['./project-stats-modal.component.css']
})
export class ProjectStatsModalComponent implements OnInit {
  projectStats: ProjectStatsDto | null = null;
  isLoading = true;

  // Données pour les graphiques
  tasksByStatusData: ChartData[] = [];
  tasksByPriorityData: ChartData[] = [];
  tasksByTypeData: ChartData[] = [];

  // Couleurs pour les graphiques
  statusColors = {
    'TODO': '#6c757d',
    'IN_PROGRESS': '#ff9800',
    'IN_REVIEW': '#2196f3',
    'DONE': '#4caf50',
    'BLOCKED': '#f44336'
  };

  priorityColors = {
    'LOW': '#4caf50',
    'MEDIUM': '#ff9800',
    'HIGH': '#f44336',
    'CRITICAL': '#d32f2f'
  };

  typeColors = {
    'TASK': '#2196f3',
    'BUG': '#f44336',
    'STORY': '#4caf50',
    'EPIC': '#9c27b0',
    'SUBTASK': '#ff9800'
  };

  constructor(
    private dialogRef: MatDialogRef<ProjectStatsModalComponent>,
    private dashboardService: DashboardControllerService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: ProjectStatsModalData
  ) {}

  ngOnInit(): void {
    this.loadProjectStats();
    console.log('📊 ProjectStatsModal initialized for project:', this.data.project.name);
  }

  private loadProjectStats(): void {
    this.isLoading = true;
    const token = localStorage.getItem('access_token');

    if (!token || !this.data.project.id) {
      this.snackBar.open('Authentication error or missing project ID', 'Close', { duration: 3000 });
      this.isLoading = false;
      return;
    }

    console.log('🔍 Loading project stats for:', this.data.project.id);

    this.dashboardService.getProjectStats({
      projectId: this.data.project.id,
      Authorization: `Bearer ${token}`
    }).subscribe({
      next: (response) => {
        console.log('✅ Project stats loaded:', response);

        if (response.success && response.data) {
          this.projectStats = response.data;
          this.processStatsData();
        } else {
          console.log('❌ No stats data available');
          this.projectStats = this.createFallbackStats();
          this.processStatsData();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('🚨 Error loading project stats:', error);
        this.snackBar.open('Error loading project statistics', 'Close', { duration: 3000 });

        // Créer des stats par défaut pour éviter un écran vide
        this.projectStats = this.createFallbackStats();
        this.processStatsData();
        this.isLoading = false;
      }
    });
  }

  private createFallbackStats(): ProjectStatsDto {
    return {
      projectId: this.data.project.id,
      projectName: this.data.project.name,
      totalTasks: this.data.project.taskCount || 0,
      todoTasks: 0,
      inProgressTasks: 0,
      completedTasks: 0,
      blockedTasks: 0,
      totalMembers: this.data.project.memberCount || 0,
      completionRate: 0,
      tasksByPriority: {},
      tasksByType: {},
      activeSprints: 0,
      totalSprints: 0,
      completedSprints: 0,
      averageStoryPointsPerTask: 0,
      averageTasksPerSprint: 0
    };
  }

  private processStatsData(): void {
    if (!this.projectStats) return;

    // Données par statut
    this.tasksByStatusData = [
      { name: 'To Do', value: this.projectStats.todoTasks || 0, color: this.statusColors['TODO'] },
      { name: 'In Progress', value: this.projectStats.inProgressTasks || 0, color: this.statusColors['IN_PROGRESS'] },
      { name: 'Completed', value: this.projectStats.completedTasks || 0, color: this.statusColors['DONE'] },
      { name: 'Blocked', value: this.projectStats.blockedTasks || 0, color: this.statusColors['BLOCKED'] }
    ].filter(item => item.value > 0);

    // Données par priorité
    this.tasksByPriorityData = Object.entries(this.projectStats.tasksByPriority || {})
      .map(([priority, count]) => ({
        name: this.formatPriorityLabel(priority),
        value: count as number,
        color: this.priorityColors[priority as keyof typeof this.priorityColors] || '#6c757d'
      }))
      .filter(item => item.value > 0);

    // Données par type
    this.tasksByTypeData = Object.entries(this.projectStats.tasksByType || {})
      .map(([type, count]) => ({
        name: this.formatTypeLabel(type),
        value: count as number,
        color: this.typeColors[type as keyof typeof this.typeColors] || '#6c757d'
      }))
      .filter(item => item.value > 0);

    console.log('📊 Processed chart data:', {
      status: this.tasksByStatusData,
      priority: this.tasksByPriorityData,
      type: this.tasksByTypeData
    });
  }

  // Méthodes utilitaires
  private formatPriorityLabel(priority: string): string {
    switch (priority.toUpperCase()) {
      case 'LOW': return 'Low';
      case 'MEDIUM': return 'Medium';
      case 'HIGH': return 'High';
      case 'CRITICAL': return 'Critical';
      default: return priority;
    }
  }

  private formatTypeLabel(type: string): string {
    switch (type.toUpperCase()) {
      case 'TASK': return 'Task';
      case 'BUG': return 'Bug';
      case 'STORY': return 'Story';
      case 'EPIC': return 'Epic';
      case 'SUBTASK': return 'Subtask';
      default: return type;
    }
  }

  getCompletionPercentage(): number {
    if (!this.projectStats || !this.projectStats.totalTasks || this.projectStats.totalTasks === 0) {
      return 0;
    }
    return Math.round((this.projectStats.completionRate || 0) * 100);
  }

  getProgressColor(): string {
    const percentage = this.getCompletionPercentage();
    if (percentage >= 80) return 'primary';
    if (percentage >= 50) return 'accent';
    return 'warn';
  }

  getSprintProgress(): number {
    if (!this.projectStats || !this.projectStats.totalSprints || this.projectStats.totalSprints === 0) {
      return 0;
    }
    return Math.round(((this.projectStats.completedSprints || 0) / this.projectStats.totalSprints) * 100);
  }

  formatNumber(value: number | undefined): string {
    if (value === undefined || value === null) return '0';
    return value.toLocaleString();
  }

  formatDecimal(value: number | undefined): string {
    if (value === undefined || value === null) return '0.0';
    return value.toFixed(1);
  }

  onClose(): void {
    console.log('🚪 Closing stats modal');
    this.dialogRef.close();
  }

  refreshStats(): void {
    console.log('🔄 Refreshing project stats...');
    this.loadProjectStats();
  }

  // Getters pour le template
  get project(): ProjectDto {
    return this.data.project;
  }

  get hasTaskData(): boolean {
    return this.tasksByStatusData.length > 0;
  }

  get hasPriorityData(): boolean {
    return this.tasksByPriorityData.length > 0;
  }

  get hasTypeData(): boolean {
    return this.tasksByTypeData.length > 0;
  }

  get totalTasksProcessed(): number {
    return this.tasksByStatusData.reduce((sum, item) => sum + item.value, 0);
  }

  // Méthodes pour les graphiques simples (si pas de lib de charts)
  getStatusPercentage(statusData: ChartData): number {
    if (this.totalTasksProcessed === 0) return 0;
    return Math.round((statusData.value / this.totalTasksProcessed) * 100);
  }

  getPriorityPercentage(priorityData: ChartData): number {
    const total = this.tasksByPriorityData.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return 0;
    return Math.round((priorityData.value / total) * 100);
  }

  getTypePercentage(typeData: ChartData): number {
    const total = this.tasksByTypeData.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return 0;
    return Math.round((typeData.value / total) * 100);
  }
}
