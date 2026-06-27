export interface FlashSale {
  id: string;
  name: string;
  discountPercent: number;
  scopeType: 'all' | 'category' | 'product';
  scopeId: string | null;
  scopeName: string | null;
  startDate: string;
  endDate: string;
  notifyBeforeMinutes: number;
  notificationSent: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
