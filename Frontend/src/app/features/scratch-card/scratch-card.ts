import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, inject, signal, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../core/services/order.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-scratch-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './scratch-card.html',
  styleUrl: './scratch-card.css',
})
export class ScratchCard implements OnInit, AfterViewInit {
  @Input() isModal = false;
  @Output() closeCard = new EventEmitter<void>();

  private orderService = inject(OrderService);
  private toastService = inject(ToastService);

  @ViewChild('scratchCanvas', { static: false }) scratchCanvas!: ElementRef<HTMLCanvasElement>;

  // Game state
  couponCode = signal<string>('');
  discountType = signal<'percentage' | 'fixed'>('percentage');
  discountValue = signal<number>(0);
  expiryDate = signal<string | null>(null);
  
  loading = signal<boolean>(true);
  errorMsg = signal<string>('');
  scratched = signal<boolean>(false);
  revealed = signal<boolean>(false);
  progress = signal<number>(0);
  copied = signal<boolean>(false);

  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
  private canvasWidth = 320;
  private canvasHeight = 180;

  ngOnInit(): void {
    this.loadCoupon();
  }

  loadCoupon(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.scratched.set(false);
    this.revealed.set(false);
    this.progress.set(0);
    this.copied.set(false);

    this.orderService.getScratchCoupon().subscribe({
      next: (data) => {
        this.couponCode.set(data.code);
        this.discountType.set(data.discountType);
        this.discountValue.set(data.discountValue);
        this.expiryDate.set(data.expiryDate || null);
        this.loading.set(false);
        // Initialize canvas in next change detection cycle
        setTimeout(() => this.initCanvas(), 50);
      },
      error: (err) => {
        console.error(err);
        this.errorMsg.set(err.error?.message || 'Could not fetch coupon details. Please try again later.');
        this.loading.set(false);
      }
    });
  }

  ngAfterViewInit(): void {
    // Canvas is initialized after coupon data loads
  }

  initCanvas(): void {
    const canvas = this.scratchCanvas.nativeElement;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    this.ctx = context;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = this.canvasWidth * dpr;
    canvas.height = this.canvasHeight * dpr;
    canvas.style.width = `${this.canvasWidth}px`;
    canvas.style.height = `${this.canvasHeight}px`;
    this.ctx.scale(dpr, dpr);

    // Draw scratch texture / overlay
    this.drawOverlay();
    // Remove CSS background so transparent scratched pixels reveal the coupon underneath
    canvas.style.background = 'transparent';
  }

  drawOverlay(): void {
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    // Solid scratch coating — fully opaque, no gradient/transparency
    this.ctx.fillStyle = '#a0a0a0';
    this.ctx.fillRect(0, 0, w, h);

    // Add text overlay instruction
    this.ctx.font = 'bold 16px "Inter", sans-serif';
    this.ctx.fillStyle = '#4a4a4a';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('SCRATCH HERE', w / 2, h / 2);
    
    this.ctx.font = '10px "Inter", sans-serif';
    this.ctx.fillStyle = '#666666';
    this.ctx.fillText('Scratch 50% to claim', w / 2, h / 2 + 24);
  }

  // Draw event handlers
  startScratching(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    if (this.revealed()) return;
    this.isDrawing = true;
    this.scratch(event);
  }

  stopScratching(): void {
    this.isDrawing = false;
  }

  scratchMove(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    if (!this.isDrawing || this.revealed()) return;
    this.scratch(event);
  }

  private scratch(event: MouseEvent | TouchEvent): void {
    const canvas = this.scratchCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    
    // Get correct coordinates relative to the canvas bounding box
    let clientX: number;
    let clientY: number;

    if (event instanceof TouchEvent) {
      if (event.touches.length === 0) return;
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Setup composition operation to erase
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 22, 0, Math.PI * 2); // Scratch brush size 22px
    this.ctx.fill();

    this.checkScratchPercentage();
  }

  private checkScratchPercentage(): void {
    const canvas = this.scratchCanvas.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvasWidth * dpr;
    const h = this.canvasHeight * dpr;
    
    try {
      const imgData = this.ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      let transparentPixels = 0;
      const totalPixels = data.length / 4;

      for (let i = 0; i < data.length; i += 32) { // Sample every 8th pixel for speed
        if (data[i + 3] === 0) {
          transparentPixels++;
        }
      }

      const sampleRatio = 8; // since we sample every 8th pixel (4 bytes per pixel * 8 = 32)
      const currentProgress = Math.min(100, Math.round((transparentPixels / (totalPixels / sampleRatio)) * 100));
      this.progress.set(currentProgress);

      if (currentProgress >= 50 && !this.revealed()) {
        this.revealCoupon();
      }
    } catch (e) {
      console.error("Error reading image data:", e);
    }
  }

  revealCoupon(): void {
    this.revealed.set(true);
    this.scratched.set(true);
    
    // Clean canvas completely
    const canvas = this.scratchCanvas.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    this.toastService.success('Congratulations! You revealed a coupon code!', 3000);
  }

  copyToClipboard(): void {
    navigator.clipboard.writeText(this.couponCode()).then(() => {
      this.copied.set(true);
      this.toastService.success('Coupon code copied to clipboard!', 2000);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }
}
