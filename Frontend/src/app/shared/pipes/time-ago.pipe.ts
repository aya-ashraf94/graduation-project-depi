// ============================================================
// TIME AGO PIPE
// Usage: {{ product.createdAt | timeAgo }}
// Output: "just now", "5 minutes ago", "2 days ago", etc.
// ============================================================

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'timeAgo', standalone: true })
export class TimeAgoPipe implements PipeTransform {
  transform(value: Date | string | null | undefined, short?: boolean): string {
    if (!value) return '';

    const date = value instanceof Date ? value : new Date(value);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (short) {
      if (seconds < 60) return 'now';
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
      if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d`;
      if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo`;
      return `${Math.floor(seconds / 31536000)}y`;
    }

    if (seconds < 60) return 'just now';
    if (seconds < 3600) {
      const m = Math.floor(seconds / 60);
      return `${m} minute${m > 1 ? 's' : ''} ago`;
    }
    if (seconds < 86400) {
      const h = Math.floor(seconds / 3600);
      return `${h} hour${h > 1 ? 's' : ''} ago`;
    }
    if (seconds < 2592000) {
      const d = Math.floor(seconds / 86400);
      return `${d} day${d > 1 ? 's' : ''} ago`;
    }
    if (seconds < 31536000) {
      const mo = Math.floor(seconds / 2592000);
      return `${mo} month${mo > 1 ? 's' : ''} ago`;
    }
    const y = Math.floor(seconds / 31536000);
    return `${y} year${y > 1 ? 's' : ''} ago`;
  }
}
