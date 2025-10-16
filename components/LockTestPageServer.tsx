import React, { useState } from 'react';
import { runAllLockTests } from '../utils/test-lock';

export default function LockTestPageServer() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [testType, setTestType] = useState<'memory' | 'db' | null>(null);

  const captureConsole = () => {
    const originalLog = console.log;
    const originalError = console.error;
    const buf: string[] = [];
    console.log = (...args: any[]) => { buf.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')); originalLog(...args); };
    console.error = (...args: any[]) => { buf.push('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')); originalError(...args); };
    return { restore: () => { console.log = originalLog; console.error = originalError; }, get: () => buf };
  };

  const runMemoryTests = async () => {
    setIsRunning(true);
    setTestType('memory');
    setLogs([]);
    const cap = captureConsole();
    try { await runAllLockTests(); } catch (e) { console.error(e); } finally {
      const out = cap.get(); cap.restore(); setLogs(out); setIsRunning(false);
    }
  };

  const runDBTests = async () => {
    setIsRunning(true);
    setTestType('db');
    setLogs([]);
    try {
      const resp = await fetch('/api/tests/lock-db', { method: 'POST' });
      const j = await resp.json().catch(() => ({ success: false }));
      if (!resp.ok || !j.success) throw new Error(j.message || '서버 테스트 실행 실패');
      if (Array.isArray(j.logs)) setLogs(j.logs);
    } catch (e) {
      console.error('테스트 실행 오류:', e);
    } finally { setIsRunning(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Lock 테스트 대시보드</h1>
          <p className="text-gray-600">중복 예약 방지를 위한 Lock + DB 테스트를 실행합니다.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">메모리 기반 단위 테스트</h3>
            <p className="text-sm text-gray-600 mb-4">Lock Manager의 기본 동작을 검증합니다.</p>
            <button onClick={runMemoryTests} disabled={isRunning} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300">
              {isRunning && testType === 'memory' ? '실행 중…' : '메모리 테스트 실행'}
            </button>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">DB 통합 테스트</h3>
            <p className="text-sm text-gray-600 mb-4">서버에서 PlanetScale DB와 함께 실행합니다.</p>
            <button onClick={runDBTests} disabled={isRunning} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300">
              {isRunning && testType === 'db' ? '실행 중…' : 'DB 테스트 실행'}
            </button>
          </div>
        </div>

        {logs.length > 0 && (
          <div className="bg-gray-900 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">테스트 결과</h3>
              <button onClick={() => setLogs([])} className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm">지우기</button>
            </div>
            <div className="bg-gray-950 rounded p-4 overflow-auto max-h-[600px]">
              <pre className="text-sm font-mono text-gray-100 whitespace-pre-wrap">
                {logs.map((log, i) => (<div key={i}>{log}</div>))}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

