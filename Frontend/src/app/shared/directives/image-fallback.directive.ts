// ============================================================
// IMAGE FALLBACK DIRECTIVE
// Usage: <img [src]="product.thumbnail" appImageFallback />
// If the image fails to load, it shows a placeholder.
// ============================================================

import { Directive, ElementRef, HostListener, Input, inject } from '@angular/core';

@Directive({
  selector: '[appImageFallback]',
  standalone: true,
})
export class ImageFallbackDirective {
  /** Override the default fallback URL if needed */
  @Input() fallbackSrc = 'https://placehold.co/400x400/f0f0f0/999999?text=No+Image';

  private el = inject(ElementRef<HTMLImageElement>);

  @HostListener('error')
  onError(): void {
    const img = this.el.nativeElement;
    // Prevent infinite loop if fallback also fails
    img.onerror = null;
    img.src = this.fallbackSrc;
  }
}
