import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, output, signal, inject, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../../../core/models/user.model';
import { UserService } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth';
import { LocationSelectorComponent } from '../../../../shared/components/location-selector/location-selector';

@Component({
  selector: 'app-edit-profile-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LocationSelectorComponent],
  templateUrl: './edit-profile-modal.html',
  styleUrl: './edit-profile-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class EditProfileModalComponent implements OnInit {
  isOpen = input<boolean>(false);
  user = input<User | null>(null);

  close = output<void>();
  save = output<User>();

  private userService = inject(UserService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  savingProfile = false;
  profileSuccess = signal<string | null>(null);
  profileError = signal<string | null>(null);

  editForm = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    location: '',
    governorate: '',
    city: '',
    district: '',
    bio: '',
    avatar: ''
  };
  editTags: string[] = [];
  tagInputValue = '';
  pendingAvatarBase64: string | null = null;

  ngOnInit() {
    this.resetForm();
  }

  resetForm() {
    const u = this.user();
    if (u) {
      this.editForm = {
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        email: u.email || '',
        phoneNumber: u.phoneNumber || '',
        location: u.location || '',
        governorate: u.governorate || '',
        city: u.city || '',
        district: u.district || '',
        bio: u.bio || '',
        avatar: u.avatar || ''
      };
      this.editTags = [...(u.tags || [])];
      this.pendingAvatarBase64 = null;
    }
  }

  onLocationChange(loc: { governorate: string; city: string; district: string }) {
    this.editForm.governorate = loc.governorate;
    this.editForm.city = loc.city;
    this.editForm.district = loc.district;
  }

  closeModal() {
    this.close.emit();
  }

  get isFormValid(): boolean {
    return !!(
      this.editForm.firstName?.trim() &&
      this.editForm.lastName?.trim() &&
      this.editForm.email?.trim() &&
      this.editForm.phoneNumber?.trim() &&
      this.editForm.governorate?.trim() &&
      this.editForm.city?.trim()
    );
  }

  saveProfile() {
    const u = this.user();
    if (!u) return;
    this.profileSuccess.set(null);
    this.profileError.set(null);
    this.savingProfile = true;

    const tags = this.editTags;
    const avatar = this.pendingAvatarBase64 || this.editForm.avatar;
    this.pendingAvatarBase64 = null;

    const payload = {
      firstName: this.editForm.firstName,
      lastName: this.editForm.lastName,
      bio: this.editForm.bio,
      location: this.editForm.location,
      phoneNumber: this.editForm.phoneNumber,
      governorate: this.editForm.governorate,
      city: this.editForm.city,
      district: this.editForm.district,
      tags,
      avatar,
      email: this.editForm.email
    };

    this.userService.updateProfile(u.id, payload).subscribe({
      next: (updatedUser) => {
        this.savingProfile = false;
        this.authService.updateLocalUser(updatedUser);
        this.profileSuccess.set('Profile updated successfully!');
        this.save.emit(updatedUser);
        setTimeout(() => {
          this.closeModal();
          this.profileSuccess.set(null);
        }, 1500);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.savingProfile = false;
        console.error('Error updating profile:', err);
        this.profileError.set(err?.error?.message || 'Failed to update profile. Please try again.');
        this.cdr.detectChanges();
      }
    });
  }

  addTag(event: Event) {
    event.preventDefault();
    const val = this.tagInputValue.trim();
    if (val && !this.editTags.includes(val)) {
      this.editTags.push(val);
    }
    this.tagInputValue = '';
  }

  addTagFromInput(input: HTMLInputElement) {
    const val = input.value.trim();
    if (val && !this.editTags.includes(val)) {
      this.editTags.push(val);
    }
    input.value = '';
    this.tagInputValue = '';
  }

  removeTag(index: number) {
    this.editTags.splice(index, 1);
  }

  onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.editForm.avatar = URL.createObjectURL(file);
    this.cdr.detectChanges();

    const reader = new FileReader();
    reader.onload = () => {
      this.pendingAvatarBase64 = reader.result as string;
    };
    reader.readAsDataURL(file);
    input.value = '';
  }
}
