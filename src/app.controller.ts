import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get('test')
  async test() {
    return await this.appService.test();
  }

  @Get('learn-aggregate')
  async aggregate1(@Query('stage') stage: string) {
    return await this.appService.learnAggregate(stage);
  }
}
