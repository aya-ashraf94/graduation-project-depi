import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-scroll-to-top',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible()) {
      <button class="scroll-top-btn" (click)="scrollToTop()" aria-label="Scroll to top">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>
    }
  `,
  styles: [`
    .scroll-top-btn {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      width: 3rem;
      height: 3rem;
      border-radius: 0.5rem;
      background: var(--yellow);
      color: var(--black);
      border: 2px solid var(--black);
      box-shadow: 3px 3px 0 var(--black);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      transition: all 0.2s ease;
    }
    .scroll-top-btn:hover {
      transform: translate(-2px, -2px);
      box-shadow: 5px 5px 0 var(--black);
    }
    .scroll-top-btn:active {
      transform: translate(0, 0);
      box-shadow: 1px 1px 0 var(--black);
    }
  `],
})
export class ScrollToTop implements OnInit, OnDestroy {
  visible = signal(false);
  private listener!: () => void;

  ngOnInit(): void {
    const onScroll = () => this.visible.set(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    this.listener = () => window.removeEventListener('scroll', onScroll);
  }

  ngOnDestroy(): void {
    this.listener();
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
