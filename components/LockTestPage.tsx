/**
 * Lock 테스트 데모 페이지
 *
 * 브라우저에서 버튼 클릭으로 Lock + DB 통합 테스트 실행
 */

import { useState } from 'react';
import { runAllLockTests } from '../utils/test-lock';

export default function LockTestPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [testType, setTestType] = useState<'memory' | 'db' | null>(null);

  // 콘솔 캡처 유틸리티
  const captureConsole = () => {
    const originalLog = console.log;
    const originalError = console.error;

    const logBuffer: string[] = [];

    console.log = (...args: any[]) => {
      const message = args
        .map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(' ');
      logBuffer.push(message);
      originalLog(...args);
    };

    console.error = (...args: any[]) => {
      const message =
        '[ERROR] ' +
        args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg))).join(' ');
      logBuffer.push(message);
      originalError(...args);
    };

    return {
      restore: () => {
        console.log = originalLog;
        console.error = originalError;
      },
      getLogs: () => logBuffer,
    };
  };

  const runMemoryTests = async () => {
    setIsRunning(true);
    setTestType('memory');
    setLogs([]);

    const capture = captureConsole();
    try {
      await runAllLockTests();
    } catch (error) {
      console.error('메모리 테스트 실행 오류:', error);
    } finally {
      const capturedLogs = capture.getLogs();
      capture.restore();
      setLogs(capturedLogs);
      setIsRunning(false);
    }
  };

  const runDBTests = async () => {
    setIsRunning(true);
    setTestType('db');
    setLogs([]);
    try {
      const resp = await fetch('/api/tests/lock-db', { method: 'POST' });
      const j = (await resp.json().catch(() => ({ success: false }))) as any;
      if (!resp.ok || !j.success) {
        throw new Error(j.message || '서버 테스트 실행 실패');
      }
      if (Array.isArray(j.logs)) setLogs(j.logs);
    } catch (error) {
      console.error('DB 테스트 실행 오류:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">동시성 Lock 테스트</h1>
          <p className="text-gray-600">간단한 예약 시나리오로 Lock Manager의 동시 처리 동작을 검증합니다.</p>
        </div>

        {/* 테스트 실행 버튼 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* 메모리 기반 테스트 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">메모리 기반 테스트</h3>
                <p className="text-sm text-gray-600 mb-4">Lock Manager의 메모리 모드로 동시성 동작을 확인합니다 (DB 미사용).</p>
                <ul className="text-sm text-gray-600 space-y-1 mb-4">
                  <li>동시에 Lock 획득 (첫 번째만 성공)</li>
                  <li>TTL 설정 및 만료(2~3초)</li>
                </ul>
                <button
                  onClick={runMemoryTests}
                  disabled={isRunning}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isRunning && testType === 'memory' ? '실행 중...' : '메모리 테스트 실행'}
                </button>
              </div>
            </div>
          </div>

          {/* 실제 DB 연동 테스트 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4v10c0 2.21-3.582 4-8 4s-8-1.79-8-4V7m0 5c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">실제 DB 연동 테스트</h3>
                <p className="text-sm text-gray-600 mb-4">실제 PlanetScale DB와 연동하여 예약 시나리오를 재현합니다.</p>
                <ul className="text-sm text-gray-600 space-y-1 mb-4">
                  <li>동시에 예약 시도 (2명 중 1명만 성공)</li>
                  <li>예약 확정/취소 확인 (Lock 해제 검증)</li>
                  <li>연속 요청 시나리오 (5회 예약 후 6번째 실패)</li>
                </ul>
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                  <p className="text-xs text-yellow-800">주의: 테스트 DB에서만 실행해 주세요. 운영 DB에는 부하가 될 수 있습니다.</p>
                </div>
                <button
                  onClick={runDBTests}
                  disabled={isRunning}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isRunning && testType === 'db' ? '실행 중...' : 'DB 테스트 실행'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 테스트 결과 */}
        {logs.length > 0 && (
          <div className="bg-gray-900 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">테스트 결과</h3>
              <button onClick={() => setLogs([])} className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm">
                지우기
              </button>
            </div>
            <div className="bg-gray-950 rounded p-4 overflow-auto max-h-[600px]">
              <pre className="text-sm font-mono text-gray-100 whitespace-pre-wrap">
                {logs.map((log, index) => {
                  let color = 'text-gray-100';
                  if (log.includes('PASS')) color = 'text-green-400';
                  else if (log.includes('FAIL') || log.includes('[ERROR]')) color = 'text-red-400';
                  else if (log.includes('주의')) color = 'text-yellow-400';
                  return (
                    <div key={index} className={color}>
                      {log}
                    </div>
                  );
                })}
              </pre>
            </div>
          </div>
        )}

        {/* 도움말 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">사용 방법</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>
              <strong>1. 메모리 기반 테스트</strong> Lock Manager의 기본 동작이 올바른지 검증합니다. 약 3초가 소요됩니다.
            </p>
            <p>
              <strong>2. DB 연동 테스트</strong> 실제 예약 시나리오와 DB 연동을 확인합니다. 약 10초가 소요됩니다.
            </p>
            <p>
              <strong>3. 기대 결과:</strong> 모든 테스트 항목에 "PASS"가 표시되고, 동시에 예약 시 1명만 성공해야 합니다.
            </p>
            <p>
              <strong>4. 추가 확인</strong> F12를 눌러 개발자도구 콘솔에서 로그를 확인하실 수 있습니다.
            </p>
            <p className="mt-4 pt-4 border-t border-blue-200">
              <strong>도움되는 명령</strong>
            </p>

            <code className="block bg-blue-100 p-2 rounded mt-2">
              testLock() // 메모리 기반 테스트
              <br />
              testLockDB() // DB 통합 테스트
              <br />
              lockManager.getStats() // Lock 상태 조회
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

