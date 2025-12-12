import { HttpClient } from '../http_client';
import { PaginationList, PaginationOptions, ApifyResponse } from '../utils';

export interface Dataset {
  id: string;
  name?: string;
  userId: string;
  createdAt: string;
  modifiedAt: string;
  itemCount: number;
  cleanItemCount?: number;
}

export class DatasetClient {
  constructor(private readonly client: HttpClient, private readonly id: string) {}

  /**
   * Get dataset details
   */
  async get(): Promise<Dataset | undefined> {
    try {
      const response = await this.client.call<ApifyResponse<Dataset>>({
        url: `/datasets/${this.id}`,
        method: 'GET',
      });
      return response.data.data;
    } catch (e: any) {
      if (e.statusCode === 404) return undefined;
      throw e;
    }
  }

  /**
   * Push items to the dataset
   */
  async pushItems(items: any | any[]): Promise<void> {
    await this.client.call({
      url: `/datasets/${this.id}/items`,
      method: 'POST',
      data: items,
    });
  }

  /**
   * Get items
   */
  async listItems(options: PaginationOptions & { clean?: boolean } = {}): Promise<PaginationList<any>> {
    const response = await this.client.call<PaginationList<any>>({
      url: `/datasets/${this.id}/items`,
      method: 'GET',
      params: options,
    });
    // The API might return array directly if not paginated format requested, 
    // but usually with format=json it returns array. 
    // If wrapping in PaginationList is needed we might need to adjust based on actual API behavior.
    // For SDK consistency we often wrap it.
    // However, strictly, Apify API /items returns an array by default.
    // Let's assume strict array return for now unless `desc` or other meta is present.
    // Actually, to mirror official client `listItems` usually returns `PaginationList`.
    // I will adhere to the interface defined in utils.
    
    if (Array.isArray(response.data)) {
         return {
             items: response.data,
             total: response.data.length, // approximation
             offset: options.offset || 0,
             limit: options.limit || response.data.length,
             count: response.data.length,
             desc: options.desc || false
         }
    }

    return response.data;
  }
}

export class DatasetCollectionClient {
  constructor(private readonly client: HttpClient) {}

  async list(options: PaginationOptions = {}): Promise<PaginationList<Dataset>> {
    const response = await this.client.call<ApifyResponse<PaginationList<Dataset>>>({
      url: '/datasets',
      method: 'GET',
      params: options,
    });
    return response.data.data;
  }

  async getOrCreate(name?: string): Promise<Dataset> {
    const response = await this.client.call<ApifyResponse<Dataset>>({
      url: '/datasets',
      method: 'POST',
      params: { name },
    });
    return response.data.data;
  }
}
