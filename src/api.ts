import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

// Default to localhost:3100 (Space Web dev server)
// Users can change via Settings or localStorage
const API_BASE = localStorage.getItem('jarvis_api_base') || 'http://localhost:3100';

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('jarvis_session_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('jarvis_session_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('jarvis_session_token');
    localStorage.removeItem('jarvis_cached_user');
  }

  cacheUser(user: User) {
    localStorage.setItem('jarvis_cached_user', JSON.stringify(user));
  }

  getCachedUser(): User | null {
    try {
      const s = localStorage.getItem('jarvis_cached_user');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }

  getBaseUrl(): string {
    return API_BASE;
  }

  setBaseUrl(url: string) {
    localStorage.setItem('jarvis_api_base', url);
    window.location.reload();
  }

  async request<T>(path: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;
    const url = `${API_BASE}${path}`;
    const fetchHeaders: Record<string, string> = {
      ...headers,
    };

    if (this.token) {
      fetchHeaders['Authorization'] = `Bearer ${this.token}`;
    }

    if (body && !(body instanceof FormData)) {
      fetchHeaders['Content-Type'] = 'application/json';
    }

    let res: Response;
    try {
      res = await tauriFetch(url, {
        method,
        headers: fetchHeaders,
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      throw new Error(`网络错误: ${networkErr instanceof Error ? networkErr.message : String(networkErr)}`);
    }

    if (res.status === 401) {
      this.clearToken();
      throw new Error('登录已过期，请重新登录');
    }

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const errBody = await res.json();
        errMsg = errBody.error || errBody.message || errMsg;
      } catch { /* ignore parse error */ }
      throw new Error(errMsg);
    }

    return res.json();
  }

  // Auth
  async sendCode(phone: string) {
    return this.request('/api/auth/send-code', { method: 'POST', body: { phone } });
  }

  async login(phone: string, code: string) {
    return this.request<{ jwt_token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: { phone, code },
    });
  }

  /** Build SSO URL for opening web version in browser (auto-login) */
  getSsoUrl(redirect = '/spaces'): string {
    return `${API_BASE}/api/auth/sso?token=${encodeURIComponent(this.token || '')}&redirect=${encodeURIComponent(redirect)}`;
  }

  async me() {
    const res = await this.request<{ user: User }>('/api/auth/me');
    if (res.user) this.cacheUser(res.user);
    return res;
  }

  // ─── Spaces ───
  async getSpaces(mineOnly = true) {
    const qs = mineOnly ? '' : '?mine=0';
    return this.request<{ spaces: Space[] }>(`/api/spaces${qs}`);
  }

  async getSpaceProfile(spaceId: string) {
    return this.request<Space>(`/api/spaces/${spaceId}/profile`);
  }

  // ─── Materials ───
  async getMaterials(spaceId: string) {
    return this.request<{ materials: Material[] }>(`/api/spaces/${spaceId}/materials/folders`);
  }

  async getFolders(spaceId: string) {
    return this.request<{ folders: Folder[] }>(`/api/spaces/${spaceId}/materials/folders`);
  }

  async uploadFile(spaceId: string, file: File, folderId?: number) {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) formData.append('folder_id', String(folderId));
    return this.request(`/api/spaces/${spaceId}/materials/upload`, {
      method: 'POST',
      body: formData,
    });
  }

  async getManifest(spaceId: string) {
    return this.request<ManifestResponse>(`/api/spaces/${spaceId}/materials/manifest`);
  }

  async downloadFile(spaceId: string, materialId: number): Promise<ArrayBuffer> {
    const url = `${API_BASE}/api/spaces/${spaceId}/materials/${materialId}/download`;
    const res = await tauriFetch(url, {
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });
    if (!res.ok) throw new Error(`下载失败: HTTP ${res.status}`);
    return res.arrayBuffer();
  }

  // ─── Checklist ───
  async getChecklist(spaceId: string) {
    return this.request<ChecklistResponse>(`/api/spaces/${spaceId}/checklist`);
  }

  // ─── Dev Progress ───
  async getDevProgress(spaceId: string) {
    return this.request<DevProgressResponse>(`/api/spaces/${spaceId}/dev-progress`);
  }

  // ─── Chats ───
  async getChats(spaceId: string) {
    return this.request<{ chats: ChatBinding[] }>(`/api/spaces/${spaceId}/chats`);
  }

  // ─── Repos ───
  async getRepos(spaceId: string) {
    return this.request<{ repos: Repo[]; count: number }>(`/api/spaces/${spaceId}/repos`);
  }

  // ─── Dashboard ───
  async getDashboard() {
    return this.request<DashboardResponse>('/api/dashboard');
  }

  // ─── Requirements ───
  async getRequirements(spaceId?: string) {
    const qs = spaceId ? `?space_id=${spaceId}` : '';
    return this.request<{ items: Requirement[]; count: number }>(`/api/requirements${qs}`);
  }

  // ─── Timeline ───
  async getTimeline(spaceId: string) {
    return this.request<{ activities: Activity[] }>(`/api/spaces/${spaceId}/timeline`);
  }

  // ─── Notifications ───
  async getNotifications(unreadOnly = false) {
    const qs = unreadOnly ? '?unreadOnly=true' : '';
    return this.request<{ notifications: Notification[]; unread_count: number }>(`/api/notifications${qs}`);
  }

  async getUnreadCount(): Promise<number> {
    try {
      const res = await this.getNotifications(true);
      return res.unread_count ?? (res.notifications?.length ?? 0);
    } catch { return 0; }
  }

  async markNotificationRead(id: string) {
    return this.request(`/api/notifications/${id}/read`, { method: 'POST' });
  }

  async markAllNotificationsRead() {
    return this.request('/api/notifications/read-all', { method: 'POST' });
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }
}

// ─── Types ───

export interface User {
  id: number;
  username: string;
  display_name?: string;
  phone?: string;
  role: string;
}

export interface Space {
  id: number;
  display_name: string;
  status: string;
  phase: string;
  stage?: string;
  risk_level?: string;
  owner_user_id?: number;
  owner_short_name?: string;
  customer_short_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: number;
  title: string;
  source_system: string;
  file_type?: string;
  file_size?: number;
  folder_id?: number;
  created_at: string;
}

export interface Folder {
  id: number;
  name: string;
  icon?: string;
  parent_id?: number;
  sort_order: number;
}

export interface ManifestEntry {
  id: number;
  title: string;
  folder_id: number | null;
  folder_path: string;
  file_size: number | null;
  sha256: string | null;
  updated_at: string;
}

export interface ManifestResponse {
  files: ManifestEntry[];
  total: number;
  generated_at: string;
}

// ─── Checklist ───
export interface ChecklistItem {
  key: string;
  label: string;
  required: boolean;
  description?: string;
}

export interface ChecklistResponse {
  space: { id: number; name: string; stage: string };
  current_stage: {
    stage: string;
    checklist: ChecklistItem[];
    present: string[];
    missing: ChecklistItem[];
    required_missing: ChecklistItem[];
    completion_rate: number;
  };
  file_count: number;
  stage_summary: Record<string, { total: number; required: number }>;
}

// ─── Dev Progress ───
export interface Activity {
  id: number;
  project_space_id: number;
  activity_type: string;
  title: string;
  summary?: string;
  source_system: string;
  created_at: string;
  space_name?: string;
}

export interface DevProgressResponse {
  requirements: Record<string, number>;
  issues: Record<string, number>;
  recent_activities: Activity[];
  repos: Repo[];
  summary: {
    total_requirements: number;
    approved: number;
    submitted_to_gitlab: number;
    feedback_received: number;
    closed: number;
    issues_opened: number;
    issues_closed: number;
  };
}

// ─── Chats ───
export interface ChatBinding {
  id: number;
  project_space_id: number;
  chat_id: string;
  chat_name?: string;
  remark?: string;
  bound_at: string;
  message_count: number;
  last_message_at?: string;
}

// ─── Repos ───
export interface Repo {
  id: number;
  space_id: number;
  repo_name: string;
  repo_url?: string;
  repo_type: string;
  gitlab_project_id?: number;
  gitlab_project_path?: string;
  description?: string;
  created_at: string;
}

// ─── Dashboard ───
export interface DashboardResponse {
  totals: {
    spaces: number;
    materials: number;
    summaries: number;
    requirements: number;
    chats: number;
    shares: number;
    users: number;
    repos: number;
  };
  statusDist: { status: string; count: number }[];
  riskDist: { risk_level: string; count: number }[];
  topSpaces: {
    id: number; display_name: string; status: string;
    customer_short_name?: string; owner_short_name?: string; risk_level?: string;
    chat_count: number; material_count: number; requirement_count: number; repo_count: number;
  }[];
  recentActivities: Activity[];
  shareStats: { total_shares: number; total_views: number; total_downloads: number; active_shares: number };
  reqStatus: { status: string; count: number }[];
  byCustomer: DimensionRow[];
  bySales: DimensionRow[];
  byDev: DimensionRow[];
}

export interface DimensionRow {
  dimension: string;
  space_count: number;
  material_count: number;
  requirement_count: number;
  chat_count?: number;
  repo_count?: number;
}

// ─── Requirements ───
export interface Requirement {
  id: number;
  project_space_id: number;
  title: string;
  description?: string;
  priority: string;
  status: string;
  source_type?: string;
  space_name?: string;
  customer_short_name?: string;
  owner_short_name?: string;
  reviewer_name?: string;
  gitlab_issue_iid?: number;
  gitlab_issue_url?: string;
  created_at: string;
  updated_at: string;
}

// ─── Notifications ───
export interface Notification {
  id: string;
  title: string;
  content: string;
  source_type: string;
  source_id?: string;
  source_url?: string;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
}

export const api = new ApiClient();


