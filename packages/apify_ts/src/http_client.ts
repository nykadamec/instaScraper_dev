import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { ApifyApiError } from './utils';

export interface HttpClientOptions {
  token?: string;
  baseUrl?: string;
}

export class HttpClient {
  private axiosInstance: AxiosInstance;
  public readonly baseUrl: string;
  public readonly token?: string;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl || 'https://api.apify.com/v2';
    this.token = options.token;

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      validateStatus: (status) => status >= 200 && status < 300,
    });

    // Add Auth Header Interceptor
    this.axiosInstance.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Add Error Interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const data = error.response.data as any;
          const message = data?.error?.message || error.message;
          const type = data?.error?.type || 'UNKNOWN';
          
          throw new ApifyApiError(
            message,
            type,
            error.response.status,
            1, // attempt placeholder
            error.config?.method || 'UNKNOWN'
          );
        }
        throw error;
      }
    );
  }

  public async call<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.request<T>(config);
  }
}
