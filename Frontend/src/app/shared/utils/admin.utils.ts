export interface FlatUser {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
  isSuspended: boolean;
  location: string;
  bio: string;
  joinedAt: string;
  _user: any;
}

export function mapToFlatUser(u: any): FlatUser {
  return {
    id: u._id || u.id,
    firstName: u.firstName || u.name?.split(' ')[0] || '',
    lastName: u.lastName || u.name?.split(' ').slice(1).join(' ') || '',
    name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown',
    email: u.email || '',
    phone: u.phone || '',
    role: u.role || 'user',
    isVerified: !!u.isVerified,
    isSuspended: !!u.isSuspended,
    location: (u.location || u.address || ''),
    bio: u.bio || '',
    joinedAt: u.createdAt || u.joinedAt || '',
    _user: u,
  };
}

export const ADMIN_STATUS_OPTIONS = ['pending', 'shipped', 'delivered', 'cancelled', 'disputed'] as const;

export const ADMIN_ROLE_OPTIONS = ['user', 'seller', 'admin'] as const;

export const VERIFIED_OPTIONS = ['all', 'verified', 'unverified'] as const;

export const DEFAULT_PAGE_SIZE = 10;
