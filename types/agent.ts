export interface AgentTask {
  id: string;
  name: string;
  description?: string;
  startedAt: number;
}

export type AgentStatus = 'active' | 'offline';

export interface Agent {
  id: string;
  name: string;
  avatar?: string;
  status: AgentStatus;
  currentTask?: AgentTask;
  lastSeenAt: number;
}

export interface AgentStatusResponse {
  agents: Agent[];
  updatedAt: number;
}
