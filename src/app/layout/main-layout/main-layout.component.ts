// src/app/layout/main-layout/main-layout.component.ts - VERSION MISE À JOUR
import { Component, OnInit, OnDestroy, ViewChild, HostListener } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';

import { AuthService } from 'src/app/core/services/auth.service';
import { Router } from '@angular/router';
import { CreateProjectModalComponent } from 'src/app/features/dashboard/components/modals/create-project-modal/create-project-modal.component';
import { ProjectControllerService } from '../../services/projects/services/project-controller.service';

// ✅ NOUVEAUX IMPORTS - Services notifications
import { NotificationService } from '../../core/services/notification.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { NotificationCenterComponent } from '../../shared/components/notification-center/notification-center.component';

import { SearchService, SearchResults } from '../../core/services/search.service';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css']
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ✅ NOUVEAU - Référence au NotificationCenter
  @ViewChild(NotificationCenterComponent) notificationCenter!: NotificationCenterComponent;

  // État existant
  projects: any[] = [];

  // ✅ NOUVEAU - État des notifications
  unreadNotificationCount = 0;
  isWebSocketConnected = false;
  notificationError: string | null = null;

  searchControl = new FormControl('');
  searchResults: SearchResults | null = null;
  isSearching = false;
  showSearchResults = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private projectService: ProjectControllerService,
    // ✅ NOUVEAUX SERVICES
    private notificationService: NotificationService,
    private webSocketService: WebSocketService,
    private searchService: SearchService
  ) {}

  ngOnInit(): void {
    this.loadProjects();
    this.initializeNotifications();
    this.setupSearch();
  }

  setupSearch(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => {
          if (!query || query.trim().length < 2) {
            this.searchResults = null;
            this.showSearchResults = false;
            return [];
          }

          this.isSearching = true;
          this.showSearchResults = true;
          return this.searchService.search(query);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (results: any) => {
          this.searchResults = results;
          this.isSearching = false;
        },
        error: (error) => {
          console.error('Search error:', error);
          this.isSearching = false;
        }
      });
  }

    // ✅ AJOUTER cette méthode
  onSearchResultSelected(): void {
    this.showSearchResults = false;
    this.searchControl.setValue('', { emitEvent: false });
  }

  // ✅ AJOUTER cette méthode
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.search-container')) {
      this.showSearchResults = false;
    }
  }

    @HostListener('document:keydown', ['$event'])
      onKeydown(event: KeyboardEvent): void {
        // Ctrl+K pour focus search
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
          event.preventDefault();
          const searchInput = document.querySelector('.search-field input') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
        }

        // Escape pour fermer search
        if (event.key === 'Escape' && this.showSearchResults) {
          this.showSearchResults = false;
          this.searchControl.setValue('', { emitEvent: false });
        }
      }

  // ===== MÉTHODES EXISTANTES (inchangées) =====

  createNewProject(): void {
    const dialogRef = this.dialog.open(CreateProjectModalComponent, {
      width: '600px',
      maxWidth: '90vw'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadProjects();
      }
    });
  }

  loadProjects(): void {
    const token = localStorage.getItem('access_token');
    if (token) {
      this.projectService.getUserProjects({
        Authorization: `Bearer ${token}`
      }).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.projects = response.data;
          }
        },
        error: (error) => {
          console.error('Error loading projects:', error);
        }
      });
    }
  }

  getProjectIcon(projectName: string): string {
    if (projectName.toLowerCase().includes('web')) return 'web-app';
    if (projectName.toLowerCase().includes('mobile')) return 'mobile-app';
    if (projectName.toLowerCase().includes('api')) return 'api-project';
    return 'default-project';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  // ===== NOUVELLES MÉTHODES - NOTIFICATIONS =====

  /**
   * Initialiser le système de notifications
   */
  private initializeNotifications(): void {
    console.log('🔔 Initializing notifications in MainLayout...');

    // Écouter le compteur de notifications non lues
    this.notificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(counts => {
        this.unreadNotificationCount = counts.unread;
        console.log('🔔 Unread count updated:', this.unreadNotificationCount);
      });

    // Écouter le statut de connexion WebSocket
    this.webSocketService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(connected => {
        this.isWebSocketConnected = connected;
        console.log('🔌 WebSocket status:', connected ? 'Connected' : 'Disconnected');
      });

    // Écouter les erreurs WebSocket
    this.webSocketService.errors$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.notificationError = error;
        console.error('🚨 WebSocket error in layout:', error);

        // Effacer l'erreur après 5 secondes
        setTimeout(() => {
          this.notificationError = null;
        }, 5000);
      });

    // Écouter les messages WebSocket pour debug
    this.webSocketService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        console.log('📨 WebSocket message in layout:', message.type);
      });
  }

  /**
   * Ouvrir/fermer le centre de notifications
   */
  toggleNotificationCenter(): void {
    if (this.notificationCenter) {
      if (this.notificationCenter.isOpen) {
        this.notificationCenter.close();
      } else {
        this.notificationCenter.open();
      }
    }
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
   * Marquer toutes les notifications comme lues
   */
  markAllNotificationsAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        console.log('✅ All notifications marked as read from layout');
      },
      error: (error) => {
        console.error('❌ Error marking all as read:', error);
      }
    });
  }

  /**
   * Rafraîchir les notifications
   */
  refreshNotifications(): void {
    this.notificationService.refreshUnreadCount();
    this.notificationService.loadNotifications();
  }

  /**
   * Reconnecter le WebSocket
   */
  reconnectWebSocket(): void {
    console.log('🔄 Manually reconnecting WebSocket...');
    this.webSocketService.disconnect();
    setTimeout(() => {
      this.webSocketService.connect();
    }, 1000);
  }

  /**
   * Obtenir la couleur du badge selon le statut de connexion
   */
  getNotificationBadgeColor(): 'primary' | 'accent' | 'warn' {
    if (!this.isWebSocketConnected && this.unreadNotificationCount > 0) {
      return 'warn'; // Rouge si déconnecté avec notifications
    }
    return 'warn'; // Rouge par défaut pour les notifications
  }

  /**
   * Obtenir le tooltip du bouton notifications
   */
  getNotificationTooltip(): string {
    if (this.notificationError) {
      return 'Notification error - Click to retry';
    }
    if (!this.isWebSocketConnected) {
      return 'Notifications disconnected - Click to reconnect';
    }
    if (this.unreadNotificationCount > 0) {
      return `${this.unreadNotificationCount} unread notification${this.unreadNotificationCount > 1 ? 's' : ''}`;
    }
    return 'No new notifications';
  }

  /**
   * Gérer le clic sur le bouton notifications
   */
  onNotificationButtonClick(): void {
    // Si erreur ou déconnecté, essayer de reconnecter
    if (this.notificationError || !this.isWebSocketConnected) {
      this.reconnectWebSocket();
      this.refreshNotifications();
    } else {
      // Sinon, ouvrir le centre de notifications
      this.toggleNotificationCenter();
    }
  }

  /**
   * Afficher l'indicateur de statut de connexion
   */
  showConnectionStatus(): boolean {
    return !this.isWebSocketConnected || !!this.notificationError;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
