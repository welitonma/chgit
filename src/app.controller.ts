import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Status')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Status da API' })
  @ApiResponse({ status: 200, description: 'Retorna o status da API (string)' })
  getStatus(): string {
    return this.appService.getStatus();
  }
}
