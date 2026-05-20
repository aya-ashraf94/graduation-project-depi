// ============================================================
// IMAGE FALLBACK DIRECTIVE
// Usage: <img [src]="product.thumbnail" appImageFallback />
// If the image fails to load, it shows a placeholder.
// ============================================================

import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[appImageFallback]',
  standalone: true,
})
export class ImageFallbackDirective {
  /** Override the default fallback URL if needed */
  @Input() fallbackSrc = 'https://placehold.co/400x400/111111/E8BD18?text=NO+IMAGE';

  constructor(private el: ElementRef<HTMLImageElement>) {}

  @HostListener('error')
  onError(): void {
    const img = this.el.nativeElement;
    // Prevent infinite loop if fallback also fails
    img.onerror = null;
    img.src = this.fallbackSrc;
  }
}
