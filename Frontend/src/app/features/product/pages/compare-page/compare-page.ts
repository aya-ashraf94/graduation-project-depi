import { Component, inject, OnInit, OnDestroy, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { CompareService } from '../../../../core/services/compare.service';
import { Product, ProductCondition } from '../../../../core/models/product.model';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';
import { getConditionLabel, getConditionClass } from '../../../../shared/utils/condition.utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface CompareField {
  label: string;
  key: string;
  comparable: 'numeric' | 'text' | 'condition' | 'rating';
  getValue: (p: Product) => string;
}

interface DynamicAttribute {
  key: string;
  label: string;
  values: [string, string];
}

interface BestValue {
  label: string;
  winnerIndex: number;
}

@Component({
  selector: 'app-compare-page',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyFormatPipe, TimeAgoPipe],
  templateUrl: './compare-page.html',
  styleUrl: './compare-page.css',
})
export class ComparePage implements OnInit, OnDestroy {
  @ViewChild('pdfContent') pdfContent!: ElementRef<HTMLDivElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  readonly compareService = inject(CompareService);

  loading = signal(true);
  error = signal(false);
  products = signal<Product[]>([]);
  downloading = signal(false);

  staticFields: CompareField[] = [
    { label: 'Image', key: 'image', comparable: 'text', getValue: (p) => p.images[0] || '' },
    { label: 'Title', key: 'title', comparable: 'text', getValue: (p) => p.title },
    { label: 'Price', key: 'price', comparable: 'numeric', getValue: (p) => `$${p.price.toLocaleString()}` },
    { label: 'Category', key: 'category', comparable: 'text', getValue: (p) => p.categoryName || p.category },
    { label: 'Brand', key: 'brand', comparable: 'text', getValue: (p) => p.brand || '-' },
    { label: 'Condition', key: 'condition', comparable: 'condition', getValue: (p) => getConditionLabel(p.condition) },
    { label: 'Status', key: 'status', comparable: 'text', getValue: (p) => p.status.charAt(0).toUpperCase() + p.status.slice(1) },
    { label: 'Seller', key: 'seller', comparable: 'text', getValue: (p) => `${p.seller.firstName} ${p.seller.lastName}`.trim() || '-' },
    { label: 'Seller Rating', key: 'sellerRating', comparable: 'rating', getValue: (p) => p.seller.rating ? `${p.seller.rating}/5` : '-' },
    { label: 'Location', key: 'location', comparable: 'text', getValue: (p) => p.location || '-' },
    { label: 'Phone', key: 'phone', comparable: 'text', getValue: (p) => p.showContactInfo && p.phoneNumber ? p.phoneNumber : '-' },
    { label: 'Created', key: 'createdAt', comparable: 'text', getValue: (p) => new Date(p.createdAt).toLocaleDateString() },
    { label: 'Description', key: 'description', comparable: 'text', getValue: (p) => p.description || '-' },
  ];

  dynamicAttributes = signal<DynamicAttribute[]>([]);
  bestValues = signal<BestValue[]>([]);
  recommendation = signal('');

  private readonly conditionOrder: Record<ProductCondition, number> = {
    new_with_tags: 5, excellent: 4, good: 3, fair: 2, distressed: 1
  };

  async downloadPdf(): Promise<void> {
    if (this.downloading()) return;
    this.downloading.set(true);
    try {
      const el = this.pdfContent?.nativeElement;
      if (!el) return;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('comparison-report.pdf');
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      this.downloading.set(false);
    }
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const idsParam = params['ids'];
      if (!idsParam) {
        this.error.set(true);
        this.loading.set(false);
        return;
      }
      const ids = idsParam.split(',').filter((id: string) => id);
      if (ids.length < 2) {
        this.error.set(true);
        this.loading.set(false);
        return;
      }
      this.loadProducts(ids[0], ids[1]);
    });
  }

  private loadProducts(id1: string, id2: string): void {
    this.compareService.clear();
    const p1 = this.productService.getProductById(id1);
    const p2 = this.productService.getProductById(id2);

    p1.subscribe({
      next: (product1) => {
        p2.subscribe({
          next: (product2) => {
            this.products.set([product1, product2]);
            this.compareService.add({
              id: product1.id,
              thumbnail: product1.images?.[0] || '',
              title: product1.title,
              price: product1.price,
            });
            this.compareService.add({
              id: product2.id,
              thumbnail: product2.images?.[0] || '',
              title: product2.title,
              price: product2.price,
            });
            this.extractDynamicAttributes(product1, product2);
            this.analyzeBestValue(product1, product2);
            this.loading.set(false);
            this.compareService.saveToHistory();
          },
          error: () => {
            this.error.set(true);
            this.loading.set(false);
          }
        });
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  removeProduct(index: number): void {
    const current = this.products();
    if (index < 0 || index >= current.length) return;
    const removed = current[index];
    this.compareService.remove(removed.id);
    this.router.navigate(['/products']);
  }

  clearComparison(): void {
    this.compareService.clear();
    this.router.navigate(['/products']);
  }

  ngOnDestroy(): void {
    this.compareService.clear();
  }

  private extractDynamicAttributes(p1: Product, p2: Product): void {
    const raw1 = p1.rawDynamicAttributes || {};
    const raw2 = p2.rawDynamicAttributes || {};

    const baseKeys = ['condition', 'conditionScore', 'brand', 'size', 'badge'];
    const allKeys = new Set([...Object.keys(raw1), ...Object.keys(raw2)]);
    const dynamicKeys = Array.from(allKeys).filter(k => !baseKeys.includes(k));

    if (dynamicKeys.length === 0) return;

    const attrs: DynamicAttribute[] = dynamicKeys.map(key => ({
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim(),
      values: [
        raw1[key] !== undefined ? String(raw1[key]) : '-',
        raw2[key] !== undefined ? String(raw2[key]) : '-',
      ]
    }));

    this.dynamicAttributes.set(attrs);
  }

  private analyzeBestValue(p1: Product, p2: Product): void {
    const values: BestValue[] = [];

    if (p1.price !== p2.price) {
      values.push({ label: 'Best Price', winnerIndex: p1.price < p2.price ? 0 : 1 });
    }

    const c1 = this.conditionOrder[p1.condition] || 0;
    const c2 = this.conditionOrder[p2.condition] || 0;
    if (c1 !== c2) {
      values.push({ label: 'Better Condition', winnerIndex: c1 > c2 ? 0 : 1 });
    }

    if (p1.seller.rating !== p2.seller.rating) {
      values.push({ label: 'Better Seller Rating', winnerIndex: (p1.seller.rating || 0) > (p2.seller.rating || 0) ? 0 : 1 });
    }

    const raw1 = p1.rawDynamicAttributes || {};
    const raw2 = p2.rawDynamicAttributes || {};
    const perfKeys = ['cpu', 'ram', 'gpu', 'storage', 'processor', 'memory', 'graphics', 'cores', 'speed', 'generation', 'chip'];
    let betterPerf = 0;
    for (const key of perfKeys) {
      const v1 = raw1[key];
      const v2 = raw2[key];
      if (v1 !== undefined && v2 !== undefined && v1 !== v2) {
        const n1 = parseFloat(String(v1));
        const n2 = parseFloat(String(v2));
        if (!isNaN(n1) && !isNaN(n2)) {
          if (n1 > n2) betterPerf++;
          else if (n2 > n1) betterPerf--;
        }
      }
    }
    if (betterPerf > 0) {
      values.push({ label: 'Better Performance', winnerIndex: 0 });
    } else if (betterPerf < 0) {
      values.push({ label: 'Better Performance', winnerIndex: 1 });
    }

    this.bestValues.set(values);

    if (values.length > 0) {
      const counts = [0, 0];
      for (const v of values) counts[v.winnerIndex]++;
      const winnerIdx = counts[0] >= counts[1] ? 0 : 1;
      const winner = winnerIdx === 0 ? p1 : p2;
      const other = winnerIdx === 0 ? p2 : p1;
      const name = winner.title.length > 30 ? winner.title.substring(0, 30) + '...' : winner.title;
      let rec = `${name} is recommended`;

      if (winner.price !== other.price) {
        const diff = Math.round((Math.abs(winner.price - other.price) / Math.max(winner.price, other.price)) * 100);
        rec += winner.price < other.price ? ` — ${diff}% cheaper` : ` — ${diff}% more expensive`;
      }

      if (values.some(v => v.label !== 'Best Price')) {
        rec += ' with better overall value';
      }

      this.recommendation.set(rec);
    }
  }

  getConditionClass(cond: string): string {
    return getConditionClass(cond);
  }

  getConditionLabel(cond: string): string {
    return getConditionLabel(cond);
  }

  hasSale(product: Product): boolean {
    return !!(product.isOnSale || product.isFlashSale);
  }
}
