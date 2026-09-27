export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiError;
    timestamp: string;
}
export interface ApiError {
    code: string;
    message: string;
    details?: unknown;
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}
