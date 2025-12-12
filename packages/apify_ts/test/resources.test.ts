import { ApifyClient } from '../src'; // Import from index to cover it
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockAxiosInstance = {
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
  request: jest.fn(),
};

mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

describe('Resource Clients Integration', () => {
  let client: ApifyClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new ApifyClient({ token: 'test-token' });
  });

  describe('ActorClient', () => {
    it('should handle 404 in get()', async () => {
      mockAxiosInstance.request.mockRejectedValue({ statusCode: 404 });
      const actor = await client.actor('missing').get();
      expect(actor).toBeUndefined();
    });

    it('should throw other errors in get()', async () => {
      mockAxiosInstance.request.mockRejectedValue({ statusCode: 500 });
      await expect(client.actor('broken').get()).rejects.toEqual({ statusCode: 500 });
    });
    
    it('should start a run', async () => {
        mockAxiosInstance.request.mockResolvedValue({ data: { data: { id: 'run-1' } } });
        await client.actor('a1').start();
        expect(mockAxiosInstance.request).toHaveBeenCalledWith(expect.objectContaining({
            method: 'POST',
            url: '/acts/a1/runs'
        }));
    });
  });

  describe('ActorCollectionClient', () => {
      it('should list actors', async () => {
          mockAxiosInstance.request.mockResolvedValue({ data: { data: { items: [] } } });
          await client.actors.list();
          expect(mockAxiosInstance.request).toHaveBeenCalledWith(expect.objectContaining({
              url: '/acts',
              method: 'GET'
          }));
      });
  });

  describe('RunClient', () => {
    it('should handle 404 in get()', async () => {
        mockAxiosInstance.request.mockRejectedValue({ statusCode: 404 });
        const run = await client.run('missing').get();
        expect(run).toBeUndefined();
    });

    it('should throw in get()', async () => {
        mockAxiosInstance.request.mockRejectedValue({ statusCode: 500 });
        await expect(client.run('broken').get()).rejects.toEqual({ statusCode: 500 });
    });

    it('should abort run', async () => {
        // Mock response structure with 'data' field because client expects ApifyResponse
        mockAxiosInstance.request.mockResolvedValue({ data: { data: { status: 'ABORTING' } } });
        const run = await client.run('r1').abort();
        expect(run.status).toBe('ABORTING');
    });

    it('should timeout in waitForFinish', async () => {
       // Mock response structure with 'data' field because client expects ApifyResponse
       mockAxiosInstance.request.mockResolvedValue({ data: { data: { status: 'RUNNING' } } });
       await expect(client.run('r1').waitForFinish({ timeoutSecs: 0.001, checkIntervalSecs: 0.001 }))
        .rejects.toThrow('Timeout waiting for run to finish');
    });
    
    it('should throw if run not found in waitForFinish', async () => {
        mockAxiosInstance.request.mockRejectedValue({ statusCode: 404 });
        await expect(client.run('r1').waitForFinish({ checkIntervalSecs: 0.1 }))
         .rejects.toThrow('Run r1 not found');
    });
    
    it('should stream log', async () => {
        mockAxiosInstance.request.mockResolvedValue({ data: 'log content' });
        await client.run('r1').streamLog();
        expect(mockAxiosInstance.request).toHaveBeenCalledWith(expect.objectContaining({
            url: '/logs/r1',
            params: { stream: true }
        }));
    });
  });

  describe('DatasetClient', () => {
      it('should handle 404 in get()', async () => {
          mockAxiosInstance.request.mockRejectedValue({ statusCode: 404 });
          const ds = await client.dataset('missing').get();
          expect(ds).toBeUndefined();
      });

      it('should throw in get()', async () => {
          mockAxiosInstance.request.mockRejectedValue({ statusCode: 500 });
          await expect(client.dataset('broken').get()).rejects.toEqual({ statusCode: 500 });
      });
      
      it('should get dataset details', async () => {
          mockAxiosInstance.request.mockResolvedValue({ data: { data: { id: 'd1' } } });
          const ds = await client.dataset('d1').get();
          expect(ds?.id).toBe('d1');
      });

      it('should list items as object', async () => {
          const resultObj = { items: [], total: 0, count: 0, offset: 0, limit: 10, desc: false };
          mockAxiosInstance.request.mockResolvedValue({ data: resultObj });
          const result = await client.dataset('d1').listItems();
          expect(result).toEqual(resultObj);
      });
  });
  
  describe('DatasetCollectionClient', () => {
      it('should list datasets', async () => {
          mockAxiosInstance.request.mockResolvedValue({ data: { data: { items: [] } } });
          await client.datasets.list();
          expect(mockAxiosInstance.request).toHaveBeenCalledWith(expect.objectContaining({
              url: '/datasets'
          }));
      });
      
      it('should get or create dataset', async () => {
          mockAxiosInstance.request.mockResolvedValue({ data: { data: { id: 'd1' } } });
          await client.datasets.getOrCreate('my-ds');
          expect(mockAxiosInstance.request).toHaveBeenCalledWith(expect.objectContaining({
              url: '/datasets',
              method: 'POST',
              params: { name: 'my-ds' }
          }));
      });
  });
});
