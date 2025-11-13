export class CreateIssueDto {
  owner: string;
  repo: string;
  title: string;
  body: string;
  projectId?: string; // Opcional: permite especificar o projeto v2
}
