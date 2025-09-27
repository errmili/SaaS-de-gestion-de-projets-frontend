// src/app/shared/directives/notification-badge.directive.ts
import {
  Directive,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
  Renderer2,
  HostListener
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotificationService } from '../../core/services/notification.service';

@Directive({
  selector: '[appNotificationBadge]',
  exportAs: 'notificationBadge'
})
export class NotificationBadgeDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private badgeElement: HTMLElement | null = null;
  private currentCount = 0;

  // Configuration du badge
  @Input() badgeType: 'total' | 'unread' | 'tasks' | 'projects' | 'mentions' = 'unread';
  @Input() badgeColor: 'primary' | 'accent' | 'warn' = 'warn';
  @Input() badgeSize: 'small' | 'medium' | 'large' = 'medium';
  @Input() badgePosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' = 'top-right';
  @Input() showZero = false;
  @Input() maxCount = 99;
  @Input() animateChanges = true;
  @Input() pulseOnUpdate = true;

  constructor(
    private elementRef: ElementRef,
    private renderer: Renderer2,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.createBadgeElement();
    this.subscribeToNotifications();
    this.setupHostElement();
  }

  /**
   * Créer l'élément badge
   */
  private createBadgeElement(): void {
    this.badgeElement = this.renderer.createElement('span');
    this.renderer.addClass(this.badgeElement, 'notification-badge');
    this.renderer.addClass(this.badgeElement, `badge-${this.badgeColor}`);
    this.renderer.addClass(this.badgeElement, `badge-${this.badgeSize}`);
    this.renderer.addClass(this.badgeElement, `badge-${this.badgePosition}`);

    // Styles CSS inline pour garantir l'affichage
    this.renderer.setStyle(this.badgeElement, 'position', 'absolute');
    this.renderer.setStyle(this.badgeElement, 'display', 'none');
    this.renderer.setStyle(this.badgeElement, 'min-width', '18px');
    this.renderer.setStyle(this.badgeElement, 'height', '18px');
    this.renderer.setStyle(this.badgeElement, 'border-radius', '9px');
    this.renderer.setStyle(this.badgeElement, 'font-size', '11px');
    this.renderer.setStyle(this.badgeElement, 'font-weight', '600');
    this.renderer.setStyle(this.badgeElement, 'line-height', '18px');
    this.renderer.setStyle(this.badgeElement, 'text-align', 'center');
    this.renderer.setStyle(this.badgeElement, 'z-index', '10');
    this.renderer.setStyle(this.badgeElement, 'pointer-events', 'none');
    this.renderer.setStyle(this.badgeElement, 'white-space', 'nowrap');
    this.renderer.setStyle(this.badgeElement, 'box-sizing', 'border-box');

    // Couleur selon le type
    this.setBadgeColor();

    // Position selon la configuration
    this.setBadgePosition();

    // Ajouter au parent
    this.renderer.appendChild(this.elementRef.nativeElement, this.badgeElement);
  }

  /**
   * Configurer l'élément hôte
   */
  private setupHostElement(): void {
    // S'assurer que l'élément parent a position relative
    const position = window.getComputedStyle(this.elementRef.nativeElement).position;
    if (position === 'static') {
      this.renderer.setStyle(this.elementRef.nativeElement, 'position', 'relative');
    }
  }

  /**
   * S'abonner aux notifications
   */
  private subscribeToNotifications(): void {
    this.notificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(counts => {
        const newCount = this.getCountByType(counts);
        this.updateBadge(newCount);
      });
  }

  /**
   * Obtenir le compteur selon le type
   */
  private getCountByType(counts: any): number {
    switch (this.badgeType) {
      case 'total':
        return counts.total || 0;
      case 'unread':
        return counts.unread || 0;
      case 'tasks':
        return counts.tasks || 0;
      case 'projects':
        return counts.projects || 0;
      case 'mentions':
        return counts.mentions || 0;
      default:
        return counts.unread || 0;
    }
  }

  /**
   * Mettre à jour le badge
   */
  private updateBadge(count: number): void {
    if (!this.badgeElement) return;

    const previousCount = this.currentCount;
    this.currentCount = count;

    // Afficher/masquer selon la valeur
    if (count > 0 || this.showZero) {
      this.showBadge(count);

      // Animation de pulsation si nouveau count
      if (this.pulseOnUpdate && count > previousCount && previousCount >= 0) {
        this.animatePulse();
      }

      // Animation de changement de nombre
      if (this.animateChanges && count !== previousCount) {
        this.animateCountChange();
      }
    } else {
      this.hideBadge();
    }
  }

  /**
   * Afficher le badge
   */
  private showBadge(count: number): void {
    if (!this.badgeElement) return;

    const displayCount = count > this.maxCount ? `${this.maxCount}+` : count.toString();
    this.renderer.setProperty(this.badgeElement, 'textContent', displayCount);
    this.renderer.setStyle(this.badgeElement, 'display', 'flex');
    this.renderer.setStyle(this.badgeElement, 'align-items', 'center');
    this.renderer.setStyle(this.badgeElement, 'justify-content', 'center');

    // Ajuster la largeur pour les nombres > 9
    if (count > 9) {
      this.renderer.setStyle(this.badgeElement, 'min-width', '22px');
      this.renderer.setStyle(this.badgeElement, 'padding', '0 4px');
    } else {
      this.renderer.setStyle(this.badgeElement, 'min-width', '18px');
      this.renderer.setStyle(this.badgeElement, 'padding', '0');
    }
  }

  /**
   * Masquer le badge
   */
  private hideBadge(): void {
    if (!this.badgeElement) return;
    this.renderer.setStyle(this.badgeElement, 'display', 'none');
  }

  /**
   * Configurer la couleur du badge
   */
  private setBadgeColor(): void {
    if (!this.badgeElement) return;

    let backgroundColor: string;
    let color: string;

    switch (this.badgeColor) {
      case 'primary':
        backgroundColor = '#5d4e75';
        color = 'white';
        break;
      case 'accent':
        backgroundColor = '#2196f3';
        color = 'white';
        break;
      case 'warn':
      default:
        backgroundColor = '#f44336';
        color = 'white';
        break;
    }

    this.renderer.setStyle(this.badgeElement, 'background-color', backgroundColor);
    this.renderer.setStyle(this.badgeElement, 'color', color);
  }

  /**
   * Configurer la position du badge
   */
  private setBadgePosition(): void {
    if (!this.badgeElement) return;

    // Réinitialiser toutes les positions
    this.renderer.removeStyle(this.badgeElement, 'top');
    this.renderer.removeStyle(this.badgeElement, 'right');
    this.renderer.removeStyle(this.badgeElement, 'bottom');
    this.renderer.removeStyle(this.badgeElement, 'left');

    switch (this.badgePosition) {
      case 'top-right':
        this.renderer.setStyle(this.badgeElement, 'top', '-6px');
        this.renderer.setStyle(this.badgeElement, 'right', '-6px');
        break;
      case 'top-left':
        this.renderer.setStyle(this.badgeElement, 'top', '-6px');
        this.renderer.setStyle(this.badgeElement, 'left', '-6px');
        break;
      case 'bottom-right':
        this.renderer.setStyle(this.badgeElement, 'bottom', '-6px');
        this.renderer.setStyle(this.badgeElement, 'right', '-6px');
        break;
      case 'bottom-left':
        this.renderer.setStyle(this.badgeElement, 'bottom', '-6px');
        this.renderer.setStyle(this.badgeElement, 'left', '-6px');
        break;
    }
  }

  /**
   * Animation de pulsation
   */
  private animatePulse(): void {
    if (!this.badgeElement || !this.pulseOnUpdate) return;

    // Ajouter la classe d'animation
    this.renderer.addClass(this.badgeElement, 'badge-pulse');

    // Supprimer après l'animation
    setTimeout(() => {
      if (this.badgeElement) {
        this.renderer.removeClass(this.badgeElement, 'badge-pulse');
      }
    }, 600);
  }

  /**
   * Animation de changement de count
   */
  private animateCountChange(): void {
    if (!this.badgeElement || !this.animateChanges) return;

    // Ajouter la classe d'animation
    this.renderer.addClass(this.badgeElement, 'badge-bounce');

    // Supprimer après l'animation
    setTimeout(() => {
      if (this.badgeElement) {
        this.renderer.removeClass(this.badgeElement, 'badge-bounce');
      }
    }, 300);
  }

  /**
   * Méthode publique pour forcer la mise à jour
   */
  public refresh(): void {
    this.notificationService.refreshUnreadCount();
  }

  /**
   * Méthode publique pour obtenir le count actuel
   */
  public getCurrentCount(): number {
    return this.currentCount;
  }

  /**
   * Listener pour les clics (optionnel)
   */
  @HostListener('click', ['$event'])
  onHostClick(event: Event): void {
    // Ajouter un effet de clic si nécessaire
    if (this.badgeElement && this.currentCount > 0) {
      this.animateCountChange();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Nettoyer l'élément badge
    if (this.badgeElement) {
      this.renderer.removeChild(this.elementRef.nativeElement, this.badgeElement);
    }
  }
}

