/**
 * Generic API client for making requests to the bridge API
 */

const BASE_URL = 'https://api.bridge.layeredge.io/';

interface ApiOptions {
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

/**
 * Make a request to the bridge API
 * @param path The API endpoint path (without the base URL)
 * @param options Optional request configuration
 * @returns The API response data
 */
export async function apiRequest<T>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  options: ApiOptions = {},
  body?: any,
): Promise<T> {
  const url = new URL(path, BASE_URL);

  // Add query parameters if provided
  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      console.error(`API request failed: ${response.status} ${response.statusText}`);
      return null as unknown as T;
    }

    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    return null as unknown as T;
  }
}

/**
 * Make a GET request to the bridge API
 */
export function get<T>(path: string, options?: ApiOptions): Promise<T> {
  return apiRequest<T>(path, 'GET', options);
}

/**
 * Make a POST request to the bridge API
 */
export function post<T>(path: string, body: any, options?: ApiOptions): Promise<T> {
  return apiRequest<T>(path, 'POST', options, body);
}

/**
 * Make a PUT request to the bridge API
 */
export function put<T>(path: string, body: any, options?: ApiOptions): Promise<T> {
  return apiRequest<T>(path, 'PUT', options, body);
}

/**
 * Make a DELETE request to the bridge API
 */
export function del<T>(path: string, options?: ApiOptions): Promise<T> {
  return apiRequest<T>(path, 'DELETE', options);
}
