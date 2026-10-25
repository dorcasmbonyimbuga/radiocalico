// Centralized access to the server API
async function request(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `${path}: HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const fetchStream = () => request('/api/stream');
export const fetchNowPlaying = () => request('/api/now-playing');
export const fetchRating = (songId) => request(`/api/songs/${songId}/rating`);
export const sendVote = (songId, value) =>
  request(`/api/songs/${songId}/rating`, { method: 'PUT', body: JSON.stringify({ value }) });
