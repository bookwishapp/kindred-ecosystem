// Auth state store (placeholder for now)
// In production, this would use a state management library

class AuthStore {
  constructor() {
    this.token = null;
    this.user = null;
  }

  async loadToken() {
    this.token = await window.electron.getToken();
    return !!this.token;
  }

  async saveToken(token) {
    this.token = token;
    return window.electron.saveToken(token);
  }

  async clearToken() {
    this.token = null;
    this.user = null;
    return window.electron.clearToken();
  }
}

export default new AuthStore();