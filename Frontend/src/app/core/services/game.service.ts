import { Injectable, signal } from '@angular/core';

export type GamePhase = 'idle' | 'entering' | 'active' | 'dodging' | 'caught' | 'modal';

export interface CatPosition {
  x: number;
  y: number;
}

@Injectable({
  providedIn: 'root',
})
export class GameService {
  readonly phase = signal<GamePhase>('idle');
  readonly position = signal<CatPosition>({ x: 50, y: 40 });
  readonly dodgeCount = signal(0);
  readonly taunt = signal('');
  readonly dodgeNumber = signal(0);
  readonly claimed = signal(false);

  readonly maxDodges = 4;

  private idleTimer: any;
  private dodgeTimeout: any;
  private hideTimeout: any;

  private readonly randomTaunts = [
    'Catch me if you can! 😸',
    'Too slow! 🐱',
    "You'll never take me alive! 😼",
    'Missed me! 😹',
    'Almost... NOT! 😝',
    'Pfft, try harder! 🙀',
    'Boop! Nope! 👋',
    "I'm right here! LOL 😂",
    'Meow! You missed! 😸',
    "I'm too fast for you! 🐈",
  ];

  private readonly dodgeTaunts = [
    'Too slow! Try again! 😹',
    'Almost had me! NOT! 😝',
    'You call that fast? 🙀',
    'Getting warmer... still not! 🔥',
    'Nope, nope, nope! 👋',
    'Haha, you missed! 😸',
    'Not even close! 😂',
  ];

  private readonly nervousTaunts = [
    "Okay you're getting good... 😰",
    'NOOO! Not again! 😩',
    'Fine! Take it easy on me! 😅',
    'Wait wait wait— 😳',
    'How are you so fast?! 😱',
  ];

  private readonly caughtTaunts = [
    "NOOOO! I've been caught! 😭",
    "Okay, you win... here's your coupon 🎟️",
    'I\'ll get you next time! 😤',
    'Fine! Take the coupon! 😾',
    "You're too powerful! I submit! 😵",
  ];

  private pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private randomPosition(): CatPosition {
    const margin = 12;
    return {
      x: Math.random() * (100 - margin * 2) + margin,
      y: Math.random() * (70 - margin * 2) + margin,
    };
  }

  startIdleLoop(): void {
    this.stopAll();
    this.phase.set('idle');

    if (this.claimed()) return;

    this.idleTimer = setTimeout(() => this.tryPeek(), 5000);
    this.idleTimer = setInterval(() => this.tryPeek(), 20000);
  }

  private tryPeek(): void {
    if (this.phase() !== 'idle') return;
    if (this.claimed()) return;
    if (Math.random() < 0.40) {
      this.spawn();
    }
  }

  spawn(): void {
    if (this.claimed()) return;
    this.dodgeCount.set(0);
    this.position.set(this.randomPosition());
    this.taunt.set(this.pick(this.randomTaunts));
    this.dodgeNumber.set(0);
    this.phase.set('entering');

    setTimeout(() => {
      if (this.phase() !== 'entering') return;
      this.phase.set('active');

      this.hideTimeout = setTimeout(() => {
        if (this.phase() === 'active') {
          this.phase.set('idle');
        }
      }, 7000);
    }, 500);
  }

  dodge(): void {
    if (this.phase() !== 'active') return;

    const current = this.dodgeCount();
    if (current >= this.maxDodges - 1) return;

    this.dodgeCount.update(c => c + 1);
    this.dodgeNumber.set(current + 1);
    this.phase.set('dodging');

    if (this.hideTimeout) clearTimeout(this.hideTimeout);

    const nextCount = current + 1;
    if (nextCount >= this.maxDodges - 1) {
      this.taunt.set(this.pick(this.nervousTaunts));
    } else {
      this.taunt.set(this.pick(this.dodgeTaunts));
    }

    this.dodgeTimeout = setTimeout(() => {
      this.position.set(this.randomPosition());
      this.phase.set('active');

      this.hideTimeout = setTimeout(() => {
        if (this.phase() === 'active') {
          this.phase.set('idle');
        }
      }, 7000);
    }, 450);
  }

  catch(): void {
    if (this.phase() !== 'active') return;
    if (this.hideTimeout) clearTimeout(this.hideTimeout);

    this.taunt.set(this.pick(this.caughtTaunts));
    this.phase.set('caught');

    setTimeout(() => {
      this.phase.set('modal');
    }, 1800);
  }

  closeModal(): void {
    this.claimed.set(true);
    this.phase.set('idle');
    this.stopAll();
  }

  cleanup(): void {
    this.stopAll();
  }

  private stopAll(): void {
    if (this.idleTimer) {
      clearInterval(this.idleTimer);
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.dodgeTimeout) {
      clearTimeout(this.dodgeTimeout);
      this.dodgeTimeout = null;
    }
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }
}
