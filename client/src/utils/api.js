/**
 * Authenticated fetch wrapper.
 * - Adds Authorization header from localStorage token
 * - Adds Content-Type: application/json for non-FormData requests
 * - On 401, clears token and redirects to /login
 * - Returns the native Response object (drop-in replacement for fetch)
 */
export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('estatereach_token');

  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Only set Content-Type for non-FormData bodies
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('estatereach_token');
    localStorage.removeItem('estatereach_user');
    window.location.href = '/login';
    // Return the response anyway in case caller wants to handle it
    return response;
  }

  return response;
}
