// API client for associations-api

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async getToken() {
    return window.electron.getToken();
  }

  async request(path, options = {}) {
    const token = await this.getToken();

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // User methods
  async getMe() {
    return this.request('/users/me');
  }

  async updateWordCount(count) {
    return this.request('/users/words', {
      method: 'POST',
      body: JSON.stringify({ count }),
    });
  }

  // Q&A methods
  async generateQuestion(excerpt, context) {
    return this.request('/qa/question', {
      method: 'POST',
      body: JSON.stringify({ excerpt, context }),
    });
  }

  // Stripe methods
  async createPortalSession() {
    return this.request('/stripe/portal', {
      method: 'POST',
    });
  }
}

export default new ApiClient();