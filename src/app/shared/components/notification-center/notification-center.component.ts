// src/app/shared/components/notification-center/notification-center.component.ts - VERSION CORRIGÉE
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { trigger, state, style, transition, animate } from '@angular/animations';

import { NotificationService } from '../../../core/services/notification.service';
import { NotificationResponse } from '../../../services/notifications/models/notification-response';

@Component({
  selector: 'app-notification-center',
  templateUrl: './notification-center.component.html',
  styleUrls: ['./notification-center.component.css'],
  animations: [
    trigger('slideIn', [
      state('closed', style({
        transform: 'translateX(100%)',
        opacity: 0
      })),
      state('open', style({
        transform: 'translateX(0)',
        opacity: 1
      })),
      transition('closed => open', animate('300ms ease-in-out')),
      transition('open => closed', animate('250ms ease-in-out'))
    ]),
    trigger('fadeIn', [
      state('closed', style({
        opacity: 0,
        pointerEvents: 'none'
      })),
      state('open', style({
        opacity: 1,
        pointerEvents: 'auto'
      })),
      transition('closed => open', animate('200ms ease-in')),
      transition('open => closed', animate('150ms ease-out'))
    ])
  ]
})
export class NotificationCenterComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // État du composant
  isOpen = false;
  isLoading = false;
  isLoadingMore = false;
  hasMoreNotifications = true;

  // Données
  notifications: NotificationResponse[] = [];
  filteredNotifications: NotificationResponse[] = [];
  unreadCount = 0;

  // Filtres
  selectedFilter: 'all' | 'unread' | 'tasks' | 'projects' = 'all';

  // Pagination
  currentPage = 0;
  pageSize = 20;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    // Écouter les notifications
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications = notifications;
        this.applyFilter();
      });

    // Écouter le compteur non lu
    this.notificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(counts => {
        this.unreadCount = counts.unread;
      });
  }

  open(): void {
    this.isOpen = true;
    this.loadNotifications();
  }

  close(): void {
    this.isOpen = false;
  }

  private loadNotifications(): void {
    this.isLoading = true;
    this.currentPage = 0;
    this.notificationService.loadNotifications(this.currentPage, this.pageSize);
    this.isLoading = false;
  }

  loadMore(): void {
    this.isLoadingMore = true;
    this.currentPage++;
    setTimeout(() => {
      this.notificationService.loadNotifications(this.currentPage, this.pageSize);
      this.isLoadingMore = false;
      if (this.notifications.length >= (this.currentPage + 1) * this.pageSize) {
        this.hasMoreNotifications = false;
      }
    }, 1000);
  }

  refresh(): void {
    this.loadNotifications();
    this.notificationService.refreshUnreadCount();
  }

  private applyFilter(): void {
    switch (this.selectedFilter) {
      case 'unread':
        this.filteredNotifications = this.notifications.filter(n => this.isNotificationUnread(n));
        break;
      case 'tasks':
        this.filteredNotifications = this.notifications.filter(n =>
          n.type?.includes('TASK') || n.taskId !== undefined
        );
        break;
      case 'projects':
        this.filteredNotifications = this.notifications.filter(n =>
          n.type?.includes('PROJECT') || n.projectId !== undefined
        );
        break;
      case 'all':
      default:
        this.filteredNotifications = [...this.notifications];
        break;
    }
  }

  // ✅ CORRECTION IMPORTANTE - Changer la signature pour recevoir la valeur directement
  onFilterChange(newFilter: 'all' | 'unread' | 'tasks' | 'projects'): void {
    this.selectedFilter = newFilter;
    this.applyFilter();
  }

  isNotificationUnread(notification: NotificationResponse): boolean {
    return !notification.readAt && notification.status !== 'READ';
  }

  markAsRead(notification: NotificationResponse, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (!notification.id || this.isNotificationUnread(notification) === false) return;

    this.notificationService.markAsRead(notification.id.toString()).subscribe({
      next: () => console.log('✅ Notification marked as read'),
      error: (error) => console.error('❌ Error marking notification as read:', error)
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => console.log('✅ All notifications marked as read'),
      error: (error) => console.error('❌ Error marking all as read:', error)
    });
  }

  onNotificationClick(notification: NotificationResponse): void {
    if (this.isNotificationUnread(notification)) {
      this.markAsRead(notification);
    }
    this.viewDetails(notification);
  }

  viewDetails(notification: NotificationResponse): void {
    console.log('📖 View notification details:', notification);
    this.close();
  }

  deleteNotification(notification: NotificationResponse): void {
    console.log('🗑️ Delete notification:', notification);
  }

  trackByNotificationId(index: number, notification: NotificationResponse): string {
    return notification.id?.toString() || index.toString();
  }

  getNotificationIcon(type?: string): string {
    switch (type) {
      case 'TASK_ASSIGNED': return 'assignment_ind';
      case 'TASK_UPDATED': return 'edit_note';
      case 'TASK_COMPLETED': return 'task_alt';
      case 'PROJECT_INVITATION': return 'group_add';
      case 'PROJECT_UPDATED': return 'folder_open';
      case 'DEADLINE_REMINDER': return 'schedule';
      case 'COMMENT_ADDED': return 'comment';
      case 'MENTION': return 'alternate_email';
      case 'SYSTEM_ANNOUNCEMENT': return 'campaign';
      default: return 'notifications';
    }
  }

  getNotificationIconClass(type?: string): string {
    switch (type) {
      case 'TASK_ASSIGNED': return 'task-assigned';
      case 'TASK_UPDATED': return 'task-updated';
      case 'TASK_COMPLETED': return 'task-completed';
      case 'PROJECT_INVITATION': return 'project-invitation';
      case 'PROJECT_UPDATED': return 'project-updated';
      case 'DEADLINE_REMINDER': return 'deadline-reminder';
      case 'COMMENT_ADDED': return 'comment-added';
      case 'MENTION': return 'mention';
      case 'SYSTEM_ANNOUNCEMENT': return 'system-announcement';
      default: return 'default';
    }
  }

  getTimeAgo(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
