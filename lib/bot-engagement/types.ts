export type BotMode = 'draft' | 'auto_publish' | 'publish_approved';
export type QueueStatus = 'pending' | 'drafted' | 'approved' | 'published' | 'rejected' | 'failed' | 'skipped';
export type ActionType = 'social_comment' | 'poll_comment' | 'fund_comment' | 'project_update';
export type TargetTable = 'social_posts' | 'policy_polls' | 'public_funds' | 'public_projects';

export interface BotPersona {
    id: string;
    full_name: string | null;
    username: string | null;
    county: string | null;
    bio: string | null;
    learning_interests: string[] | null;
    focus_path: string | null;
}

export interface QueueItem {
    id: string;
    persona_user_id: string | null;
    target_table: TargetTable;
    target_record_id: string;
    action_type: ActionType;
    status: QueueStatus;
    draft_content: string | null;
    metadata: Record<string, any>;
}

export interface TargetContext {
    id: string;
    table: TargetTable;
    title: string;
    body: string;
    county?: string | null;
    extra?: Record<string, any>;
}

export interface RunOptions {
    mode?: BotMode;
    limit?: number;
    planIfEmpty?: boolean;
}

export interface RunResult {
    runId: string;
    mode: BotMode;
    plannedCount: number;
    draftedCount: number;
    publishedCount: number;
    failedCount: number;
    skippedCount: number;
}
