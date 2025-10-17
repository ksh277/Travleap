/**
 * 공통 Fetch Wrapper - JSON 파싱 에러 및 HTTP 에러 처리
 *
 * 문제 해결:
 * - "Unexpected token 'A'" 에러 (서버가 JSON 대신 HTML/텍스트 반환)
 * - 500 에러 시 올바른 에러 메시지 표시
 * - CORS 에러 처리
 * - 네트워크 에러 처리
 */

export interface FetcherOptions extends RequestInit {
  /** 에러 발생 시 자동으로 throw 할지 여부 (default: true) */
  throwOnError?: boolean;
  /** 타임아웃 시간 (ms, default: 30000) */
  timeout?: number;
}

export interface FetcherResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  isJson: boolean;
}

/**
 * 안전한 fetch wrapper - JSON 파싱 에러 방지
 */
export async function fetcher<T = any>(
  url: string,
  options: FetcherOptions = {}
): Promise<FetcherResponse<T>> {
  const {
    throwOnError = true,
    timeout = 30000,
    ...fetchOptions
  } = options;

  try {
    // 타임아웃 설정
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Content-Type 확인
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json') || false;

    // 응답 본문 읽기
    let data: any;
    let error: string | undefined;

    if (isJson) {
      try {
        data = await response.json();

        // API 응답이 {success: false, error: "..."} 형식인 경우 처리
        if (data && typeof data === 'object' && data.success === false) {
          error = data.error || data.message || '알 수 없는 오류가 발생했습니다.';
        }
      } catch (jsonError) {
        console.error('JSON 파싱 에러:', jsonError);
        error = 'JSON 파싱에 실패했습니다.';
        isJson && console.warn('Content-Type은 JSON이지만 파싱 실패:', url);
      }
    } else {
      // JSON이 아닌 경우 (HTML, 텍스트 등)
      const text = await response.text();
      console.warn(`⚠️ 예상치 못한 응답 타입 (${contentType}):`, url);
      console.warn('응답 본문:', text.substring(0, 200));

      error = `서버가 잘못된 형식으로 응답했습니다. (Content-Type: ${contentType || 'unknown'})`;
      data = text;
    }

    // HTTP 에러 상태 코드 처리
    if (!response.ok) {
      if (!error) {
        error = getHttpErrorMessage(response.status);
      }

      if (throwOnError) {
        throw new Error(error);
      }

      return {
        ok: false,
        status: response.status,
        error,
        isJson,
      };
    }

    // 성공
    return {
      ok: true,
      status: response.status,
      data: data?.data || data, // {success: true, data: {...}} 형식 지원
      isJson,
    };

  } catch (err) {
    const error = err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.';

    console.error('❌ Fetch 에러:', {
      url,
      error,
      originalError: err,
    });

    if (throwOnError) {
      throw err;
    }

    return {
      ok: false,
      status: 0,
      error,
      isJson: false,
    };
  }
}

/**
 * HTTP 상태 코드별 에러 메시지
 */
function getHttpErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return '잘못된 요청입니다.';
    case 401:
      return '인증이 필요합니다.';
    case 403:
      return '접근 권한이 없습니다.';
    case 404:
      return '요청한 리소스를 찾을 수 없습니다.';
    case 500:
      return '서버 오류가 발생했습니다.';
    case 502:
      return '게이트웨이 오류가 발생했습니다.';
    case 503:
      return '서비스를 사용할 수 없습니다.';
    case 504:
      return '게이트웨이 시간 초과입니다.';
    default:
      return `HTTP 오류 (${status})가 발생했습니다.`;
  }
}

/**
 * GET 요청 헬퍼
 */
export async function fetcherGet<T = any>(url: string, options?: FetcherOptions) {
  return fetcher<T>(url, { ...options, method: 'GET' });
}

/**
 * POST 요청 헬퍼
 */
export async function fetcherPost<T = any>(url: string, body?: any, options?: FetcherOptions) {
  return fetcher<T>(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT 요청 헬퍼
 */
export async function fetcherPut<T = any>(url: string, body?: any, options?: FetcherOptions) {
  return fetcher<T>(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE 요청 헬퍼
 */
export async function fetcherDelete<T = any>(url: string, options?: FetcherOptions) {
  return fetcher<T>(url, { ...options, method: 'DELETE' });
}
