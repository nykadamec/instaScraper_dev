import { HttpClient } from '../http_client';
import { PaginationList, PaginationOptions, ApifyResponse } from '../utils';

export interface Actor {
  id: string;
  name?: string;
  userId: string;
  createdAt: string;
  modifiedAt: string;
  defaultRunOptions?: Record<string, any>;
  exampleRunInput?: Record<string, any>;
  [key: string]: any;
}

export interface ActorRunOptions {
  build?: string;
  memory?: number;
  timeout?: number;
  waitForFinish?: number;
  webhooks?: any[];
}

export interface ActorRun {
  id: string;
  actId: string;
  userId: string;
  startedAt: string;
  finishedAt?: string;
  status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ABORTING' | 'ABORTED' | 'TIMED-OUT';
  defaultDatasetId: string;
  defaultKeyValueStoreId: string;
  defaultRequestQueueId: string;
  buildId?: string;
  exitCode?: number;
  [key: string]: any;
}

export class ActorClient {
  constructor(private readonly client: HttpClient, private readonly id: string) {}

  /**
   * Get actor details
   */
  async get(): Promise<Actor | undefined> {
    try {
      const response = await this.client.call<ApifyResponse<Actor>>({
        url: `/acts/${this.id}`,
        method: 'GET',
      });
      return response.data.data;
    } catch (e: any) {
      if (e.statusCode === 404) return undefined;
      throw e;
    }
  }

  /**
   * Run the actor
   */
  async call(input?: any, options: ActorRunOptions = {}): Promise<ActorRun> {
    const queryParams: Record<string, any> = {};
    if (options.build) queryParams.build = options.build;
    if (options.memory) queryParams.memory = options.memory;
    if (options.timeout) queryParams.timeout = options.timeout;
    if (options.waitForFinish) queryParams.waitForFinish = options.waitForFinish;

    const response = await this.client.call<ApifyResponse<ActorRun>>({
      url: `/acts/${this.id}/runs`,
      method: 'POST',
      params: queryParams,
      data: input,
    });
    return response.data.data;
  }
  
  /**
   * Start a run (alias for call but typically without waiting)
   */
  async start(input?: any, options: ActorRunOptions = {}): Promise<ActorRun> {
      return this.call(input, { ...options, waitForFinish: undefined });
  }
}

export class ActorCollectionClient {
  constructor(private readonly client: HttpClient) {}

  /**
   * List actors
   */
  async list(options: PaginationOptions = {}): Promise<PaginationList<Actor>> {
    const response = await this.client.call<ApifyResponse<PaginationList<Actor>>>({
      url: '/acts',
      method: 'GET',
      params: options,
    });
    return response.data.data;
  }
}
