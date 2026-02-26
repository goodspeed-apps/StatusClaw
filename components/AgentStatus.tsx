'use client';

import { useState, useEffect, useCallback } from 'react';
import { Agent, AgentStatus } from '@/types/agent';
import { 
  fetchAgentStatus, 
  formatRelativeTime, 
  getStatusColorClasses,
  getStatusDotColor,
  getStatusLabel,
} from '@/lib/agent';

interface AgentStatusIndicatorProps {
  agent: Agent;
}

function AgentStatusIndicator({ agent }: AgentStatusIndicatorProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      {/* Avatar */}
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl">
        {agent.avatar || '🤖'}
      </div>
      
      {/* Agent Info */}
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {agent.name}
          </h3>
          
          {/* Status Badge */}
          <span 
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColorClasses(agent.status)}`}
          >
            {/* Status Dot */}
            <span className={`w-2 h-2 rounded-full ${getStatusDotColor(agent.status)} ${agent.status === 'active' ? 'animate-pulse' : ''}`} />
            {getStatusLabel(agent.status)}
          </span>
        </div>
        
        {/* Current Task or Last Seen */}
        {agent.status === 'active' && agent.currentTask ? (
          <div className="mt-1">
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              <span className="font-medium">Task:</span> {agent.currentTask.name}
            </p>
            {agent.currentTask.description && (
              <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                {agent.currentTask.description}
              </p>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Started {formatRelativeTime(agent.currentTask.startedAt)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Last seen {formatRelativeTime(agent.lastSeenAt)}
          </p>
        )}
      </div>
    </div>
  );
}

interface AgentStatusPanelProps {
  refreshInterval?: number; // in milliseconds
}

export function AgentStatusPanel({ refreshInterval = 30000 }: AgentStatusPanelProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAgentStatus();
      setAgents(data);
      setLastUpdated(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agent status');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;
    
    const interval = setInterval(loadAgents, refreshInterval);
    return () => clearInterval(interval);
  }, [loadAgents, refreshInterval]);

  // Count agents by status
  const activeCount = agents.filter(a => a.status === 'active').length;
  const offlineCount = agents.filter(a => a.status === 'offline').length;

  if (loading && agents.length === 0) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center h-32">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            Loading agents...
          </div>
        </div>
      </div>
    );
  }

  if (error && agents.length === 0) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button 
          onClick={loadAgents}
          className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Agent Status
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {activeCount} active, {offlineCount} offline
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {lastUpdated > 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Updated {formatRelativeTime(lastUpdated)}
              </span>
            )}
            <button
              onClick={loadAgents}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <svg 
                className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Agent List */}
      <div className="p-4 space-y-3">
        {agents.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            No agents found
          </p>
        ) : (
          agents.map(agent => (
            <AgentStatusIndicator key={agent.id} agent={agent} />
          ))
        )}
      </div>
      
      {/* Legend */}
      <div className="px-6 py-3 bg-gray-100 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>Active: Working on task</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            <span>Offline: No active task</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentStatusPanel;
