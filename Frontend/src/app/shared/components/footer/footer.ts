import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  openDropdown = signal<string | null>(null);

  toggleDropdown(col: string): void {
    this.openDropdown.update(current => current === col ? null : col);
  }
}
