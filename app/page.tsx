'use client';

import { SpendTracker } from '@/components/SpendTracker';
import { TestPanel } from '@/components/TestPanel';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <SpendTracker />
      
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Spend Tracking Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor API costs for OpenRouter and Nano Banana Pro in real-time.
          </p>
        </header>

        <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h2 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Quick Start</h2>
          <ol className="list-decimal list-inside text-blue-800 dark:text-blue-400 space-y-1">
            <li>Copy <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">.env.example</code> to <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">.env.local</code></li>
            <li>Add your OpenRouter API key to test LLM cost tracking</li>
            <li>Use the test buttons below to verify cost capture</li>
            <li>Reload the page to verify persistence across sessions</li>
          </ol>
        </div>

        <TestPanel />
      </div>
    </main>
  );
}