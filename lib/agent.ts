import { Agent, AgentStatus, AgentTask } from '@/types/agent';

/**
 * Mock agents data for demo/testing purposes.
 * In production, this would fetch from an actual API endpoint.
 */
export const getMockAgents = (): Agent[] => {
  const now = Date.now();
  
  return [
    {
      id: 'agent-1',
      name: 'Web Developer',
      avatar: '👨‍💻',
      status: 'active',
      currentTask: {
        id: 'task-1',
        name: 'Building dashboard components',
        description: 'Implementing agent status indicators',
        startedAt: now - 1000 * 60 * 15, // 15 minutes ago
      },
      lastSeenAt: now,
    },
    {
      id: 'agent-2',
      name: 'DevOps Agent',
      avatar: '🚀',
      status: 'active',
      currentTask: {
        id: 'task-2',
        name: 'Deploying to Vercel',
        description: 'Monitoring deployment pipeline',
        startedAt: now - 1000 * 60 * 5, // 5 minutes ago
      },
      lastSeenAt: now,
    },
    {
      id: 'agent-3',
      name: 'Code Reviewer',
      avatar: '🔍',
      status: 'offline',
      lastSeenAt: now - 1000 * 60 * 60 * 2, // 2 hours ago
    },
    {
      id: 'agent-4',
      name: 'Test Agent',
      avatar: '🧪',
      status: 'offline',
      lastSeenAt: now - 1000 * 60 * 30, // 30 minutes ago
    },
  ];
};

/**
 * Fetch agent status from API.
 * Falls back to mock data if no API endpoint is configured.
 */
export const fetchAgentStatus = async (): Promise<Agent[]> => {
  try {
    // Try to fetch from API endpoint if available
    const response = await fetch('/api/agents/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch agent status');
    }
    
    const data = await response.json();
    return data.agents;
  } catch {
    // Fallback to mock data for demo/testing
    return getMockAgents();
  }
};

/**
 * Format a timestamp to a human-readable relative time.
 */
export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

/**
 * Get status color classes for the badge.
 */
export const getStatusColorClasses = (status: AgentStatus): string => {
  switch (status) {
    case 'active':
      return 'bg-green-500 text-white';
    case 'offline':
      return 'bg-gray-400 text-white';
    default:
      return 'bg-gray-400 text-white';
  }
};

/**
 * Get status dot color class.
 */
export const getStatusDotColor = (status: AgentStatus): string => {
  switch (status) {
    case 'active':
      return 'bg-green-500';
    case 'offline':
      return 'bg-gray-400';
    default:
      return 'bg-gray-400';
  }
};

/**
 * Get human-readable status label.
 */
export const getStatusLabel = (status: AgentStatus): string => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'offline':
      return 'Offline';
    default:
      return 'Unknown';
  }
};
