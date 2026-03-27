import { Controller, Get } from '@nestjs/common';
import { AppService } from '../app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getStatus(): { status: string; timestamp: number } {
    return this.appService.getStatus();
  }

  @Get('health')
  getHealth(): { status: string; timestamp: number; service: string } {
    return {
      ...this.appService.getStatus(),
      service: 'transactor',
    };
  }
}
