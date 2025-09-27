// // src/app/core/services/websocket.service.ts - VERSION CORRIGÉE
// import { Injectable, OnDestroy } from '@angular/core';
// import { BehaviorSubject, Subject } from 'rxjs';
// import { takeUntil } from 'rxjs/operators';
// import * as SockJS from 'sockjs-client';
// import { Client, Frame, IMessage } from '@stomp/stompjs';

// export interface WebSocketMessage {
//   type: string;
//   timestamp: string;
//   data?: any;
//   userId?: string;
//   projectId?: string;
//   taskId?: string;
// }

// export interface ConnectionStatus {
//   connected: boolean;
//   lastConnected?: Date;
//   reconnectAttempts: number;
//   latency?: number;
// }

// @Injectable({
//   providedIn: 'root'
// })
// export class WebSocketService implements OnDestroy {
//   private destroy$ = new Subject<void>();
//   private stompClient: Client | null = null;
//   private reconnectAttempts = 0;
//   private maxReconnectAttempts = 10;
//   private reconnectInterval = 3000;
//   private isManualDisconnect = false;
//   private reconnectTimer: any = null;

//   // Subjects pour les observables
//   private messagesSubject = new Subject<WebSocketMessage>();
//   private connectionStatusSubject = new BehaviorSubject<boolean>(false);
//   private errorsSubject = new Subject<string>();
//   private connectionInfoSubject = new BehaviorSubject<ConnectionStatus>({
//     connected: false,
//     reconnectAttempts: 0
//   });

//   // Observables publics
//   public messages$ = this.messagesSubject.asObservable();
//   public connectionStatus$ = this.connectionStatusSubject.asObservable();
//   public errors$ = this.errorsSubject.asObservable();
//   public connectionInfo$ = this.connectionInfoSubject.asObservable();

//   // Configuration
//   private readonly wsUrl = 'http://localhost:8084/ws'; // ✅ Ton endpoint backend
//   private currentUserId: string | null = null;

//   constructor() {
//     console.log('🔌 WebSocket STOMP Service initialized');

//     // Récupérer l'ID utilisateur depuis le localStorage ou token
//     this.initializeUserId();

//     // Démarrer la connexion
//     this.connect();

//     // Gérer la visibilité de la page
//     this.setupPageVisibilityHandling();
//   }

//   /**
//    * Initialiser l'ID utilisateur
//    */
//   private initializeUserId(): void {
//     // Tu peux adapter selon ton système d'auth
//     const token = localStorage.getItem('access_token');
//     if (token) {
//       // Pour les tests, utiliser un ID fixe
//       this.currentUserId = '1'; // ✅ Adapte selon ton système
//       console.log('🔌 WebSocket initialized for user:', this.currentUserId);
//     }
//   }

//   /**
//    * Établir la connexion STOMP
//    */
//   public connect(): void {
//     if (this.stompClient?.connected) {
//       console.log('🔌 STOMP already connected');
//       return;
//     }

//     this.isManualDisconnect = false;
//     console.log(`🔌 Attempting STOMP connection (attempt ${this.reconnectAttempts + 1})`);

//     try {
//       // Créer client STOMP avec SockJS
//       this.stompClient = new Client({
//         webSocketFactory: () => new SockJS(this.wsUrl),

//         // Configuration de connexion
//         connectHeaders: {
//           'userId': this.currentUserId || 'anonymous'
//         },

//         // ✅ CORRIGÉ - Configuration de reconnexion (sans maxReconnectAttempts)
//         reconnectDelay: this.reconnectInterval,

//         // Heartbeat
//         heartbeatIncoming: 4000,
//         heartbeatOutgoing: 4000,

//         // Callbacks
//         onConnect: this.onConnect.bind(this),
//         onDisconnect: this.onDisconnect.bind(this),
//         onStompError: this.onError.bind(this),
//         onWebSocketError: this.onWebSocketError.bind(this),

//         // Debug (désactiver en production)
//         debug: (str) => {
//           console.log('🔌 STOMP Debug:', str);
//         }
//       });

//       // ✅ CORRIGÉ - Désactiver la reconnexion automatique pour la gérer manuellement
//       this.stompClient.reconnectDelay = 0; // Désactive la reconnexion auto

//       // Activer la connexion
//       this.stompClient.activate();

//     } catch (error) {
//       console.error('❌ STOMP connection error:', error);
//       this.handleReconnect();
//     }
//   }

//   /**
//    * Callback de connexion réussie
//    */
//   private onConnect(frame: Frame): void {
//     console.log('✅ STOMP connected successfully');
//     this.reconnectAttempts = 0;
//     this.reconnectInterval = 3000;

//     // Arrêter le timer de reconnexion s'il existe
//     if (this.reconnectTimer) {
//       clearTimeout(this.reconnectTimer);
//       this.reconnectTimer = null;
//     }

//     this.updateConnectionStatus(true);
//     this.updateConnectionInfo({
//       connected: true,
//       lastConnected: new Date(),
//       reconnectAttempts: 0
//     });

//     // S'abonner aux notifications personnelles
//     this.subscribeToPersonalNotifications();

//     // S'abonner aux notifications de projets si nécessaire
//     this.subscribeToProjectNotifications();

//     // Envoyer message de connexion
//     this.sendConnectionMessage();
//   }

//   /**
//    * S'abonner aux notifications personnelles
//    */
//   private subscribeToPersonalNotifications(): void {
//     if (!this.stompClient || !this.currentUserId) return;

//     // S'abonner à la queue personnelle
//     this.stompClient.subscribe(`/user/queue/notifications`, (message: IMessage) => {
//       this.handleMessage(message);
//     });

//     console.log('📬 Subscribed to personal notifications for user:', this.currentUserId);
//   }

//   /**
//    * S'abonner aux notifications de projets
//    */
//   private subscribeToProjectNotifications(): void {
//     if (!this.stompClient) return;

//     // S'abonner aux topics publics
//     this.stompClient.subscribe('/topic/public', (message: IMessage) => {
//       this.handleMessage(message);
//     });

//     console.log('📢 Subscribed to public notifications');
//   }

//   /**
//    * Traiter les messages reçus
//    */
//   private handleMessage(message: IMessage): void {
//     try {
//       const parsedMessage = JSON.parse(message.body);
//       console.log('📨 STOMP message received:', parsedMessage);

//       // Transformer en format WebSocketMessage
//       const webSocketMessage: WebSocketMessage = {
//         type: parsedMessage.type || 'NOTIFICATION',
//         timestamp: parsedMessage.timestamp || new Date().toISOString(),
//         data: parsedMessage,
//         userId: parsedMessage.userId,
//         projectId: parsedMessage.projectId,
//         taskId: parsedMessage.taskId
//       };

//       // Émettre le message
//       this.messagesSubject.next(webSocketMessage);

//     } catch (error) {
//       console.error('❌ Error parsing STOMP message:', error);
//       this.errorsSubject.next('Invalid message format received');
//     }
//   }

//   /**
//    * Envoyer message de connexion
//    */
//   private sendConnectionMessage(): void {
//     if (!this.stompClient?.connected || !this.currentUserId) return;

//     try {
//       this.stompClient.publish({
//         destination: '/app/notification.connect',
//         body: JSON.stringify({
//           userId: this.currentUserId,
//           type: 'CONNECT',
//           timestamp: new Date().toISOString()
//         })
//       });

//       console.log('📤 Connection message sent');
//     } catch (error) {
//       console.error('❌ Error sending connection message:', error);
//     }
//   }

//   /**
//    * Callback de déconnexion
//    */
//   private onDisconnect(frame: Frame): void {
//     console.log('🔌 STOMP disconnected:', frame);
//     this.updateConnectionStatus(false);

//     if (!this.isManualDisconnect) {
//       this.handleReconnect();
//     }
//   }

//   /**
//    * Callback d'erreur STOMP
//    */
//   private onError(frame: Frame): void {
//     console.error('❌ STOMP error:', frame);
//     this.errorsSubject.next(`STOMP error: ${frame.headers['message'] || 'Unknown error'}`);

//     // Déclencher une reconnexion en cas d'erreur
//     if (!this.isManualDisconnect) {
//       this.handleReconnect();
//     }
//   }

//   /**
//    * Callback d'erreur WebSocket
//    */
//   private onWebSocketError(event: Event): void {
//     console.error('❌ WebSocket error:', event);
//     this.errorsSubject.next('WebSocket connection error');
//   }

//   /**
//    * ✅ CORRIGÉ - Gestion manuelle de la reconnexion
//    */
//   private handleReconnect(): void {
//     if (this.isManualDisconnect) {
//       console.log('ℹ️ Manual disconnect, skipping reconnection');
//       return;
//     }

//     if (this.reconnectAttempts >= this.maxReconnectAttempts) {
//       console.log('❌ Max reconnection attempts reached');
//       this.errorsSubject.next(`Failed to reconnect after ${this.maxReconnectAttempts} attempts`);
//       return;
//     }

//     this.reconnectAttempts++;
//     const delay = Math.min(this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1), 30000);

//     console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

//     this.updateConnectionInfo({
//       connected: false,
//       reconnectAttempts: this.reconnectAttempts
//     });

//     // Nettoyer l'ancien timer
//     if (this.reconnectTimer) {
//       clearTimeout(this.reconnectTimer);
//     }

//     // Programmer la reconnexion
//     this.reconnectTimer = setTimeout(() => {
//       if (!this.isManualDisconnect) {
//         // Désactiver l'ancien client s'il existe
//         if (this.stompClient) {
//           try {
//             this.stompClient.forceDisconnect();
//           } catch (e) {
//             console.log('Old client cleanup error (expected):', e);
//           }
//         }

//         // Reconnecter
//         this.connect();
//       }
//     }, delay);
//   }

//   /**
//    * Déconnecter
//    */
//   public disconnect(): void {
//     console.log('🔌 Disconnecting STOMP manually');
//     this.isManualDisconnect = true;

//     // Nettoyer le timer de reconnexion
//     if (this.reconnectTimer) {
//       clearTimeout(this.reconnectTimer);
//       this.reconnectTimer = null;
//     }

//     if (this.stompClient?.connected) {
//       // Envoyer message de déconnexion
//       try {
//         this.stompClient.publish({
//           destination: '/app/notification.disconnect',
//           body: JSON.stringify({
//             userId: this.currentUserId,
//             type: 'DISCONNECT',
//             timestamp: new Date().toISOString()
//           })
//         });
//       } catch (error) {
//         console.error('❌ Error sending disconnect message:', error);
//       }

//       // Déconnecter
//       this.stompClient.deactivate();
//     }

//     this.updateConnectionStatus(false);
//     this.reconnectAttempts = 0;
//   }

//   /**
//    * Envoyer un message
//    */
//   public sendMessage(message: any): boolean {
//     if (!this.stompClient?.connected) {
//       console.log('⚠️ Cannot send message: STOMP not connected');
//       this.errorsSubject.next('Cannot send message: not connected');
//       return false;
//     }

//     try {
//       this.stompClient.publish({
//         destination: '/app/notification.message',
//         body: JSON.stringify(message)
//       });

//       console.log('📤 STOMP message sent:', message);
//       return true;
//     } catch (error) {
//       console.error('❌ Error sending STOMP message:', error);
//       this.errorsSubject.next('Failed to send message');
//       return false;
//     }
//   }

//   /**
//    * Obtenir le statut de connexion
//    */
//   public isConnected(): boolean {
//     return this.stompClient?.connected || false;
//   }

//   /**
//    * Forcer une reconnexion
//    */
//   public forceReconnect(): void {
//     console.log('🔄 Forcing STOMP reconnection');
//     this.disconnect();
//     setTimeout(() => {
//       this.isManualDisconnect = false;
//       this.connect();
//     }, 1000);
//   }

//   // ===== MÉTHODES UTILITAIRES =====

//   private updateConnectionStatus(connected: boolean): void {
//     this.connectionStatusSubject.next(connected);
//   }

//   private updateConnectionInfo(info: Partial<ConnectionStatus>): void {
//     const current = this.connectionInfoSubject.value;
//     this.connectionInfoSubject.next({ ...current, ...info });
//   }

//   private setupPageVisibilityHandling(): void {
//     if (typeof document !== 'undefined') {
//       document.addEventListener('visibilitychange', () => {
//         if (document.visibilityState === 'visible') {
//           console.log('👁️ Page visible, checking STOMP connection');
//           if (!this.isConnected() && !this.isManualDisconnect) {
//             this.connect();
//           }
//         }
//       });
//     }
//   }

//   // ===== MÉTHODES PUBLIQUES POUR COMPATIBILITÉ =====

//   public getConnectionInfo(): ConnectionStatus {
//     return this.connectionInfoSubject.value;
//   }

//   public subscribeToMessageType(messageType: string) {
//     return this.messages$.pipe(
//       // Filtrer par type si nécessaire
//     );
//   }

//   public subscribeToProject(projectId: string) {
//     return this.messages$.pipe(
//       // Filtrer par projectId si nécessaire
//     );
//   }

//   public subscribeToTask(taskId: string) {
//     return this.messages$.pipe(
//       // Filtrer par taskId si nécessaire
//     );
//   }

//   public getConnectionStats(): any {
//     return {
//       connected: this.isConnected(),
//       reconnectAttempts: this.reconnectAttempts,
//       connectionInfo: this.getConnectionInfo()
//     };
//   }

//   ngOnDestroy(): void {
//     console.log('🔌 WebSocket STOMP Service destroyed');
//     this.destroy$.next();
//     this.destroy$.complete();
//     this.disconnect();
//   }
// }




// src/app/core/services/websocket.service.ts - VERSION TEST TEMPORAIRE
// ✅ Remplace temporairement ton websocket.service.ts existant pour tester l'UI

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, timer } from 'rxjs';

export interface WebSocketMessage {
  type: string;
  timestamp: string;
  data?: any;
  userId?: string;
  projectId?: string;
  taskId?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  lastConnected?: Date;
  reconnectAttempts: number;
  latency?: number;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private destroy$ = new Subject<void>();

  // Subjects pour les observables
  private messagesSubject = new Subject<WebSocketMessage>();
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  private errorsSubject = new Subject<string>();
  private connectionInfoSubject = new BehaviorSubject<ConnectionStatus>({
    connected: false,
    reconnectAttempts: 0
  });

  // Observables publics
  public messages$ = this.messagesSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  public errors$ = this.errorsSubject.asObservable();
  public connectionInfo$ = this.connectionInfoSubject.asObservable();

  constructor() {
    console.log('🔌 WebSocket Service initialized (TEST MODE)');

    // ✅ SIMULATION - Tester sans backend
    this.simulateConnection();
  }

  /**
   * ✅ SIMULATION - Simuler une connexion WebSocket
   */
  private simulateConnection(): void {
    console.log('🧪 SIMULATION: Starting fake WebSocket connection...');

    // Simuler une connexion après 2 secondes
    setTimeout(() => {
      console.log('✅ SIMULATION: WebSocket connected');
      this.connectionStatusSubject.next(true);
      this.connectionInfoSubject.next({
        connected: true,
        lastConnected: new Date(),
        reconnectAttempts: 0,
        latency: 45
      });

      // Simuler des messages périodiques
      this.startSimulatedMessages();
    }, 2000);

    // Simuler une erreur après 30 secondes (optionnel)
    setTimeout(() => {
      console.log('⚠️ SIMULATION: Simulating connection error');
      this.errorsSubject.next('Simulated connection error');

      // Reconnecter après 5 secondes
      setTimeout(() => {
        console.log('🔄 SIMULATION: Reconnecting...');
        this.connectionStatusSubject.next(true);
      }, 5000);
    }, 30000);
  }

  /**
   * ✅ SIMULATION - Envoyer des messages de test
   */
  private startSimulatedMessages(): void {
    const messageTypes = [
      'TASK_CREATED',
      'TASK_UPDATED',
      'TASK_DELETED',
      'PROJECT_CREATED',
      'USER_ASSIGNED',
      'COMMENT_ADDED'
    ];

    let messageCount = 0;

    // Envoyer un message toutes les 10 secondes
    const interval = setInterval(() => {
      if (messageCount >= 20) {
        clearInterval(interval);
        console.log('🧪 SIMULATION: Stopped sending messages');
        return;
      }

      const randomType = messageTypes[Math.floor(Math.random() * messageTypes.length)];
      const mockMessage: WebSocketMessage = {
        type: randomType,
        timestamp: new Date().toISOString(),
        data: {
          id: `mock-${messageCount}`,
          title: `Test ${randomType.toLowerCase()} ${messageCount + 1}`,
          projectId: 'project-123',
          taskId: `task-${messageCount}`,
          description: `This is a simulated ${randomType.toLowerCase()} message`
        },
        userId: '1',
        projectId: 'project-123',
        taskId: `task-${messageCount}`
      };

      console.log(`📨 SIMULATION: Sending ${randomType} message`, mockMessage);
      this.messagesSubject.next(mockMessage);
      messageCount++;
    }, 10000); // Chaque 10 secondes
  }

  // ===== MÉTHODES PUBLIQUES (compatibles avec le vrai service) =====

  public connect(): void {
    console.log('🔌 SIMULATION: Connect called');
    this.simulateConnection();
  }

  public disconnect(): void {
    console.log('🔌 SIMULATION: Disconnect called');
    this.connectionStatusSubject.next(false);
  }

  public sendMessage(message: any): boolean {
    console.log('📤 SIMULATION: Message sent:', message);
    return true;
  }

  public isConnected(): boolean {
    return this.connectionStatusSubject.value;
  }

  public getConnectionInfo(): ConnectionStatus {
    return this.connectionInfoSubject.value;
  }

  public forceReconnect(): void {
    console.log('🔄 SIMULATION: Force reconnect');
    this.disconnect();
    setTimeout(() => this.connect(), 1000);
  }

  // ===== MÉTHODES UTILITAIRES =====

  public subscribeToMessageType(messageType: string) {
    return this.messages$.pipe(
      // filter par type si nécessaire
    );
  }

  public subscribeToProject(projectId: string) {
    return this.messages$.pipe(
      // filter par projectId si nécessaire
    );
  }

  public subscribeToTask(taskId: string) {
    return this.messages$.pipe(
      // filter par taskId si nécessaire
    );
  }

  public getConnectionStats(): any {
    return {
      connected: this.isConnected(),
      reconnectAttempts: 0,
      lastMessageTime: new Date(),
      connectionInfo: this.getConnectionInfo()
    };
  }

  ngOnDestroy(): void {
    console.log('🔌 SIMULATION: WebSocket Service destroyed');
    this.destroy$.next();
    this.destroy$.complete();
  }
}
