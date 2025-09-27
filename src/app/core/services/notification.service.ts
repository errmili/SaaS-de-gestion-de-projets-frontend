// src/app/core/services/notification.service.ts - CORRECTION DES VRAIES ERREURS TYPESCRIPT
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Observable, timer } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

import { WebSocketService, WebSocketMessage } from './websocket.service';
import { AuthService } from './auth.service';
import { NotificationControllerService } from '../../services/notifications/services/notification-controller.service';
import { UserPreferenceControllerService } from '../../services/notifications/services/user-preference-controller.service';
import { NotificationResponse } from '../../services/notifications/models/notification-response';
import { UserPreference } from '../../services/notifications/models/user-preference';

export interface NotificationCount {
  total: number;
  unread: number;
  tasks: number;
  projects: number;
  mentions: number;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  duration?: number;
  action?: {
    label: string;
    callback: () => void;
  };
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private destroy$ = new Subject<void>();

  // État des notifications
  private notificationsSubject = new BehaviorSubject<NotificationResponse[]>([]);
  private unreadCountSubject = new BehaviorSubject<NotificationCount>({
    total: 0,
    unread: 0,
    tasks: 0,
    projects: 0,
    mentions: 0
  });
  private userPreferencesSubject = new BehaviorSubject<UserPreference | null>(null);
  private toastNotificationsSubject = new BehaviorSubject<ToastNotification[]>([]);

  // Observables publics
  public notifications$ = this.notificationsSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();
  public userPreferences$ = this.userPreferencesSubject.asObservable();
  public toastNotifications$ = this.toastNotificationsSubject.asObservable();

  private currentUserId: number | null = null;
  private isInitialized = false;

  constructor(
    private webSocketService: WebSocketService,
    private authService: AuthService,
    private notificationController: NotificationControllerService,
    private userPreferenceController: UserPreferenceControllerService,
    private snackBar: MatSnackBar
  ) {
    this.initialize();
  }

  /**
   * Initialiser le service de notifications
   */
  private initialize(): void {
    console.log('🔔 Initializing NotificationService...');

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user?.id) {
          this.currentUserId = typeof user.id === 'number' ? user.id : Number(user.id);
          this.loadUserData();
          this.setupWebSocketListeners();
        } else {
          this.cleanup();
        }
      });

    timer(0, 30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.currentUserId && this.isInitialized) {
          this.refreshUnreadCount();
        }
      });
  }

  private loadUserData(): void {
    if (!this.currentUserId) return;

    console.log('📊 Loading user notifications data...');
    this.loadNotifications();
    this.loadUserPreferences();
    this.refreshUnreadCount();
    this.isInitialized = true;
  }

  private setupWebSocketListeners(): void {
    console.log('🔌 Setting up WebSocket listeners...');

    this.webSocketService.messages$
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(message => {
        console.log('📨 Processing WebSocket message:', message);
        this.handleWebSocketMessage(message);
      });

    this.webSocketService.errors$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        console.error('🚨 WebSocket error:', error);
        this.showToast('error', 'Connection Error', 'Real-time notifications temporarily unavailable');
      });

    this.webSocketService.connectionStatus$
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(connected => {
        console.log('🔌 WebSocket connection status:', connected);
        if (connected) {
          this.showToast('success', 'Connected', 'Real-time notifications are now active', 2000);
        }
      });
  }

  private handleWebSocketMessage(message: WebSocketMessage): void {
    const preferences = this.userPreferencesSubject.value;

    if (!this.shouldShowNotification(message.type, preferences)) {
      console.log('🔕 Notification filtered by user preferences:', message.type);
      return;
    }

    const toast = this.createToastFromMessage(message);
    this.showToastNotification(toast);
    this.refreshUnreadCount();

    if (this.shouldRefreshNotificationList(message.type)) {
      this.loadNotifications();
    }

    this.playNotificationSound(preferences);
  }

  private createToastFromMessage(message: WebSocketMessage): ToastNotification {
    const toast: ToastNotification = {
      id: `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: this.getToastTypeFromMessage(message.type),
      title: this.getNotificationTitle(message.type),
      message: this.getNotificationMessage(message),
      timestamp: new Date(message.timestamp),
      duration: 5000
    };

    if (message.taskId || message.projectId) {
      toast.action = {
        label: 'View',
        callback: () => this.navigateToItem(message)
      };
    }

    return toast;
  }

  public showToast(
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    duration: number = 4000,
    action?: { label: string; callback: () => void }
  ): void {
    const toast: ToastNotification = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      timestamp: new Date(),
      duration,
      action
    };

    this.showToastNotification(toast);
  }

  private showToastNotification(toast: ToastNotification): void {
    const currentToasts = this.toastNotificationsSubject.value;
    this.toastNotificationsSubject.next([...currentToasts, toast]);

    const snackBarRef = this.snackBar.open(
      `${toast.title}: ${toast.message}`,
      toast.action ? toast.action.label : 'Close',
      {
        duration: toast.action ? 0 : toast.duration,
        panelClass: [`${toast.type}-snackbar`, 'notification-snackbar'],
        horizontalPosition: 'right',
        verticalPosition: 'top'
      }
    );

    if (toast.action) {
      snackBarRef.onAction().subscribe(() => {
        toast.action!.callback();
        snackBarRef.dismiss();
      });

      setTimeout(() => {
        if (snackBarRef) {
          snackBarRef.dismiss();
        }
      }, 10000);
    }

    snackBarRef.afterDismissed().subscribe(() => {
      this.removeToastNotification(toast.id);
    });
  }

  private removeToastNotification(toastId: string): void {
    const currentToasts = this.toastNotificationsSubject.value;
    const updatedToasts = currentToasts.filter(t => t.id !== toastId);
    this.toastNotificationsSubject.next(updatedToasts);
  }

  /**
   * ✅ CORRECTION ERREUR 1 - getUserNotifications avec pageable
   */
  public loadNotifications(pageNum: number = 0, pageSize: number = 20): void {
    if (!this.currentUserId) return;

    // ✅ CORRECTION selon l'erreur TypeScript : ajouter pageable
    this.notificationController.getUserNotifications({
      userId: this.currentUserId,
      // ✅ Ajout du paramètre pageable comme requis par l'API
      pageable: {
        page: pageNum,
        size: pageSize,
        sort: ['createdAt,desc']
      }
    }).subscribe({
      next: (response) => {
        // response est de type PageNotificationResponse
        if (response && response.content) {
          this.notificationsSubject.next(response.content);
          console.log('✅ Notifications loaded:', response.content.length);
        }
      },
      error: (error) => {
        console.error('❌ Error loading notifications:', error);
      }
    });
  }

  /**
   * ✅ CORRECTION ERREUR 2 - getUnreadCount (pas de changement)
   */
  public refreshUnreadCount(): void {
    if (!this.currentUserId) return;

    this.notificationController.getUnreadCount({
      userId: this.currentUserId
    }).subscribe({
      next: (counts) => {
        const notificationCount: NotificationCount = {
          total: counts['total'] || 0,
          unread: counts['unread'] || 0,
          tasks: counts['tasks'] || 0,
          projects: counts['projects'] || 0,
          mentions: counts['mentions'] || 0
        };

        this.unreadCountSubject.next(notificationCount);
        console.log('✅ Unread counts updated:', notificationCount);
      },
      error: (error) => {
        console.error('❌ Error loading unread count:', error);
      }
    });
  }

  /**
   * ✅ CORRECTION ERREUR 3 - markAsRead avec les bons paramètres
   */
  public markAsRead(notificationId: string): Observable<void> {
    return new Observable(observer => {
      // ✅ CORRECTION selon l'erreur TypeScript
        this.notificationController.markAsRead({
          id: Number(notificationId),
          userId: this.currentUserId! // ✅ AJOUT - userId requis
        }).subscribe({
        next: () => {
          // ✅ CORRECTION ERREUR 4 - Status doit être 'READ' pas 'READ'
          const notifications = this.notificationsSubject.value;
          const updatedNotifications = notifications.map(n =>
            n.id?.toString() === notificationId
              ? {
                  ...n,
                  readAt: new Date().toISOString(),
                  status: 'READ' as const // ✅ 'READ' au lieu de 'read'
                }
              : n
          );
          this.notificationsSubject.next(updatedNotifications);

          this.refreshUnreadCount();

          observer.next();
          observer.complete();
        },
        error: (error) => {
          console.error('❌ Error marking notification as read:', error);
          observer.error(error);
        }
      });
    });
  }

  /**
   * ✅ CORRECTION ERREUR 5 - markAllAsRead
   */
  public markAllAsRead(): Observable<void> {
    if (!this.currentUserId) {
      throw new Error('No current user');
    }

    return new Observable(observer => {
      this.notificationController.markAllAsRead({
        userId: this.currentUserId!
      }).subscribe({
        next: () => {
          // ✅ CORRECTION - Mettre à jour avec les bonnes propriétés
          const notifications = this.notificationsSubject.value;
          const updatedNotifications = notifications.map(n => ({
            ...n,
            readAt: new Date().toISOString(),
            status: 'READ' as const // ✅ 'READ' au lieu de 'read'
          }));
          this.notificationsSubject.next(updatedNotifications);

          this.unreadCountSubject.next({
            total: 0,
            unread: 0,
            tasks: 0,
            projects: 0,
            mentions: 0
          });

          this.showToast('success', 'All Read', 'All notifications marked as read');

          observer.next();
          observer.complete();
        },
        error: (error) => {
          console.error('❌ Error marking all as read:', error);
          this.showToast('error', 'Error', 'Failed to mark all as read');
          observer.error(error);
        }
      });
    });
  }

  /**
   * ✅ CORRECTION ERREUR 6 - loadUserPreferences (pas de changement)
   */
  private loadUserPreferences(): void {
    if (!this.currentUserId) return;

    this.userPreferenceController.getUserPreferences({
      userId: this.currentUserId
    }).subscribe({
      next: (preferences) => {
        this.userPreferencesSubject.next(preferences);
        console.log('✅ User preferences loaded:', preferences);
      },
      error: (error) => {
        console.error('❌ Error loading user preferences:', error);
      }
    });
  }

  // ===== MÉTHODES UTILITAIRES (inchangées) =====

  private shouldShowNotification(type: WebSocketMessage['type'], preferences: UserPreference | null): boolean {
    if (!preferences) return true;

    switch (type) {
      case 'TASK_CREATED':
      case 'TASK_UPDATED':
      case 'TASK_DELETED':
        return preferences.taskUpdated !== false;
      case 'PROJECT_CREATED':
        return preferences.projectInvitation !== false;
      case 'USER_ASSIGNED':
        return preferences.taskAssigned !== false;
      case 'COMMENT_ADDED':
        return preferences.commentMentions !== false;
      default:
        return true;
    }
  }

  private shouldRefreshNotificationList(type: WebSocketMessage['type']): boolean {
    return ['TASK_CREATED', 'PROJECT_CREATED', 'USER_ASSIGNED'].includes(type);
  }

  private getToastTypeFromMessage(type: WebSocketMessage['type']): ToastNotification['type'] {
    switch (type) {
      case 'TASK_CREATED':
      case 'PROJECT_CREATED':
        return 'success';
      case 'TASK_DELETED':
        return 'warning';
      case 'USER_ASSIGNED':
        return 'info';
      default:
        return 'info';
    }
  }

  private getNotificationTitle(type: WebSocketMessage['type']): string {
    switch (type) {
      case 'TASK_CREATED': return 'New Task';
      case 'TASK_UPDATED': return 'Task Updated';
      case 'TASK_DELETED': return 'Task Deleted';
      case 'PROJECT_CREATED': return 'New Project';
      case 'USER_ASSIGNED': return 'New Assignment';
      case 'COMMENT_ADDED': return 'New Comment';
      default: return 'Notification';
    }
  }

  private getNotificationMessage(message: WebSocketMessage): string {
    const data = message.data;

    switch (message.type) {
      case 'TASK_CREATED':
        return `Task "${data?.title || 'Unknown'}" has been created`;
      case 'TASK_UPDATED':
        return `Task "${data?.title || 'Unknown'}" has been updated`;
      case 'TASK_DELETED':
        return `Task "${data?.title || 'Unknown'}" has been deleted`;
      case 'PROJECT_CREATED':
        return `Project "${data?.name || 'Unknown'}" has been created`;
      case 'USER_ASSIGNED':
        return `You have been assigned to "${data?.title || 'Unknown'}"`;
      case 'COMMENT_ADDED':
        return `New comment on "${data?.title || 'Unknown'}"`;
      default:
        return 'You have a new notification';
    }
  }

  private navigateToItem(message: WebSocketMessage): void {
    console.log('🔗 Navigate to item:', message);
  }

  private playNotificationSound(preferences: UserPreference | null): void {
    if (preferences?.websocketNotifications !== false) {
      console.log('🔊 Playing notification sound...');
    }
  }

  private cleanup(): void {
    this.currentUserId = null;
    this.isInitialized = false;
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next({
      total: 0,
      unread: 0,
      tasks: 0,
      projects: 0,
      mentions: 0
    });
    this.userPreferencesSubject.next(null);
    this.toastNotificationsSubject.next([]);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
