import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';
import { GameService, GamePhase } from '../../../core/services/game.service';
import { ScratchCard } from '../../../features/scratch-card/scratch-card';

@Component({
  selector: 'app-lucky-cat',
  standalone: true,
  imports: [CommonModule, ScratchCard],
  templateUrl: './lucky-cat.html',
  styleUrl: './lucky-cat.css',
})
export class LuckyCat implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private game = inject(GameService);

  isLoggedIn = this.auth.isLoggedIn;
  phase = this.game.phase;
  pos = this.game.position;
  dodgeCount = this.game.dodgeCount;
  taunt = this.game.taunt;
  maxDodges = this.game.maxDodges;

  readonly confettiColors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  readonly confettiPieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: this.confettiColors[i % this.confettiColors.length],
    rotation: Math.random() * 360,
  }));

  ngOnInit(): void {
    this.game.startIdleLoop();
  }

  ngOnDestroy(): void {
    this.game.cleanup();
  }

  get showCat(): boolean {
    const p = this.phase();
    return p === 'entering' || p === 'active' || p === 'dodging';
  }

  get isEntering(): boolean { return this.phase() === 'entering'; }
  get isActive(): boolean { return this.phase() === 'active'; }
  get isDodging(): boolean { return this.phase() === 'dodging'; }
  get isCaught(): boolean { return this.phase() === 'caught'; }
  get isModal(): boolean { return this.phase() === 'modal'; }
  get isDefeated(): boolean {
    const p = this.phase();
    return p === 'caught' || p === 'modal';
  }

  onCatHover(): void {
    if (this.phase() !== 'active') return;
    this.game.dodge();
  }

  catchCat(): void {
    if (this.phase() !== 'active') return;
    this.game.catch();
  }

  closeModal(): void {
    this.game.closeModal();
  }
}
