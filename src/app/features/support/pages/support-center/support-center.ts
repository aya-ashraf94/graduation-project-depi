import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

type SupportTab = 'privacy' | 'terms' | 'help';

@Component({
  selector: 'app-support-center',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="support-page">
      <div class="container">
        <!-- Header -->
        <div class="support-header">
          <h1 class="support-title">SUPPORT CENTER</h1>
          <p class="support-subtitle">Everything you need to know about Nafa3ni policies and help.</p>
        </div>

        <!-- Tabs Navigation -->
        <div class="support-tabs">
          <button 
            class="tab-btn" 
            [class.active]="activeTab() === 'privacy'"
            (click)="setTab('privacy')"
          >
            PRIVACY POLICY
          </button>
          <button 
            class="tab-btn" 
            [class.active]="activeTab() === 'terms'"
            (click)="setTab('terms')"
          >
            TERMS & CONDITIONS
          </button>
          <button 
            class="tab-btn" 
            [class.active]="activeTab() === 'help'"
            (click)="setTab('help')"
          >
            HELP CENTER
          </button>
        </div>

        <!-- Content Area -->
        <div class="support-content-box">
          
          <!-- PRIVACY POLICY -->
          <div *ngIf="activeTab() === 'privacy'" class="content-pane fade-in">
            <h2 class="pane-title">Privacy Policy</h2>
            <div class="legal-text">
              <h3>1. Information Collection</h3>
              <p>We collect your university email address, name, and any information you provide when creating a listing or sending messages through our platform.</p>
              
              <h3>2. Information Usage</h3>
              <p>Your data is used to provide and improve the Nafa3ni services, verify your student status, and facilitate communication between buyers and sellers.</p>
              
              <h3>3. Data Sharing</h3>
              <p>We do not sell your personal data to third parties. We may share anonymized data with analytics providers to understand how our application is used.</p>
              
              <h3>4. Cookies</h3>
              <p>We use cookies to keep you logged in and to store your preferences. You can disable cookies in your browser, but some features of the site may not function properly.</p>
              
              <h3>5. User Rights</h3>
              <p>You have the right to request access to the data we hold about you, or to request the permanent deletion of your account and associated data.</p>
            </div>
          </div>

          <!-- TERMS & CONDITIONS -->
          <div *ngIf="activeTab() === 'terms'" class="content-pane fade-in">
            <h2 class="pane-title">Terms of Service</h2>
            <div class="legal-text">
              <h3>1. Acceptance of Terms</h3>
              <p>By accessing or using the Nafa3ni marketplace, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use our services.</p>
              
              <h3>2. User Eligibility</h3>
              <p>To use our platform, you must be a currently enrolled student at a verified university. You are responsible for maintaining the confidentiality of your account credentials.</p>
              
              <h3>3. Limitation of Liability</h3>
              <p>Nafa3ni simply provides a platform for students to connect. We are not responsible for the quality, safety, or legality of the items advertised, nor the truth or accuracy of the listings.</p>
              
              <h3>4. Termination</h3>
              <p>We reserve the right to suspend or terminate your account at any time for violations of these terms or our community guidelines.</p>
            </div>
          </div>

          <!-- HELP CENTER (FAQ) -->
          <div *ngIf="activeTab() === 'help'" class="content-pane fade-in">
            <h2 class="pane-title">Frequently Asked Questions</h2>
            <div class="faq-list">
              <div class="faq-item">
                <div class="faq-q">Do I need a university email to join?</div>
                <div class="faq-a">Yes, Nafa3ni is exclusively for students. You must verify your account using an active .edu email address.</div>
              </div>
              
              <div class="faq-item">
                <div class="faq-q">How do I contact a seller?</div>
                <div class="faq-a">Click the "Contact Seller" button on any product page. You can negotiate and arrange a meeting place via our built-in chat.</div>
              </div>
              
              <div class="faq-item">
                <div class="faq-q">Are there any fees for selling?</div>
                <div class="faq-a">No, listing and selling items on Nafa3ni is completely free for students.</div>
              </div>
              
              <div class="faq-item">
                <div class="faq-q">Is payment handled through the platform?</div>
                <div class="faq-a">Currently, all payments are handled in-person between the buyer and seller. We recommend meeting in a safe, public place on campus.</div>
              </div>
            </div>
            
            <div class="contact-support">
              <p>Still need help? <a routerLink="/contact">Contact Support Team</a></p>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .support-page {
      padding: 64px 0;
      background: var(--surface);
      min-height: 80vh;
    }

    .support-header {
      text-align: center;
      margin-bottom: 48px;
    }

    .support-title {
      font-size: 3.5rem;
      color: var(--black);
      margin-bottom: 12px;
    }

    .support-subtitle {
      font-size: 1.1rem;
      color: var(--gray-3);
      max-width: 600px;
      margin: 0 auto;
    }

    /* Tabs */
    .support-tabs {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 32px;
      flex-wrap: wrap;
    }

    .tab-btn {
      padding: 12px 24px;
      background: var(--white);
      border: 2px solid var(--black);
      border-radius: var(--radius-sm);
      font-family: var(--font-primary);
      font-size: 1rem;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 4px 4px 0 var(--black);
      transition: var(--transition);
    }

    .tab-btn:hover {
      transform: translate(-2px, -2px);
      box-shadow: 6px 6px 0 var(--black);
    }

    .tab-btn.active {
      background: var(--yellow);
      transform: translate(2px, 2px);
      box-shadow: 0 0 0 var(--black);
    }

    /* Content Area */
    .support-content-box {
      background: var(--white);
      border: 3px solid var(--black);
      border-radius: var(--radius-md);
      box-shadow: 12px 12px 0 var(--black);
      padding: 48px;
      max-width: 900px;
      margin: 0 auto;
    }

    .pane-title {
      font-size: 2.2rem;
      margin-bottom: 32px;
      border-bottom: 3px solid var(--yellow);
      padding-bottom: 8px;
      display: inline-block;
    }

    .legal-text h3 {
      font-size: 1.2rem;
      margin: 24px 0 8px;
      color: var(--black);
    }

    .legal-text p {
      color: var(--gray-3);
      line-height: 1.7;
      margin-bottom: 16px;
    }

    /* FAQ */
    .faq-list {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .faq-item {
      background: var(--surface-2);
      padding: 24px;
      border: 2px solid var(--black);
      border-radius: var(--radius-sm);
    }

    .faq-q {
      font-weight: 800;
      font-size: 1.1rem;
      margin-bottom: 8px;
      color: var(--black);
    }

    .faq-a {
      color: var(--gray-3);
      line-height: 1.6;
    }

    .contact-support {
      margin-top: 40px;
      text-align: center;
      padding: 24px;
      background: var(--yellow);
      border: 2px solid var(--black);
      border-radius: var(--radius-sm);
      font-weight: 700;
    }

    .contact-support a {
      text-decoration: underline;
    }

    .fade-in {
      animation: fadeIn 0.4s ease-out both;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 768px) {
      .support-content-box { padding: 24px; }
      .support-title { font-size: 2.5rem; }
      .tab-btn { flex: 1; min-width: 150px; }
    }
  `]
})
export class SupportCenter implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  
  activeTab = signal<SupportTab>('privacy');

  ngOnInit() {
    // Check for tab query parameter
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'] as SupportTab;
      if (['privacy', 'terms', 'help'].includes(tab)) {
        this.activeTab.set(tab);
      }
    });
  }

  setTab(tab: SupportTab) {
    this.activeTab.set(tab);
    // Update URL without full navigation
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }
}
