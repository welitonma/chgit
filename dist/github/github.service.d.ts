export declare class GithubService {
    private octokit;
    constructor();
    criarIssue(owner: string, repo: string, title: string, body: string, projectId?: string): Promise<Record<string, any>>;
    listarProjetosV2(login: string): Promise<any>;
    detalhesProjetoV2(projectId: string): Promise<any>;
    getRateLimit(): Promise<any>;
}
