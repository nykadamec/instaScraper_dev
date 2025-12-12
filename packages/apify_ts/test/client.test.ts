import { ApifyClient } from '../src/client';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApifyClient', () => {
  let client: ApifyClient;

  beforeEach(() => {
    mockedAxios.create.mockReturnThis();
    mockedAxios.interceptors = {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    } as any;
    client = new ApifyClient({ token: 'test-token' });
  });

  it('should be initialized with token', () => {
    expect(client).toBeInstanceOf(ApifyClient);
    expect(client.httpClient.token).toBe('test-token');
  });

  it('should initialize resource clients', () => {
    expect(client.actor('some-id')).toBeDefined();
    expect(client.run('some-id')).toBeDefined();
    expect(client.dataset('some-id')).toBeDefined();
    expect(client.actors).toBeDefined();
    expect(client.datasets).toBeDefined();
  });

  it('should use default actor ID from env', () => {
    process.env.APIFY_ACTOR_ID = 'env-actor-id';
    // We can't check the internal ID directly easily as it's private, but we can verify it doesn't throw
    expect(client.actor()).toBeDefined();
    
    // Cleanup
    delete process.env.APIFY_ACTOR_ID;
  });

  it('should throw if no actor ID provided and no env var', () => {
    delete process.env.APIFY_ACTOR_ID;
    expect(() => client.actor()).toThrow('Actor ID is required');
  });
});
