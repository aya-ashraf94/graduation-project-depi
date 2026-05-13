// ============================================================
// API RESPONSE WRAPPERS
// When you connect to your backend, every HTTP response will
// be wrapped in ApiResponse<T>. Services unwrap it for the UI.
// ============================================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>; // field-level validation errors
}
