import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { UserControllerService } from '../../../../services/auth/services/user-controller.service';
import { TenantControllerService } from '../../../../services/auth/services/tenant-controller.service';
import { UserDto } from '../../../../services/auth/models/user-dto';
import { TenantDto } from '../../../../services/auth/models/tenant-dto';
import { AuthService } from '../../../../core/services/auth.service';
import { TeamMemberDetailComponent } from '../team-member-detail/team-member-detail.component';

@Component({
  selector: 'app-team-page',
  templateUrl: './team-page.component.html',
  styleUrls: ['./team-page.component.css']
})
export class TeamPageComponent implements OnInit {
  teamMembers: UserDto[] = [];
  filteredMembers: UserDto[] = [];
  currentTenant: TenantDto | null = null;
  currentUser: UserDto | null = null;

  isLoading = false;
  searchQuery = '';
  selectedRole = 'all';

  roles = [
    { value: 'all', label: 'All Roles' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'USER', label: 'User' }
  ];

  constructor(
    private userController: UserControllerService,
    private tenantController: TenantControllerService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadTenantInfo();
    this.loadTeamMembers();
  }

  loadCurrentUser(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  loadTenantInfo(): void {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    this.tenantController.getCurrentTenant().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.currentTenant = response.data;
        }
      },
      error: (error) => {
        console.error('Error loading tenant info:', error);
      }
    });
  }

  loadTeamMembers(): void {
    this.isLoading = true;
    const token = localStorage.getItem('access_token');

    if (!token) {
      this.snackBar.open('Authentication required', 'Close', { duration: 3000 });
      this.isLoading = false;
      return;
    }

    this.userController.getAllUsers({
      Authorization: `Bearer ${token}`
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.teamMembers = response.data;
          this.applyFilters();
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading team members:', error);

        if (error.status === 403) {
          this.snackBar.open('You do not have permission to view team members', 'Close', { duration: 4000 });
        } else {
          this.snackBar.open('Error loading team members', 'Close', { duration: 3000 });
        }
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.teamMembers];

    // Filter by search query
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(member =>
        member.fullName?.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query) ||
        member.firstName?.toLowerCase().includes(query) ||
        member.lastName?.toLowerCase().includes(query)
      );
    }

    // Filter by role
    if (this.selectedRole !== 'all') {
      filtered = filtered.filter(member =>
        member.roles?.includes(this.selectedRole)
      );
    }

    this.filteredMembers = filtered;
  }

  onSearch(): void {
    this.applyFilters();
  }

  onRoleFilterChange(): void {
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilters();
  }

  openMemberDetails(member: UserDto): void {
    const dialogRef = this.dialog.open(TeamMemberDetailComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: {
        member: member,
        currentUser: this.currentUser
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.action === 'updated' || result?.action === 'deactivated') {
        this.loadTeamMembers();
      }
    });
  }

  refreshTeam(): void {
    this.loadTeamMembers();
    this.loadTenantInfo();
  }

  canManageTeam(): boolean {
    return this.currentUser?.roles?.includes('ADMIN') ||
           this.currentUser?.roles?.includes('MANAGER') || false;
  }

  getRoleIcon(roles?: string[]): string {
    if (!roles || roles.length === 0) return 'person';
    if (roles.includes('ADMIN')) return 'admin_panel_settings';
    if (roles.includes('MANAGER')) return 'manage_accounts';
    return 'person';
  }

  getRoleBadgeColor(role: string): string {
    switch (role) {
      case 'ADMIN': return 'role-admin';
      case 'MANAGER': return 'role-manager';
      case 'USER': return 'role-user';
      default: return '';
    }
  }

  getUsagePercentage(): number {
    if (!this.currentTenant) return 0;
    return Math.round((this.currentTenant.currentUsers || 0) / (this.currentTenant.maxUsers || 1) * 100);
  }

  getUsageColorClass(): string {
    const percentage = this.getUsagePercentage();
    if (percentage >= 90) return 'usage-critical';
    if (percentage >= 75) return 'usage-warning';
    return 'usage-normal';
  }
}
