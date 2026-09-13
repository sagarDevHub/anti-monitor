import { Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import { APIKeyService } from './api-key.services';

@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: APIKeyService) {}

  @Post()
  async createApiKey(@Req() req: any) {
    return this.apiKeyService.createApiKey(
      req.user?.id ?? 'user_3J09Yv954H7GfceNor7NimGLezj',
    );
  }

  @Get()
  async listApiKeys(@Req() req: any) {
    return this.apiKeyService.listApiKeys(
      req.user?.id ?? 'user_3J09Yv954H7GfceNor7NimGLezj',
    );
  }

  @Get(':id')
  async apiKeyLastUsed(@Req() req: any, @Param('id') id: string) {
    return this.apiKeyService.getApiKeyLastused(id);
  }

  @Delete(':id')
  async deleteApiKey(@Req() req: any, @Param('id') id: string) {
    return this.apiKeyService.deleteApiKey(
      'user_3J09Yv954H7GfceNor7NimGLezj',
      id,
    );
  }

  @Post(':id/regenerate')
  async regenerateApiKey(@Req() req: any, @Param('id') id: string) {
    return this.apiKeyService.regenerateApiKey(req.user.id, id);
  }
}
