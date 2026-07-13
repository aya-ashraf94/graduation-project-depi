import { Component, OnInit, AfterViewInit, OnDestroy, inject, ChangeDetectorRef, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextPlugin } from 'gsap/TextPlugin';
import { AuthService } from '../../../../core/services/auth';
import { ProductService } from '../../../../core/services/product.service';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card';
import { ProductSummary } from '../../../../core/models/product.model';

gsap.registerPlugin(ScrollTrigger, TextPlugin);

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ProductCardComponent],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, AfterViewInit, OnDestroy {
  newsletterEmail = '';
  newsletterSuccessMessage = '';
  newsletterErrorMessage = '';
  departments: any[] = [
    {
      name: 'Electronics & Gadgets',
      count: '.. items',
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`,
    },
    {
      name: 'Furniture & Home',
      count: '.. items',
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h18v11H3z"/><path d="M5 10V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4"/><path d="M8 21v-4"/><path d="M16 21v-4"/><path d="M3 14h18"/></svg>`,
    },
    {
      name: 'Clothing & Apparel',
      count: '.. items',
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46L16 2a8.5 8.5 0 0 0-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>`,
    },
    {
      name: 'Books & Media',
      count: '.. items',
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    },
    {
      name: 'Vintage & Collectibles',
      count: '.. items',
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" y1="8" x2="12" y2="8"/><line x1="3.95" y1="6.06" x2="8.54" y2="14"/><line x1="10.88" y1="21.94" x2="15.46" y2="14"/></svg>`,
    },
  ];

  featuredProducts: ProductSummary[] = [];

  features: any[] = [
    {
      title: 'Trusted Community',
      desc: 'Trade with neighbors and verified community members safely.',
      icon: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    },
    {
      title: 'Easy Swaps',
      desc: 'Simple, direct exchanges to turn your unwanted items into fresh finds.',
      icon: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    },
    {
      title: 'Direct Chat',
      desc: 'Message users instantly to negotiate prices and arrange meetups.',
      icon: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    },
    {
      title: 'Eco-Friendly',
      desc: 'Give items a second life and reduce waste in your local community.',
      icon: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    },
  ];

  stats = [
    { value: '5K+', label: 'Active Traders', highlight: false },
    { value: '10K+', label: 'Items Listed', highlight: true },
    { value: '24/7', label: 'Community Support', highlight: false },
  ];

  steps: any[] = [
    {
      title: 'Browse',
      desc: 'Search through thousands of secondhand items and hidden treasures in your area.',
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    },
    {
      title: 'Connect',
      desc: 'Chat with the owner, ask questions, and negotiate the perfect deal directly.',
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    },
    {
      title: 'Trade',
      desc: 'Meet up, exchange cash or items, and give pre-loved goods a new home.',
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    },
  ];

  private ctx: gsap.Context | null = null;
  private _heroListeners: { el: HTMLElement; type: string; fn: (e: any) => void }[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private productService: ProductService,
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef,
  ) {}

  ngOnInit(): void {
    this.productService.getProducts({ limit: 20 }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (products) => {
        const diverse: ProductSummary[] = [];
        const seenCategories = new Set<string>();

        for (const product of products) {
          const cat = product.categoryName || '';
          if (cat && !seenCategories.has(cat)) {
            diverse.push(product);
            seenCategories.add(cat);
          }
          if (diverse.length === 4) break;
        }

        if (diverse.length < 4) {
          for (const product of products) {
            if (!diverse.some(p => p.id === product.id)) {
              diverse.push(product);
            }
            if (diverse.length === 4) break;
          }
        }

        this.featuredProducts = diverse;
        this.cdr.detectChanges();

        setTimeout(() => this.animateFeaturedProducts(), 50);
      },
      error: (err) => {
        console.error('Error fetching featured products:', err);
      }
    });

    this.productService.getCategoryCounts().pipe(takeUntil(this.destroy$)).subscribe({
      next: (categoryCounts) => {
        const counts = {
          electronics: 0,
          furniture: 0,
          clothes: 0,
          books: 0,
          vintage: 0
        };

        categoryCounts.forEach((c: any) => {
          const catName = c.name || '';
          const count = c.count || 0;
          if (catName === 'Electronics' || catName === 'Mobiles' || catName === 'Laptops') {
            counts.electronics += count;
          } else if (catName === 'Furniture' || catName === 'Home Appliances') {
            counts.furniture += count;
          } else if (catName === 'Clothes') {
            counts.clothes += count;
          } else if (catName.toLowerCase().includes('book')) {
            counts.books += count;
          } else {
            counts.vintage += count;
          }
        });

        if (this.departments[0]) this.departments[0].count = `${counts.electronics} items`;
        if (this.departments[1]) this.departments[1].count = `${counts.furniture} items`;
        if (this.departments[2]) this.departments[2].count = `${counts.clothes} items`;
        if (this.departments[3]) this.departments[3].count = `${counts.books} items`;
        if (this.departments[4]) this.departments[4].count = `${counts.vintage} items`;

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching category counts:', err);
      }
    });
    // Precompute safeHtml values and query params for template (avoid function calls in template)
    this.departments.forEach((d: any) => {
      d.safeIcon = this.sanitizer.bypassSecurityTrustHtml(d.icon);
      d.queryParams = { category: this.getDbCategoryName(d.name) };
    });
    this.features.forEach((f: any) => {
      f.safeIcon = this.sanitizer.bypassSecurityTrustHtml(f.icon);
    });
    this.steps.forEach((s: any) => {
      s.safeIcon = this.sanitizer.bypassSecurityTrustHtml(s.icon);
    });
  }

  getDbCategoryName(name: string): string {
    const map: Record<string, string> = {
      'Electronics & Gadgets': 'Electronics',
      'Furniture & Home': 'Furniture',
      'Clothing & Apparel': 'Clothes',
      'Books & Media': 'Other',
      'Vintage & Collectibles': 'Other'
    };
    return map[name] || '';
  }

  ngAfterViewInit(): void {
    this.route.fragment.pipe(takeUntil(this.destroy$)).subscribe(fragment => {
      if (fragment) {
        setTimeout(() => {
          const el = document.getElementById(fragment);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 350);
      }
    });

    // Split hero title words into per-character spans
    this.splitHeroChars();

    // Wait for loading screen to finish, then start hero animations
    if (document.querySelector('app-loading-screen')) {
      setTimeout(() => this.initAnimations(), 3500);
    } else {
      this.initAnimations();
    }
  }

  private splitHeroChars(): void {
    const words = this.elementRef.nativeElement.querySelectorAll('.gsap-word');
    words.forEach((word: HTMLElement) => {
      const text = word.textContent || '';
      word.textContent = '';
      for (const ch of text) {
        const span = document.createElement('span');
        span.className = 'gsap-char';
        span.textContent = ch === ' ' ? '\u00A0' : ch;
        word.appendChild(span);
      }
    });

    // Save & clear description for typewriter reveal
    const desc = this.elementRef.nativeElement.querySelector('.hero-desc') as HTMLElement | null;
    if (desc && !desc.dataset['text']) {
      desc.dataset['text'] = desc.textContent || '';
      desc.textContent = '';
    }
    if (desc) {
      desc.style.opacity = '0';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.ctx?.revert();
    for (const l of this._heroListeners) {
      l.el.removeEventListener(l.type, l.fn);
    }
  }

  private initAnimations(): void {
    const el = this.elementRef.nativeElement;

    this.ctx = gsap.context(() => {

      // ── Set initial hidden states (scroll-sections only — hero uses CSS)
      gsap.set('.dept-card', { y: 50, opacity: 0 });
      gsap.set('.feature-item', { y: 40, opacity: 0 });
      gsap.set('.step-item', { y: 50, opacity: 0 });
      gsap.set('.stat-item', { y: 30, opacity: 0 });
      gsap.set('.sell-cta-visual', { scale: 0.6, opacity: 0 });
      gsap.set('.newsletter-signup .container', { y: 40, opacity: 0 });

      // ── Hero title per-character entrance ─────────────────
      gsap.fromTo('.gsap-char',
        { y: 70, opacity: 0, rotation: 8 },
        { y: 0, opacity: 1, rotation: 0, duration: 0.55,
          stagger: 0.05,
          ease: 'back.out(1.7)',
        },
      );

      // ── Continuous character wave ─────────────────────────
      gsap.to('.gsap-char', {
        y: -4, scale: 1.05,
        duration: 2.4,
        ease: 'sine.inOut',
        stagger: { each: 0.04, from: 'start' },
        yoyo: true, repeat: -1,
        delay: 1.6,
      });

      // ── Reveal description ─────────────────────────────────
      const desc = el.querySelector('.hero-desc') as HTMLElement | null;
      if (desc) {
        gsap.to(desc, {
          opacity: 1, duration: 0.6, delay: 0.6,
          ease: 'power2.out',
          onStart: () => {
            const text = desc.dataset['text'] || desc.textContent || '';
            if (desc.dataset['text']) {
              gsap.to(desc, {
                text: { value: text, speed: 2 },
                duration: 1.5, ease: 'none',
              });
            }
          },
        });
      }

      // ── Rich ambient particles (dots + icons) ─────────────────
      const heroSection = el.querySelector('.hero');
      if (heroSection) {
        const symbols = ['✦', '⚡', '◆', '○', '+'];
        const dotColors = ['var(--yellow)', 'var(--yellow-dark)', 'rgba(255,255,255,0.5)', 'var(--orange)'];
        const total = 24;
        for (let i = 0; i < total; i++) {
          const isIcon = i >= 14;
          const el_ = document.createElement('div');
          el_.className = 'gsap-particle';
          const left = 2 + Math.random() * 96;
          const top = 5 + Math.random() * 90;

          if (isIcon) {
            const sym = symbols[i % symbols.length];
            const size = 12 + Math.random() * 10;
            el_.innerHTML = sym;
            el_.style.cssText = `
              left: ${left}%; top: ${top}%;
              font-size: ${size}px;
              color: ${dotColors[i % dotColors.length]};
              opacity: ${0.1 + Math.random() * 0.15};
              position: absolute; pointer-events: none; z-index: 0;
              user-select: none; will-change: transform;
              font-family: system-ui, sans-serif;
            `;
          } else {
            const size = 3 + Math.random() * 5;
            el_.style.cssText = `
              left: ${left}%; top: ${top}%;
              width: ${size}px; height: ${size}px;
              border-radius: 50%;
              background: ${dotColors[i % dotColors.length]};
              opacity: ${0.08 + Math.random() * 0.14};
              position: absolute; pointer-events: none; z-index: 0;
              user-select: none; will-change: transform;
            `;
          }
          heroSection.appendChild(el_);

          gsap.to(el_, {
            y: -30 - Math.random() * 50,
            x: -25 + Math.random() * 50,
            scale: 1.3 + Math.random() * 1,
            rotation: isIcon ? -15 + Math.random() * 30 : 0,
            duration: 6 + Math.random() * 6,
            ease: 'sine.inOut',
            yoyo: true, repeat: -1,
            delay: Math.random() * 3,
          });
        }
      }



      // ── Background grid shift ──
      const hero = el.querySelector('.hero') as HTMLElement;
      const heroInner = el.querySelector('.hero-inner') as HTMLElement;
      if (hero && heroInner) {
        const onMove = (e: MouseEvent) => {
          const rect = hero.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
          const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
          hero.style.setProperty('--bg-x', `${x * 6}px`);
          hero.style.setProperty('--bg-y', `${y * 6}px`);
        };
        heroInner.addEventListener('mousemove', onMove);
        this._heroListeners.push(
          { el: heroInner as HTMLElement, type: 'mousemove', fn: onMove },
        );
      }

      // ── Magnetic buttons ────────────────────────────────────────────
      const btns = el.querySelectorAll('.hero-btn') as NodeListOf<HTMLElement>;
      btns.forEach((btn: HTMLElement) => {
        const onEnter = () => {
          gsap.killTweensOf(btn);
          gsap.to(btn, { scale: 1.06, duration: 0.3, ease: 'power2.out' });
        };
        const onMove = (e: MouseEvent) => {
          const rect = btn.getBoundingClientRect();
          const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
          const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
          const mx = (e.clientX - rect.left - rect.width / 2) * 0.3;
          const my = (e.clientY - rect.top - rect.height / 2) * 0.3;
          gsap.killTweensOf(btn);
          gsap.to(btn, {
            x: mx, y: my,
            rotateY: nx * 8, rotateX: ny * -6,
            duration: 0.4, ease: 'power2.out',
          });
        };
        const onLeave = () => {
          gsap.killTweensOf(btn);
          gsap.to(btn, {
            x: 0, y: 0, scale: 1, rotateY: 0, rotateX: 0,
            duration: 0.4, ease: 'power2.out',
          });
        };
        btn.addEventListener('mouseenter', onEnter);
        btn.addEventListener('mousemove', onMove);
        btn.addEventListener('mouseleave', onLeave);
        this._heroListeners.push(
          { el: btn, type: 'mouseenter', fn: onEnter },
          { el: btn, type: 'mousemove', fn: onMove },
          { el: btn, type: 'mouseleave', fn: onLeave },
        );
      });

      // ================================================================
      // 2. SCROLL REVEALS
      // ================================================================

      // ── Category cards ──────────────────────────────────────────────
      gsap.to('.dept-card', {
        scrollTrigger: { trigger: '.departments', start: 'top 82%' },
        y: 0, opacity: 1, duration: 0.5, stagger: 0.07,
        ease: 'power2.out',
      });

      // ── Features grid ──────────────────────────────────────────────
      gsap.to('.feature-item', {
        scrollTrigger: { trigger: '.features', start: 'top 82%' },
        y: 0, opacity: 1, duration: 0.5, stagger: 0.1,
        ease: 'power2.out',
      });

      // ── Steps ─────────────────────────────────────────────────────
      gsap.to('.step-item', {
        scrollTrigger: { trigger: '.steps', start: 'top 82%' },
        y: 0, opacity: 1, duration: 0.6, stagger: 0.15,
        ease: 'power2.out',
      });

      // ── Sell CTA ──────────────────────────────────────────────────
      gsap.to('.sell-cta-content', {
        scrollTrigger: { trigger: '.sell-cta', start: 'top 82%' },
        y: 0, opacity: 1, duration: 0.7,
        ease: 'power2.out',
      });
      gsap.to('.sell-cta-visual', {
        scrollTrigger: { trigger: '.sell-cta', start: 'top 82%' },
        scale: 1, opacity: 1, duration: 0.7, delay: 0.2,
        ease: 'back.out(1.4)',
      });

      // ── Newsletter ────────────────────────────────────────────────
      gsap.to('.newsletter-signup .container', {
        scrollTrigger: { trigger: '.newsletter-signup', start: 'top 85%' },
        y: 0, opacity: 1, duration: 0.6,
        ease: 'power2.out',
      });

      // ── Stats counter ───────────────────────────────────────────
      gsap.utils.toArray<HTMLElement>('.stat-value').forEach(el => {
        const text = el.textContent || '';
        const m = text.match(/^([\d.]+)(.*)$/);
        if (!m) return;
        const target = parseFloat(m[1]);
        const suffix = m[2];
        const obj = { val: 0 };

        gsap.to(obj, {
          val: target, duration: 2, ease: 'power2.out',
          scrollTrigger: {
            trigger: el.closest('.stats-section'),
            start: 'top 85%',
          },
          onUpdate: () => {
            el.textContent = Math.floor(obj.val) + suffix;
          },
        });
      });

      // ── Stats items fade-in ──────────────────────────────────────
      gsap.to('.stat-item', {
        scrollTrigger: { trigger: '.stats-section', start: 'top 82%' },
        y: 0, opacity: 1, duration: 0.5, stagger: 0.1,
        ease: 'power2.out',
      });

    }, el);
  }

  private animateFeaturedProducts(): void {
    const productCards = this.elementRef.nativeElement.querySelectorAll('.product-card');
    if (!productCards.length) return;

    gsap.set(productCards, { y: 50, opacity: 0 });
    gsap.to(productCards, {
      scrollTrigger: {
        trigger: '.featured',
        start: 'top 80%',
      },
      y: 0, opacity: 1, duration: 0.6, stagger: 0.12,
      ease: 'power2.out',
    });
    ScrollTrigger.refresh();
  }

  scrollTo(id: string): void {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  toSafeHtml(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  subscribeNewsletter() {
    if (!this.newsletterEmail.trim()) return;

    this.productService.subscribeNewsletter(this.newsletterEmail).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.newsletterSuccessMessage = res.message || 'Subscribed successfully!';
        this.newsletterErrorMessage = '';
        this.newsletterEmail = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.newsletterErrorMessage = err?.error?.message || 'Subscription failed. Please check your email.';
        this.newsletterSuccessMessage = '';
        this.cdr.detectChanges();
      }
    });
  }
}
