import { Component, OnInit, OnDestroy, output, ElementRef, inject } from '@angular/core';
import { gsap } from 'gsap';

@Component({
  selector: 'app-loading-screen',
  standalone: true,
  templateUrl: './loading-screen.html',
  styleUrl: './loading-screen.css',
})
export class LoadingScreen implements OnInit, OnDestroy {
  readonly done = output<void>();
  private el = inject(ElementRef).nativeElement;
  private ctx: gsap.Context | null = null;

  ngOnInit(): void {
    this.ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl
        .from('.ls-logo-box', {
          scale: 0, rotation: -45, opacity: 0, duration: 0.6, ease: 'back.out(2)',
        })
        .from('.ls-letter', {
          y: 80, opacity: 0, duration: 0.5, stagger: 0.08, ease: 'back.out(1.6)',
        }, '-=0.3')
        .from('.ls-tagline', {
          y: 30, opacity: 0, duration: 0.5,
        }, '-=0.2')
        .from('.ls-bar-fill', {
          scaleX: 0, duration: 1.2, ease: 'power3.inOut', transformOrigin: 'left center',
        }, '-=0.3');

      tl.eventCallback('onComplete', () => {
        setTimeout(() => {
          const exitTL = gsap.timeline();
          exitTL
            .to(this.el.querySelector('.ls-content'), {
              y: -40, opacity: 0, duration: 0.4, ease: 'power2.in',
            })
            .to(this.el.querySelector('.ls-overlay'), {
              y: '-100%', duration: 0.7, ease: 'power3.inOut',
              onComplete: () => this.done.emit(),
            }, '-=0.1');
        }, 600);
      });
    }, this.el);
  }

  ngOnDestroy(): void {
    this.ctx?.revert();
  }
}
