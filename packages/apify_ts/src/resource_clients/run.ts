import { HttpClient } from '../http_client';
import { ActorRun } from './actor';
import { EventEmitter } from 'events';
import { ApifyResponse } from '../utils';

export class RunClient {
  constructor(private readonly client: HttpClient, private readonly id: string) {}

  /**
   * Get run details
   */
  async get(): Promise<ActorRun | undefined> {
    try {
      const response = await this.client.call<ApifyResponse<ActorRun>>({
        url: `/actor-runs/${this.id}`,
        method: 'GET',
      });
      return response.data.data;
    } catch (e: any) {
      if (e.statusCode === 404) return undefined;
      throw e;
    }
  }

  /**
   * Abort the run
   */
  async abort(): Promise<ActorRun> {
    const response = await this.client.call<ApifyResponse<ActorRun>>({
      url: `/actor-runs/${this.id}/abort`,
      method: 'POST',
    });
    return response.data.data;
  }

  /**
   * Wait for the run to finish
   */
  async waitForFinish(options: { checkIntervalSecs?: number; timeoutSecs?: number } = {}): Promise<ActorRun> {
    const { checkIntervalSecs = 2, timeoutSecs } = options;
    const start = Date.now();

    while (true) {
      const run = await this.get();
      if (!run) throw new Error(`Run ${this.id} not found`);

      if (['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(run.status)) {
        return run;
      }

      if (timeoutSecs && (Date.now() - start) / 1000 > timeoutSecs) {
        throw new Error('Timeout waiting for run to finish');
      }

      await new Promise((resolve) => setTimeout(resolve, checkIntervalSecs * 1000));
    }
  }

  /**
   * Stream logs
   * Returns a Node.js Readable stream of the log
   */
  async streamLog(): Promise<NodeJS.ReadableStream> {
    const response = await this.client.call<NodeJS.ReadableStream>({
      url: `/logs/${this.id}`,
      method: 'GET',
      responseType: 'stream',
      params: { stream: true },
    });
    return response.data;
  }
}
