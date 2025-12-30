// Detect if running in Electron (via file protocol or user agent)
export const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:3002' : '';
