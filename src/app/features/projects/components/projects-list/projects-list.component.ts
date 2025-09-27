import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

// Services
import { ProjectControllerService } from '../../../../services/projects/services/project-controller.service';
import { DashboardControllerService } from '../../../../services/projects/services/dashboard-controller.service';

// Models
import { ProjectDto } from '../../../../services/projects/models/project-dto';
import { ProjectStatsDto } from '../../../../services/projects/models/project-stats-dto';
import { ProjectDetailModalComponent } from '../modals/project-detail-modal/project-detail-modal.component';
import { ProjectStatsModalComponent } from '../modals/project-stats-modal/project-stats-modal.component';

// Components
// import { ProjectDetailModalComponent, ProjectDetailModalData, ProjectDetailModalResult } from '../modals/project-detail-modal/project-detail-modal.component';
// import { ProjectStatsModalComponent, ProjectStatsModalData } from '../modals/project-stats-modal/project-stats-modal.component';
// import { CreateProjectModalComponent } from '../../dashboard/components/modals/create-project-modal/create-project-modal.component';

interface ProjectFilter {
  status?: string;
  priority?: string;
  search?: string;
}

@Component({
  selector: 'app-projects-list',
  templateUrl: './projects-list.component.html',
  styleUrls: ['./projects-list.component.css']
})
export class ProjectsListComponent implements OnInit {
  // ===== DONNÉES =====
  projects: ProjectDto[] = [];
  filteredProjects: ProjectDto[] = [];
  isLoading = true;

  // ===== CONTRÔLES =====
  searchControl = new FormControl('');
  statusFilter = new FormControl('');
  priorityFilter = new FormControl('');

  // ===== STATS GLOBALES =====
  totalProjects = 0;
  activeProjects = 0;
  completedProjects = 0;
  totalTasks = 0;

  // ===== FILTRES DISPONIBLES =====
  availableStatuses = [
    { value: '', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'ARCHIVED', label: 'Archived' },
    { value: 'ON_HOLD', label: 'On Hold' }
  ];

  availablePriorities = [
    { value: '', label: 'All Priorities' },
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'CRITICAL', label: 'Critical' }
  ];

  constructor(
    private projectService: ProjectControllerService,
    private dashboardService: DashboardControllerService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadProjects();
    this.setupFilters();
  }

  // ===== CHARGEMENT DES DONNÉES =====
  private loadProjects(): void {
    this.isLoading = true;
    const token = localStorage.getItem('access_token');

    if (!token) {
      this.snackBar.open('Please login first', 'Close', { duration: 3000 });
      this.isLoading = false;
      return;
    }

    console.log('🔍 Loading user projects...');

    this.projectService.getUserProjects({
      Authorization: `Bearer ${token}`
    }).subscribe({
      next: (response) => {
        console.log('✅ Projects loaded:', response);

        if (response.success && response.data) {
          this.projects = response.data;
          this.processProjectsData();
          this.applyFilters();
        } else {
          console.log('❌ No projects data available');
          this.projects = [];
          this.processProjectsData();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('🚨 Error loading projects:', error);
        this.snackBar.open('Error loading projects', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  // ===== TRAITEMENT DES DONNÉES =====
  private processProjectsData(): void {
    this.totalProjects = this.projects.length;
    this.activeProjects = this.projects.filter(p => p.status === 'ACTIVE').length;
    this.completedProjects = this.projects.filter(p => p.status === 'COMPLETED').length;
    this.totalTasks = this.projects.reduce((sum, p) => sum + (p.taskCount || 0), 0);

    console.log('📊 Projects stats:', {
      total: this.totalProjects,
      active: this.activeProjects,
      completed: this.completedProjects,
      totalTasks: this.totalTasks
    });
  }

  // ===== FILTRES =====
  private setupFilters(): void {
    this.searchControl.valueChanges.subscribe(() => {
      this.applyFilters();
    });

    this.statusFilter.valueChanges.subscribe(() => {
      this.applyFilters();
    });

    this.priorityFilter.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  private applyFilters(): void {
    let filtered = [...this.projects];

    // Recherche par nom/description/key
    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.name?.toLowerCase().includes(searchTerm) ||
        project.description?.toLowerCase().includes(searchTerm) ||
        project.key?.toLowerCase().includes(searchTerm)
      );
    }

    // Filtre par statut
    const statusFilter = this.statusFilter.value;
    if (statusFilter) {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    // Filtre par priorité
    const priorityFilter = this.priorityFilter.value;
    if (priorityFilter) {
      filtered = filtered.filter(project => project.priority === priorityFilter);
    }

    this.filteredProjects = filtered;

    console.log('🔍 Filters applied:', {
      original: this.projects.length,
      filtered: filtered.length,
      search: searchTerm,
      status: statusFilter,
      priority: priorityFilter
    });
  }

  // ===== ACTIONS =====
  refreshProjects(): void {
    console.log('🔄 Refreshing projects...');
    this.loadProjects();
  }

  clearFilters(): void {
    console.log('🧹 Clearing all filters...');
    this.searchControl.setValue('');
    this.statusFilter.setValue('');
    this.priorityFilter.setValue('');
  }

  createNewProject(): void {
    console.log('➕ Creating new project...');

    // TODO: Ouvrir CreateProjectModalComponent
    // Pour l'instant, message temporaire
    this.snackBar.open('Create Project modal - Integration coming soon!', 'Close', { duration: 3000 });

    /* CODE À ACTIVER QUAND ON AURA RÉSOLU L'IMPORT :
    const dialogRef = this.dialog.open(CreateProjectModalComponent, {
      width: '600px',
      maxWidth: '90vw'
    });

    dialogRef.afterClosed().subscribe((createdProject: ProjectDto) => {
      if (createdProject) {
        this.loadProjects(); // Recharger la liste
      }
    });
    */
  }

  editProject(project: ProjectDto): void {
    console.log('✏️ Editing project:', project.name);

    const modalData: ProjectDetailModalData = {
      project: project,
      mode: 'edit'
    };

    const dialogRef = this.dialog.open(ProjectDetailModalComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: modalData
    });

    dialogRef.afterClosed().subscribe((result: ProjectDetailModalResult) => {
      if (result?.action === 'updated' || result?.action === 'deleted') {
        this.loadProjects(); // Recharger la liste
      }
    });
  }

  viewProjectStats(project: ProjectDto): void {
    console.log('📊 Viewing project stats:', project.name);

    if (!project.id) {
      this.snackBar.open('Cannot load stats - no project ID', 'Close', { duration: 3000 });
      return;
    }

    const modalData: ProjectStatsModalData = {
      project: project
    };

    this.dialog.open(ProjectStatsModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: modalData
    });
  }

  duplicateProject(project: ProjectDto): void {
    console.log('📋 Duplicating project:', project.name);

    // TODO: Implémenter la duplication
    this.snackBar.open(
      `Duplicate "${project.name}" - Feature coming soon!`,
      'Close',
      { duration: 3000 }
    );
  }

  archiveProject(project: ProjectDto): void {
    console.log('📦 Archiving project:', project.name);

    if (!project.id) {
      this.snackBar.open('Cannot archive - no project ID', 'Close', { duration: 3000 });
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      this.snackBar.open('Please login first', 'Close', { duration: 3000 });
      return;
    }

    this.projectService.updateProject({
      projectId: project.id,
      body: { status: 'ARCHIVED' },
      Authorization: `Bearer ${token}`
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open(`Project "${project.name}" archived`, 'Close', { duration: 3000 });
          this.loadProjects();
        }
      },
      error: (error) => {
        console.error('🚨 Error archiving project:', error);
        this.snackBar.open('Error archiving project', 'Close', { duration: 3000 });
      }
    });
  }

  // ===== UTILITAIRES =====
  getStatusIcon(status?: string): string {
    switch (status) {
      case 'ACTIVE': return 'play_circle';
      case 'COMPLETED': return 'check_circle';
      case 'ARCHIVED': return 'archive';
      case 'ON_HOLD': return 'pause_circle';
      default: return 'help_outline';
    }
  }

  getStatusColor(status?: string): string {
    switch (status) {
      case 'ACTIVE': return 'primary';
      case 'COMPLETED': return 'accent';
      case 'ARCHIVED': return 'warn';
      case 'ON_HOLD': return 'warn';
      default: return 'primary';
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

  getPriorityColor(priority?: string): string {
    switch (priority) {
      case 'LOW': return '#4caf50';
      case 'MEDIUM': return '#ff9800';
      case 'HIGH': return '#f44336';
      case 'CRITICAL': return '#d32f2f';
      default: return '#6c757d';
    }
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  }

  calculateProgress(project: ProjectDto): number {
    if (!project.taskCount || project.taskCount === 0) return 0;
    // Supposons qu'on a un completedTaskCount dans les stats - sinon on retourne une valeur par défaut
    return Math.random() * 100; // TODO: Remplacer par vraies données
  }

  getDaysRemaining(endDate?: string): number | null {
    if (!endDate) return null;
    try {
      const end = new Date(endDate);
      const today = new Date();
      const diffTime = end.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  }

  // ===== GETTERS POUR LE TEMPLATE =====
  get hasFiltersApplied(): boolean {
    return !!(
      this.searchControl.value ||
      this.statusFilter.value ||
      this.priorityFilter.value
    );
  }

  get filteredProjectsCount(): number {
    return this.filteredProjects.length;
  }

  // ===== TRACKBY FUNCTION =====
  trackByProjectId(index: number, project: ProjectDto): string {
    return project.id || index.toString();
  }

  // ===== EXPOSE MATH FOR TEMPLATE =====
  Math = Math;
}

// ===== INTERFACES POUR LES MODALS =====
export interface ProjectDetailModalData {
  project: ProjectDto;
  mode: 'view' | 'edit';
}

export interface ProjectDetailModalResult {
  action: 'updated' | 'deleted' | 'cancelled';
  project?: ProjectDto;
}

export interface ProjectStatsModalData {
  project: ProjectDto;
}
