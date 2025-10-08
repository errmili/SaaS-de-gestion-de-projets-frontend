import { Component, Input, Output, EventEmitter } from '@angular/core';
import { UserDto } from '../../../../services/auth/models/user-dto';

@Component({
  selector: 'app-team-list',
  templateUrl: './team-list.component.html',
  styleUrls: ['./team-list.component.css']
})
export class TeamListComponent {
  @Input() members: UserDto[] = [];
  @Input() currentUser: UserDto | null = null;
  @Output() memberClicked = new EventEmitter<UserDto>();

  onMemberClick(member: UserDto): void {
    this.memberClicked.emit(member);
  }

  getAvatarUrl(member: UserDto): string {
    if (member.avatarUrl) {
      return member.avatarUrl;
    }
    return this.getDefaultAvatar(member);
  }

  getDefaultAvatar(member: UserDto): string {
    const firstName = member.firstName || 'U';
    const lastName = member.lastName || 'N';
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    return `https://ui-avatars.com/api/?name=${initials}&background=5d4e75&color=fff&size=200`;
  }

  getRoleBadgeColor(role: string): string {
    switch (role) {
      case 'ADMIN': return 'role-admin';
      case 'MANAGER': return 'role-manager';
      case 'USER': return 'role-user';
      default: return '';
    }
  }

  getRoleIcon(roles?: string[]): string {
    if (!roles || roles.length === 0) return 'person';
    if (roles.includes('ADMIN')) return 'admin_panel_settings';
    if (roles.includes('MANAGER')) return 'manage_accounts';
    return 'person';
  }

  isCurrentUser(member: UserDto): boolean {
    return member.id === this.currentUser?.id;
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }
}
