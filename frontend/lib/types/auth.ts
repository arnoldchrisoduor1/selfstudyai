export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string | null;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}

export interface ErrorResponse {
  error: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface AuthState {
  user: UserResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}