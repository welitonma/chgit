import { GithubService } from './github.service';
import { CreateIssueDto } from './dto/create-issue.dto';
export declare class GithubController {
    private readonly githubService;
    constructor(githubService: GithubService);
    createIssue(dto: CreateIssueDto): Promise<Record<string, any>>;
    listarProjetos(login: string): Promise<any>;
    detalhesProjeto(projectId: string): Promise<any>;
    getRateLimit(): Promise<any>;
}
