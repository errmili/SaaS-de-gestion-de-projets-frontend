// src/app/core/services/user-preferences.service.ts - VERSION CORRIGÉE
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';

import { UserPreferenceControllerService } from '../../services/notifications/services/user-preference-controller.service';
import { UserPreference } from '../../services/notifications/models/user-preference';
import { AuthService } from './auth.service';

export interface NotificationPreferences {
  // Préférences générales
  emailNotifications: boolean;
  pushNotifications: boolean;
  websocketNotifications: boolean;

  // Préférences par type de notification
  taskAssigned: boolean;
  taskUpdated: boolean;
  taskCompleted: boolean;
  taskDeleted: boolean;

  // Préférences projets
  projectInvitation: boolean;
  projectUpdated: boolean;
  projectDeleted: boolean;

  // Préférences collaboration
  commentMentions: boolean;
  directMessages: boolean;
  teamUpdates: boolean;

  // Préférences timing
  deadlineReminder: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;

  // Préférences affichage
  soundEnabled: boolean;
  showDesktopNotifications: boolean;
  notificationDuration: number; // en secondes

  // Préférences avancées
  quietHours: {
    enabled: boolean;
    startTime: string; // Format HH:mm
    endTime: string;   // Format HH:mm
  };
  weekendNotifications: boolean;
  vacationMode: boolean;
}

export interface NotificationFilters {
  projects: string[]; // IDs des projets à suivre
  users: string[];    // IDs des utilisateurs à suivre
  priorities: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[];
  taskTypes: ('TASK' | 'BUG' | 'STORY' | 'EPIC' | 'SUBTASK')[];
}

@Injectable({
  providedIn: 'root'
})
export class UserPreferencesService {
  private currentUserId: number | null = null;
  private preferencesSubject = new BehaviorSubject<NotificationPreferences | null>(null);
  private filtersSubject = new BehaviorSubject<NotificationFilters | null>(null);

  // Observables publics
  public preferences$ = this.preferencesSubject.asObservable();
  public filters$ = this.filtersSubject.asObservable();

  // Préférences par défaut
  private defaultPreferences: NotificationPreferences = {
    // Général
    emailNotifications: true,
    pushNotifications: true,
    websocketNotifications: true,

    // Tâches
    taskAssigned: true,
    taskUpdated: true,
    taskCompleted: true,
    taskDeleted: false,

    // Projets
    projectInvitation: true,
    projectUpdated: true,
    projectDeleted: true,

    // Collaboration
    commentMentions: true,
    directMessages: true,
    teamUpdates: false,

    // Timing
    deadlineReminder: true,
    dailyDigest: true,
    weeklyReport: false,

    // Affichage
    soundEnabled: true,
    showDesktopNotifications: true,
    notificationDuration: 5,

    // Avancé
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00'
    },
    weekendNotifications: false,
    vacationMode: false
  };

  private defaultFilters: NotificationFilters = {
    projects: [],
    users: [],
    priorities: ['MEDIUM', 'HIGH', 'CRITICAL'],
    taskTypes: ['TASK', 'BUG', 'STORY', 'EPIC']
  };

  constructor(
    private userPreferenceController: UserPreferenceControllerService,
    private authService: AuthService
  ) {
    this.initializeService();
  }

  /**
   * Initialiser le service
   */
  private initializeService(): void {
    // Écouter les changements d'utilisateur
    this.authService.currentUser$.subscribe(user => {
      if (user?.id) {
        this.currentUserId = typeof user.id === 'number' ? user.id : Number(user.id);
        this.loadUserPreferences();
      } else {
        this.currentUserId = null;
        this.preferencesSubject.next(null);
        this.filtersSubject.next(null);
      }
    });
  }

  /**
   * Charger les préférences utilisateur
   */
  public loadUserPreferences(): Observable<NotificationPreferences> {
    if (!this.currentUserId) {
      console.log('No current user, using default preferences');
      this.preferencesSubject.next(this.defaultPreferences);
      this.filtersSubject.next(this.defaultFilters);
      return of(this.defaultPreferences);
    }

    const token = this.authService.getToken();
    if (!token) {
      console.log('No token, using default preferences');
      this.preferencesSubject.next(this.defaultPreferences);
      return of(this.defaultPreferences);
    }

    // ✅ CORRECTION - Supprimer le paramètre Authorization
    return this.userPreferenceController.getUserPreferences({
      userId: this.currentUserId
      // ✅ RETIRÉ - Authorization: `Bearer ${token}`
    }).pipe(
      map(apiPreferences => this.mapApiToLocalPreferences(apiPreferences)),
      tap(preferences => {
        console.log('✅ User preferences loaded:', preferences);
        this.preferencesSubject.next(preferences);
        this.loadUserFilters(); // Charger aussi les filtres
      }),
      catchError(error => {
        console.error('❌ Error loading user preferences:', error);
        this.preferencesSubject.next(this.defaultPreferences);
        return of(this.defaultPreferences);
      })
    );
  }

  /**
   * Sauvegarder les préférences utilisateur
   */
  public saveUserPreferences(preferences: Partial<NotificationPreferences>): Observable<NotificationPreferences> {
    if (!this.currentUserId) {
      console.error('No current user to save preferences');
      return of(this.defaultPreferences);
    }

    const token = this.authService.getToken();
    if (!token) {
      console.error('No token to save preferences');
      return of(this.defaultPreferences);
    }

    // Merger avec les préférences actuelles
    const currentPreferences = this.preferencesSubject.value || this.defaultPreferences;
    const updatedPreferences = { ...currentPreferences, ...preferences };

    // Convertir en format API
    const apiPreferences = this.mapLocalToApiPreferences(updatedPreferences);

    // ✅ CORRECTION - Supprimer le paramètre Authorization
    return this.userPreferenceController.updateUserPreferences({
      userId: this.currentUserId,
      body: apiPreferences
      // ✅ RETIRÉ - Authorization: `Bearer ${token}`
    }).pipe(
      map(apiResponse => this.mapApiToLocalPreferences(apiResponse)),
      tap(savedPreferences => {
        console.log('✅ User preferences saved:', savedPreferences);
        this.preferencesSubject.next(savedPreferences);
      }),
      catchError(error => {
        console.error('❌ Error saving user preferences:', error);
        return of(updatedPreferences);
      })
    );
  }

  /**
   * Réinitialiser aux préférences par défaut
   */
  public resetToDefaults(): Observable<NotificationPreferences> {
    if (!this.currentUserId) {
      this.preferencesSubject.next(this.defaultPreferences);
      return of(this.defaultPreferences);
    }

    const token = this.authService.getToken();
    if (!token) {
      this.preferencesSubject.next(this.defaultPreferences);
      return of(this.defaultPreferences);
    }

    // ✅ CORRECTION - Supprimer le paramètre Authorization
    return this.userPreferenceController.resetToDefaults({
      userId: this.currentUserId
      // ✅ RETIRÉ - Authorization: `Bearer ${token}`
    }).pipe(
      map(apiResponse => this.mapApiToLocalPreferences(apiResponse)),
      tap(preferences => {
        console.log('✅ Preferences reset to defaults:', preferences);
        this.preferencesSubject.next(preferences);
      }),
      catchError(error => {
        console.error('❌ Error resetting preferences:', error);
        this.preferencesSubject.next(this.defaultPreferences);
        return of(this.defaultPreferences);
      })
    );
  }

  // ===== MÉTHODES DE CONVENANCE =====

  /**
   * Obtenir les préférences actuelles
   */
  public getCurrentPreferences(): NotificationPreferences {
    return this.preferencesSubject.value || this.defaultPreferences;
  }

  /**
   * Obtenir les filtres actuels
   */
  public getCurrentFilters(): NotificationFilters {
    return this.filtersSubject.value || this.defaultFilters;
  }

  /**
   * Vérifier si les notifications sont activées
   */
  public areNotificationsEnabled(): boolean {
    const prefs = this.getCurrentPreferences();
    return prefs.websocketNotifications || prefs.pushNotifications || prefs.emailNotifications;
  }

  /**
   * Vérifier si un type de notification est activé
   */
  public isNotificationTypeEnabled(type: keyof NotificationPreferences): boolean {
    const prefs = this.getCurrentPreferences();
    return Boolean(prefs[type]);
  }

  /**
   * Vérifier si on est en heures silencieuses
   */
  public isInQuietHours(): boolean {
    const prefs = this.getCurrentPreferences();

    if (!prefs.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = prefs.quietHours.startTime.split(':').map(Number);
    const [endHour, endMin] = prefs.quietHours.endTime.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      // Même jour (ex: 22:00 - 08:00 le lendemain)
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Span sur deux jours (ex: 22:00 - 08:00)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Vérifier si on doit afficher les notifications le weekend
   */
  public shouldShowWeekendNotifications(): boolean {
    const prefs = this.getCurrentPreferences();
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6; // Dimanche ou Samedi

    return !isWeekend || prefs.weekendNotifications;
  }

  /**
   * Vérifier si on est en mode vacances
   */
  public isVacationModeEnabled(): boolean {
    const prefs = this.getCurrentPreferences();
    return prefs.vacationMode;
  }

  /**
   * Vérifier si une notification doit être affichée selon les préférences
   */
  public shouldShowNotification(
    type: string,
    projectId?: string,
    priority?: string,
    taskType?: string
  ): boolean {
    const prefs = this.getCurrentPreferences();
    const filters = this.getCurrentFilters();

    // Mode vacances = aucune notification
    if (prefs.vacationMode) {
      return false;
    }

    // Heures silencieuses
    if (this.isInQuietHours()) {
      return false;
    }

    // Weekend
    if (!this.shouldShowWeekendNotifications()) {
      return false;
    }

    // Vérifier les filtres de projet
    if (projectId && filters.projects.length > 0 && !filters.projects.includes(projectId)) {
      return false;
    }

    // Vérifier les filtres de priorité
    if (priority && !filters.priorities.includes(priority as any)) {
      return false;
    }

    // Vérifier les filtres de type de tâche
    if (taskType && !filters.taskTypes.includes(taskType as any)) {
      return false;
    }

    // Vérifier le type de notification
    switch (type) {
      case 'TASK_ASSIGNED':
        return prefs.taskAssigned;
      case 'TASK_UPDATED':
        return prefs.taskUpdated;
      case 'TASK_COMPLETED':
        return prefs.taskCompleted;
      case 'TASK_DELETED':
        return prefs.taskDeleted;
      case 'PROJECT_INVITATION':
        return prefs.projectInvitation;
      case 'PROJECT_UPDATED':
        return prefs.projectUpdated;
      case 'COMMENT_ADDED':
      case 'MENTION':
        return prefs.commentMentions;
      case 'DEADLINE_REMINDER':
        return prefs.deadlineReminder;
      default:
        return true; // Par défaut, afficher les types non reconnus
    }
  }

  // ===== GESTION DES FILTRES =====

  /**
   * Charger les filtres utilisateur (simulation locale)
   */
  private loadUserFilters(): void {
    // Pour l'instant, utiliser localStorage comme stockage temporaire
    const filtersKey = `notification_filters_${this.currentUserId}`;
    const storedFilters = localStorage.getItem(filtersKey);

    if (storedFilters) {
      try {
        const filters = JSON.parse(storedFilters);
        this.filtersSubject.next({ ...this.defaultFilters, ...filters });
      } catch (error) {
        console.error('Error parsing stored filters:', error);
        this.filtersSubject.next(this.defaultFilters);
      }
    } else {
      this.filtersSubject.next(this.defaultFilters);
    }
  }

  /**
   * Sauvegarder les filtres utilisateur
   */
  public saveUserFilters(filters: Partial<NotificationFilters>): void {
    const currentFilters = this.getCurrentFilters();
    const updatedFilters = { ...currentFilters, ...filters };

    // Sauvegarder dans localStorage
    const filtersKey = `notification_filters_${this.currentUserId}`;
    localStorage.setItem(filtersKey, JSON.stringify(updatedFilters));

    this.filtersSubject.next(updatedFilters);
    console.log('✅ User filters saved:', updatedFilters);
  }

  // ===== MAPPERS API ⟷ LOCAL =====

  /**
   * Convertir les préférences API vers le format local
   */
  private mapApiToLocalPreferences(apiPrefs: UserPreference): NotificationPreferences {
    return {
      // Général (mapping direct depuis l'API)
      emailNotifications: apiPrefs.emailNotifications ?? this.defaultPreferences.emailNotifications,
      pushNotifications: apiPrefs.pushNotifications ?? this.defaultPreferences.pushNotifications,
      websocketNotifications: apiPrefs.websocketNotifications ?? this.defaultPreferences.websocketNotifications,

      // Tâches (mapping depuis l'API)
      taskAssigned: apiPrefs.taskAssigned ?? this.defaultPreferences.taskAssigned,
      taskUpdated: apiPrefs.taskUpdated ?? this.defaultPreferences.taskUpdated,
      taskCompleted: true, // Pas dans l'API, utiliser défaut
      taskDeleted: false,  // Pas dans l'API, utiliser défaut

      // Projets
      projectInvitation: apiPrefs.projectInvitation ?? this.defaultPreferences.projectInvitation,
      projectUpdated: true, // Pas dans l'API, utiliser défaut
      projectDeleted: true, // Pas dans l'API, utiliser défaut

      // Collaboration
      commentMentions: apiPrefs.commentMentions ?? this.defaultPreferences.commentMentions,
      directMessages: true, // Pas dans l'API, utiliser défaut
      teamUpdates: false,   // Pas dans l'API, utiliser défaut

      // Timing
      deadlineReminder: apiPrefs.deadlineReminder ?? this.defaultPreferences.deadlineReminder,
      dailyDigest: true,    // Pas dans l'API, utiliser défaut
      weeklyReport: false,  // Pas dans l'API, utiliser défaut

      // Affichage (utiliser défauts car pas dans l'API)
      soundEnabled: this.defaultPreferences.soundEnabled,
      showDesktopNotifications: this.defaultPreferences.showDesktopNotifications,
      notificationDuration: this.defaultPreferences.notificationDuration,

      // Avancé (utiliser défauts car pas dans l'API)
      quietHours: this.defaultPreferences.quietHours,
      weekendNotifications: this.defaultPreferences.weekendNotifications,
      vacationMode: this.defaultPreferences.vacationMode
    };
  }

  /**
   * Convertir les préférences locales vers le format API
   */
  private mapLocalToApiPreferences(localPrefs: NotificationPreferences): UserPreference {
    return {
      emailNotifications: localPrefs.emailNotifications,
      pushNotifications: localPrefs.pushNotifications,
      websocketNotifications: localPrefs.websocketNotifications,
      taskAssigned: localPrefs.taskAssigned,
      taskUpdated: localPrefs.taskUpdated,
      projectInvitation: localPrefs.projectInvitation,
      commentMentions: localPrefs.commentMentions,
      deadlineReminder: localPrefs.deadlineReminder
    };
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * Basculer une préférence booléenne
   */
  public togglePreference(key: keyof NotificationPreferences): Observable<NotificationPreferences> {
    const currentPrefs = this.getCurrentPreferences();
    const currentValue = currentPrefs[key];

    if (typeof currentValue === 'boolean') {
      return this.saveUserPreferences({ [key]: !currentValue } as Partial<NotificationPreferences>);
    } else {
      console.error(`Cannot toggle non-boolean preference: ${key}`);
      return of(currentPrefs);
    }
  }

  /**
   * Exporter les préférences
   */
  public exportPreferences(): string {
    const data = {
      preferences: this.getCurrentPreferences(),
      filters: this.getCurrentFilters(),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Importer les préférences
   */
  public importPreferences(jsonData: string): Observable<NotificationPreferences> {
    try {
      const data = JSON.parse(jsonData);

      if (data.preferences) {
        console.log('Importing preferences:', data.preferences);
        return this.saveUserPreferences(data.preferences);
      } else {
        throw new Error('Invalid preferences format');
      }
    } catch (error) {
      console.error('Error importing preferences:', error);
      return of(this.getCurrentPreferences());
    }
  }
}
