export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown; stack?: string };
  timestamp: string;
}
