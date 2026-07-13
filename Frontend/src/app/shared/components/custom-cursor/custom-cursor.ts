import { Component, OnInit, OnDestroy, HostListener, ElementRef, inject } from '@angular/core';
import { gsap } from 'gsap';

@Component({
  selector: 'app-custom-cursor',
  standalone: true,
  templateUrl: './custom-cursor.html',
  styleUrl: './custom-cursor.css',
})
export class CustomCursor implements OnInit, OnDestroy {
  private el = inject(ElementRef).nativeElement;
  private dot!: HTMLElement;
  private ring!: HTMLElement;
  private mouseX = 0;
  private mouseY = 0;
  private isHovering = false;
  private isVisible = false;

  private hoverTargets = 'a, button, [routerLink], .product-card, .dept-card, .stack-card, .feature-item, .step-item, .sell-cta .btn, .stat-item, .hero-btn, input, select, textarea';
  private onMouseOver!: (e: Event) => void;
  private onMouseOut!: (e: Event) => void;

  ngOnInit(): void {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    this.dot = this.el.querySelector('.cursor-dot')!;
    this.ring = this.el.querySelector('.cursor-ring')!;

    gsap.set(this.dot, { opacity: 0 });
    gsap.set(this.ring, { opacity: 0, scale: 0.5 });

    this.addHoverListeners();
  }

  ngOnDestroy(): void {
    document.body.style.cursor = '';
    document.removeEventListener('mouseover', this.onMouseOver);
    document.removeEventListener('mouseout', this.onMouseOut);
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;

    if (!this.isVisible) {
      this.isVisible = true;
      gsap.to([this.dot, this.ring], { opacity: 1, duration: 0.3 });
    }

    gsap.to(this.dot, {
      x: this.mouseX,
      y: this.mouseY,
      duration: 0,
    });

    gsap.to(this.ring, {
      x: this.mouseX,
      y: this.mouseY,
      duration: 0.35,
      ease: 'power2.out',
    });
  }

  @HostListener('document:mouseleave')
  onMouseLeave(): void {
    this.isVisible = false;
    gsap.to([this.dot, this.ring], { opacity: 0, duration: 0.2 });
  }

  @HostListener('document:mousedown')
  onMouseDown(): void {
    gsap.to(this.ring, {
      scale: 0.6,
      duration: 0.1,
      ease: 'power2.in',
    });
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    gsap.to(this.ring, {
      scale: this.isHovering ? 1.6 : 1,
      duration: 0.2,
      ease: 'back.out(2)',
    });
  }

  private addHoverListeners(): void {
    this.onMouseOver = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target.matches?.(this.hoverTargets)) {
        this.isHovering = true;
        gsap.to(this.ring, {
          scale: 1.6,
          borderColor: 'var(--yellow)',
          backgroundColor: 'rgba(232, 189, 24, 0.08)',
          duration: 0.3,
          ease: 'power2.out',
        });
      }
    };

    this.onMouseOut = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target.matches?.(this.hoverTargets)) {
        this.isHovering = false;
        gsap.to(this.ring, {
          scale: 1,
          borderColor: '#ffffff',
          backgroundColor: 'transparent',
          duration: 0.3,
          ease: 'power2.out',
        });
      }
    };

    document.addEventListener('mouseover', this.onMouseOver);
    document.addEventListener('mouseout', this.onMouseOut);
  }
}
