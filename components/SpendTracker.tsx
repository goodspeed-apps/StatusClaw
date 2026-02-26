'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { AggregatedSpendData, TimePeriod } from '@/types/spend';
import { getAggregatedSpendData, clearAllSpendData } from '@/lib/spend';

const PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
];

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

export function SpendTracker() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('7d');
  const [spendData, setSpendData] = useState<AggregatedSpendData | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  useEffect(() => {
    // Initial load
    loadSpendData();

    // Listen for spend updates
    const handleSpendUpdate = () => {
      loadSpendData();
      setLastUpdated(Date.now());
    };

    window.addEventListener('spend-updated', handleSpendUpdate);

    // Refresh every minute to keep data current
    const interval = setInterval(loadSpendData, 60000);

    return () => {
      window.removeEventListener('spend-updated', handleSpendUpdate);
      clearInterval(interval);
    };
  }, [selectedPeriod]);

  const loadSpendData = () => {
    const data = getAggregatedSpendData(selectedPeriod);
    setSpendData(data);
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all spend data? This cannot be undone.')) {
      clearAllSpendData();
      loadSpendData();
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed top-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        title="Show spend tracker"
      >
        💰
      </button>
    );
  }

  const totalSpend = spendData?.totalSpend || 0;
  const llmSpend = spendData?.llmSpend || 0;
  const imageSpend = spendData?.imageSpend || 0;
  const totalRequests = spendData?.totalRequests || 0;

  // Prepare chart data
  const typeData = [
    { name: 'LLM', value: llmSpend, color: '#3b82f6' },
    { name: 'Image', value: imageSpend, color: '#8b5cf6' },
  ].filter(d => d.value > 0);

  const modelData = Object.entries(spendData?.byModel || {}).map(([model, data]) => ({
    name: model.split('/').pop() || model,
    fullName: model,
    cost: data.cost,
    requests: data.requests,
  })).sort((a, b) => b.cost - a.cost);

  const dailyTrendData = spendData?.dailyData.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    fullDate: day.date,
    total: day.totalSpend,
    llm: day.llmSpend,
    image: day.imageSpend,
  })) || [];

  const formatCurrencyValue = (val: number) => `$${val.toFixed(2)}`;

  return (
    <div className="fixed top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-[480px] max-h-[90vh] overflow-y-auto z-50">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Spend Tracking</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Monitor API costs across all sessions</p>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ×
        </button>
      </div>

      {/* Period Selector */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-1">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedPeriod(option.value)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedPeriod === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Total Spend */}
      <div className="mb-4">
        <div className="text-3xl font-bold text-green-600 dark:text-green-400">
          ${totalSpend.toFixed(4)}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {totalRequests} API calls
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">LLM Costs</div>
          <div className="text-lg font-semibold text-blue-900 dark:text-blue-300">${llmSpend.toFixed(4)}</div>
          <div className="text-xs text-blue-500 dark:text-blue-400">{spendData?.llmRequests || 0} requests</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
          <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">Image Costs</div>
          <div className="text-lg font-semibold text-purple-900 dark:text-purple-300">${imageSpend.toFixed(4)}</div>
          <div className="text-xs text-purple-500 dark:text-purple-400">{spendData?.imageRequests || 0} requests</div>
        </div>
      </div>

      {/* Charts */}
      {totalSpend > 0 ? (
        <div className="space-y-4">
          {/* Type Breakdown Pie Chart */}
          {typeData.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cost by Type</h4>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Model Breakdown Bar Chart */}
          {modelData.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cost by Model</h4>
              <ResponsiveContainer width="100%" height={Math.max(150, modelData.length * 30)}>
                <BarChart data={modelData.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={formatCurrencyValue} />
                  <YAxis type="category" dataKey="name" width={80} tick={{fontSize: 10}} />
                  <Tooltip formatter={(value) => [`$${Number(value || 0).toFixed(4)}`, 'Cost']} />
                  <Bar dataKey="cost" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Daily Trend Line Chart */}
          {dailyTrendData.length > 1 && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Daily Spend Trend</h4>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={dailyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{fontSize: 10}} />
                  <YAxis tickFormatter={formatCurrencyValue} tick={{fontSize: 10}} />
                  <Tooltip formatter={(value) => [`$${Number(value || 0).toFixed(4)}`, 'Cost']} />
                  <Legend />
                  <Line type="monotone" dataKey="llm" name="LLM" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="image" name="Image" stroke="#8b5cf6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Single Day Bar Chart (when only one day of data) */}
          {dailyTrendData.length === 1 && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Today&apos;s Spending</h4>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={dailyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={formatCurrencyValue} />
                  <Tooltip formatter={(value) => [`$${Number(value || 0).toFixed(4)}`, 'Cost']} />
                  <Bar dataKey="llm" name="LLM" fill="#3b82f6" />
                  <Bar dataKey="image" name="Image" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 text-center">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No spend data for this period yet.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Make some API calls to see your spending!
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Last updated: {new Date(lastUpdated).toLocaleTimeString()}
        </span>
        <button
          onClick={handleClearData}
          className="text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400"
        >
          Clear all data
        </button>
      </div>
    </div>
  );
}
