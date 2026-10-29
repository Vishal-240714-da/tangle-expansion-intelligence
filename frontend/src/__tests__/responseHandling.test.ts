import { describe, it, expect } from 'vitest';

/**
 * Helper recreating the exact response-parsing and error-handling logic
 * utilized across AnalysisForm.tsx and AnalysisDashboard.tsx
 */
async function parseResponseSafely<T = unknown>(response: Response): Promise<{
  ok: boolean;
  data: T | null;
  errorMessage: string | null;
}> {
  let responseText = '';
  try {
    responseText = await response.text();
  } catch {
    responseText = '';
  }

  let responseJson: { data?: T; message?: string; error?: string } | null = null;
  if (responseText.trim().length > 0) {
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      // Non-JSON response
    }
  }

  if (!response.ok) {
    let errorMessage = '';
    if (responseJson && typeof responseJson === 'object' && (responseJson.message || responseJson.error)) {
      errorMessage = responseJson.message || responseJson.error || '';
    } else if (responseText.trim().length > 0 && responseText.length < 250 && !responseText.includes('<html')) {
      errorMessage = responseText.trim();
    } else if (response.status === 429) {
      errorMessage = 'Rate limit reached. Please wait a few moments before trying again.';
    } else if (response.status === 404) {
      errorMessage = 'The analysis endpoint was not found (HTTP 404).';
    } else if (response.status >= 500) {
      errorMessage = `Backend server error (HTTP ${response.status}). Please verify the backend service is running.`;
    } else {
      errorMessage = `Analysis request failed (HTTP ${response.status}: ${response.statusText || 'Error'}).`;
    }

    return {
      ok: false,
      data: null,
      errorMessage,
    };
  }

  if (!responseJson || typeof responseJson !== 'object' || !responseJson.data) {
    return {
      ok: false,
      data: null,
      errorMessage: 'Received an empty or invalid analysis response from the server.',
    };
  }

  return {
    ok: true,
    data: responseJson.data,
    errorMessage: null,
  };
}

describe('Frontend API Safe Response Parsing', () => {
  it('handles completely empty 200 response body without throwing Unexpected end of JSON input', async () => {
    const emptyResponse = new Response('', { status: 200, statusText: 'OK' });
    const result = await parseResponseSafely(emptyResponse);

    expect(result.ok).toBe(false);
    expect(result.data).toBeNull();
    expect(result.errorMessage).toBe('Received an empty or invalid analysis response from the server.');
  });

  it('handles completely empty 500 error response without crashing on response.json()', async () => {
    const empty500Response = new Response('', { status: 500, statusText: 'Internal Server Error' });
    const result = await parseResponseSafely(empty500Response);

    expect(result.ok).toBe(false);
    expect(result.data).toBeNull();
    expect(result.errorMessage).toContain('Backend server error (HTTP 500)');
  });

  it('handles HTML error page (e.g. 502/504 Bad Gateway from proxy) without JSON parsing exception', async () => {
    const htmlResponse = new Response('<html><body>504 Gateway Timeout</body></html>', {
      status: 504,
      statusText: 'Gateway Timeout',
      headers: { 'Content-Type': 'text/html' },
    });
    const result = await parseResponseSafely(htmlResponse);

    expect(result.ok).toBe(false);
    expect(result.data).toBeNull();
    expect(result.errorMessage).toContain('Backend server error (HTTP 504)');
  });

  it('extracts backend error message when backend returns JSON error payload', async () => {
    const errorPayload = JSON.stringify({
      status: 'error',
      message: 'Validation error: Target city is required',
    });
    const errorResponse = new Response(errorPayload, {
      status: 400,
      statusText: 'Bad Request',
      headers: { 'Content-Type': 'application/json' },
    });
    const result = await parseResponseSafely(errorResponse);

    expect(result.ok).toBe(false);
    expect(result.data).toBeNull();
    expect(result.errorMessage).toBe('Validation error: Target city is required');
  });

  it('correctly handles 404 Not Found error responses', async () => {
    const notFoundPayload = JSON.stringify({
      status: 'error',
      message: 'Analysis not found',
    });
    const response = new Response(notFoundPayload, { status: 404, statusText: 'Not Found' });
    const result = await parseResponseSafely(response);

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toBe('Analysis not found');
  });

  it('correctly parses successful analysis JSON payload', async () => {
    const successPayload = JSON.stringify({
      success: true,
      data: {
        id: 'analysis-12345',
        businessInput: { targetCity: 'Coimbatore' },
        confidence: { score: 85 },
      },
    });
    const response = new Response(successPayload, { status: 200, statusText: 'OK' });
    const result = await parseResponseSafely(response);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      id: 'analysis-12345',
      businessInput: { targetCity: 'Coimbatore' },
      confidence: { score: 85 },
    });
    expect(result.errorMessage).toBeNull();
  });
});
