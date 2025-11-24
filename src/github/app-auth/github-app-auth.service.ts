import { Injectable, Logger } from '@nestjs/common';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from 'octokit';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubAppAuthService {
  private readonly logger = new Logger(GithubAppAuthService.name);
  private octokit: Octokit | null = null;

  constructor(private readonly configService: ConfigService) {}

  async getOctokit(): Promise<Octokit> {
    if (this.octokit) return this.octokit;

    const appId = this.configService.get<string>('GITHUB_APP_ID');
    const installationId = this.configService.get<string>(
      'GITHUB_APP_INSTALLATION_ID',
    );
    const privateKeyPath = this.configService.get<string>(
      'GITHUB_APP_PRIVATE_KEY_PATH',
    );
    if (!appId || !installationId || !privateKeyPath) {
      throw new Error(
        'GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID ou GITHUB_APP_PRIVATE_KEY_PATH não definidos',
      );
    }
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

    const auth = createAppAuth({
      appId,
      privateKey,
      installationId,
    });

    const installationAuthentication = await auth({
      type: 'installation',
      installationId: Number(installationId),
    });

    this.octokit = new Octokit({ auth: installationAuthentication.token });
    this.logger.log('Octokit autenticado como GitHub App');
    return this.octokit;
  }
}
