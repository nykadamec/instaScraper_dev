import { HttpClient } from './http_client';
import { ActorClient, ActorCollectionClient } from './resource_clients/actor';
import { RunClient } from './resource_clients/run';
import { DatasetClient, DatasetCollectionClient } from './resource_clients/dataset';

export interface ApifyClientOptions {
  token?: string;
  baseUrl?: string;
}

export class ApifyClient {
  public readonly httpClient: HttpClient;
  public readonly actors: ActorCollectionClient;
  public readonly datasets: DatasetCollectionClient;

  constructor(options: ApifyClientOptions = {}) {
    const token = options.token || process.env.APIFY_TOKEN;
    this.httpClient = new HttpClient({
      token,
      baseUrl: options.baseUrl,
    });

    this.actors = new ActorCollectionClient(this.httpClient);
    this.datasets = new DatasetCollectionClient(this.httpClient);
  }

  public actor(id?: string): ActorClient {
    const actorId = id || process.env.APIFY_ACTOR_ID;
    if (!actorId) {
      throw new Error('Actor ID is required. Please provide it as an argument or set APIFY_ACTOR_ID environment variable.');
    }
    return new ActorClient(this.httpClient, actorId);
  }

  public run(id: string): RunClient {
    return new RunClient(this.httpClient, id);
  }

  public dataset(id: string): DatasetClient {
    return new DatasetClient(this.httpClient, id);
  }
}
