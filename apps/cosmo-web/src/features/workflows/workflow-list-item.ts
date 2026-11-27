export interface WorkflowListItem {
    id: string;
    title: string;
    summary: string;
    updatedAt: Date;
    latestVersion?: number;
}
