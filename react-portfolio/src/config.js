const rawUrl = import.meta.env.VITE_API_URL || '';
export const API_URL = rawUrl
    ? (rawUrl.endsWith('/api') ? rawUrl.replace(/\/+$/, '') : `${rawUrl.replace(/\/+$/, '')}/api`)
    : '/api';

