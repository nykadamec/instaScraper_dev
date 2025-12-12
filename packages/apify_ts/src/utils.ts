export class ApifyApiError extends Error {
  constructor(
    public override message: string,
    public type: string,
    public statusCode: number,
    public attempt: number,
    public httpMethod: string
  ) {
    super(message);
    this.name = 'ApifyApiError';
  }
}

export interface ApifyResponse<T> {
  data: T;
}

export interface PaginationList<T> {
  total: number;
  count: number;
  offset: number;
  limit: number;
  desc: boolean;
  items: T[];
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  desc?: boolean;
}


/**
 * Helper to ensure options are objects
 */
export function cast<T>(value: unknown): T {
  return value as T;
}
