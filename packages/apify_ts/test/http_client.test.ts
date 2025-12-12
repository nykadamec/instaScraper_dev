import { HttpClient } from '../src/http_client';
import { ApifyApiError } from '../src/utils';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HttpClient', () => {
  let client: HttpClient;
  let mockInstance: any;

  beforeEach(() => {
    mockInstance = {
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      request: jest.fn(),
    };
    mockedAxios.create.mockReturnValue(mockInstance);
    client = new HttpClient({ token: 'test-token' });
  });

  it('should set up interceptors', () => {
    expect(mockInstance.interceptors.request.use).toHaveBeenCalled();
    expect(mockInstance.interceptors.response.use).toHaveBeenCalled();
  });

  it('should add token to headers', () => {
    // Get the request interceptor callback
    const requestInterceptor = mockInstance.interceptors.request.use.mock.calls[0][0];
    const config: any = { headers: {} };
    requestInterceptor(config);
    expect(config.headers['Authorization']).toBe('Bearer test-token');
  });

  it('should handle API errors', async () => {
    // Get the response interceptor error callback
    const responseInterceptor = mockInstance.interceptors.response.use.mock.calls[0][1];
    
    const axiosError = {
      response: {
        status: 400,
        data: {
          error: {
            message: 'Bad Request',
            type: 'BAD_REQUEST',
          },
        },
      },
      config: { method: 'GET' },
    };

    try {
      responseInterceptor(axiosError);
      fail('Should have thrown ApifyApiError');
    } catch (e) {
      expect(e).toBeInstanceOf(ApifyApiError);
      if (e instanceof ApifyApiError) {
          expect(e.message).toBe('Bad Request');
          expect(e.statusCode).toBe(400);
          expect(e.type).toBe('BAD_REQUEST');
      }
    }
  });

  it('should pass through non-API errors', () => {
      const responseInterceptor = mockInstance.interceptors.response.use.mock.calls[0][1];
      const error = new Error('Network Error');
      expect(() => responseInterceptor(error)).toThrow('Network Error');
  });
  
  it('should return response on success', () => {
       const responseInterceptor = mockInstance.interceptors.response.use.mock.calls[0][0];
       const response = { data: 'ok' };
       expect(responseInterceptor(response)).toBe(response);
  });
});
