import React from 'react';

/**
 * 마크다운 텍스트를 React 컴포넌트로 렌더링하는 공통 유틸리티
 * 지원하는 문법:
 * - 제목: # ## ###
 * - 인용구: > 텍스트
 * - 코드 블록: ```
 * - 리스트: - 항목, 1. 항목
 * - 인라인: **굵게**, *기울임*, `코드`, [링크](url)
 */
export const renderMarkdown = (text: string): React.ReactNode[] => {
  return text.split('\n').map((line, index) => {
    // 제목: # ## ###
    if (line.startsWith('# ')) {
      return <h1 key={index} className="text-3xl font-bold mt-8 mb-4">{line.substring(2)}</h1>;
    } else if (line.startsWith('## ')) {
      return <h2 key={index} className="text-2xl font-bold mt-6 mb-3">{line.substring(3)}</h2>;
    } else if (line.startsWith('### ')) {
      return <h3 key={index} className="text-xl font-bold mt-4 mb-2">{line.substring(4)}</h3>;
    }

    // 인용구: > 텍스트
    else if (line.startsWith('> ')) {
      return (
        <blockquote key={index} className="border-l-4 border-purple-500 pl-4 my-4 italic text-gray-700">
          {line.substring(2)}
        </blockquote>
      );
    }

    // 코드 블록: ```
    else if (line.startsWith('```')) {
      return <code key={index} className="block bg-gray-100 p-4 rounded my-4 font-mono text-sm">{line.substring(3)}</code>;
    }

    // 리스트: - 또는 숫자
    else if (line.startsWith('- ')) {
      return <li key={index} className="ml-6 my-1 list-disc">{line.substring(2)}</li>;
    } else if (line.match(/^\d+\./)) {
      return <li key={index} className="ml-6 my-1 list-decimal">{line.substring(line.indexOf('.') + 2)}</li>;
    }

    // 빈 줄
    else if (line.trim() === '') {
      return <br key={index} />;
    }

    // 일반 텍스트 (인라인 마크다운 처리)
    else {
      let processed = line;

      // **굵게** 처리
      processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      // *기울임* 처리
      processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');

      // `코드` 처리
      processed = processed.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-purple-600">$1</code>');

      // [링크](url) 처리
      processed = processed.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-purple-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

      return (
        <p
          key={index}
          className="my-4 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: processed }}
        />
      );
    }
  });
};
