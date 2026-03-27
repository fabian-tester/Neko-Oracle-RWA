import { Injectable, Logger, OnModuleDestroy, OnApplicationBootstrap } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { WebSocketServer } from 'ws';

@Injectable()
export class IngestorWsService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(IngestorWsService.name);
  private wss: WebSocketServer | null = null;

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  onApplicationBootstrap(): void {
    const httpServer = this.httpAdapterHost.httpAdapter.getHttpServer();

    this.wss = new WebSocketServer({
      server: httpServer,
    });

    this.wss.on('connection', () => {
      this.logger.log('WebSocket client connected');
    });

    this.wss.on('error', err => {
      this.logger.error(`WebSocket server error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    });

    this.logger.log('WebSocket server started');
  }

  onModuleDestroy(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }

  broadcastJson(payload: unknown): void {
    if (!this.wss) return;
    const message = JSON.stringify(payload);

    for (const client of this.wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    }
  }
}

