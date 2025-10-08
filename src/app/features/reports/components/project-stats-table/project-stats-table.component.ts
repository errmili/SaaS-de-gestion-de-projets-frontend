import { Component, Input, OnChanges } from '@angular/core';
import { ProjectDto } from '../../../../services/projects/models/project-dto';
import { TaskDto } from '../../../../services/projects/models/task-dto';

interface ProjectStats {
  project: ProjectDto;
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  doneTasks: number;
  completionRate: number;
}

@Component({
  selector: 'app-project-stats-table',
  templateUrl: './project-stats-table.component.html',
  styleUrls: ['./project-stats-table.component.css']
})
export class ProjectStatsTableComponent implements OnChanges {
  @Input() projects: ProjectDto[] = [];
  @Input() tasks: TaskDto[] = [];

  projectStats: ProjectStats[] = [];
  displayedColumns = ['project', 'total', 'todo', 'inProgress', 'done', 'completion'];

  ngOnChanges(): void {
    this.calculateStats();
  }

  calculateStats(): void {
    this.projectStats = this.projects.map(project => {
      const projectTasks = this.tasks.filter(t => t.projectId === project.id);
      const totalTasks = projectTasks.length;
      const doneTasks = projectTasks.filter(t => t.status === 'DONE').length;

      return {
        project,
        totalTasks,
        todoTasks: projectTasks.filter(t => t.status === 'TODO').length,
        inProgressTasks: projectTasks.filter(t => t.status === 'IN_PROGRESS').length,
        doneTasks,
        completionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
      };
    });
  }

  getProgressBarColor(rate: number): string {
    if (rate >= 75) return 'accent';
    if (rate >= 50) return 'primary';
    return 'warn';
  }
}
