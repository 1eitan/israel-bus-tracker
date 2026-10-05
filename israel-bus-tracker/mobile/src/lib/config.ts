const api = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

export const API_BASE = api;
export const SOCKET_URL = (process.env.EXPO_PUBLIC_SOCKET_URL ?? api).replace(/\/$/, '');
export const NEARBY_RADIUS_M = 500;
export const NEARBY_POLL_MS = 15000;
