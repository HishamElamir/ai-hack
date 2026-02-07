import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  headers: { "Content-Type": "application/json" },
});

// Request interceptor – attach JWT
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor – handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// ─── Auth ────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post("/auth/login", { email, password }),
  refresh: (refresh_token: string) =>
    apiClient.post("/auth/refresh", { refresh_token }),
  logout: () => apiClient.post("/auth/logout"),
  me: () => apiClient.get("/auth/me"),
  validateSession: (sessionId: string) =>
    apiClient.get(`/auth/validate-session/${sessionId}`),
};

// ─── New Hires ───────────────────────────────────────────────
export const newHiresApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get("/new-hires", { params }),
  get: (id: string) => apiClient.get(`/new-hires/${id}`),
  create: (data: Record<string, unknown>) =>
    apiClient.post("/new-hires", data),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/new-hires/${id}`, data),
  delete: (id: string) => apiClient.delete(`/new-hires/${id}`),
  getStatistics: () => apiClient.get("/new-hires/statistics"),
  sendInvitation: (id: string, data: Record<string, unknown>) =>
    apiClient.post(`/new-hires/${id}/send-invitation`, data),
  parseDescription: (description: string) =>
    apiClient.post("/new-hires/parse-description", { description }),
};

// ─── Contracts ───────────────────────────────────────────────
export const contractsApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get("/contracts", { params }),
  generate: (data: Record<string, unknown>) =>
    apiClient.post("/contracts/generate", data),
  get: (id: string) => apiClient.get(`/contracts/${id}`),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/contracts/${id}`, data),
  download: (id: string) =>
    apiClient.get(`/contracts/${id}/download`, { responseType: "blob" }),
  regenerate: (id: string, data: Record<string, unknown>) =>
    apiClient.post(`/contracts/${id}/regenerate`, data),
};

// ─── Questions ───────────────────────────────────────────────
export const questionsApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get("/questions", { params }),
  get: (id: string) => apiClient.get(`/questions/${id}`),
  answer: (id: string, data: Record<string, unknown>) =>
    apiClient.post(`/questions/${id}/answer`, data),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/questions/${id}`, data),
};

// ─── Templates ───────────────────────────────────────────────
export const templatesApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get("/templates", { params }),
  create: (data: Record<string, unknown>) =>
    apiClient.post("/templates", data),
  get: (id: string) => apiClient.get(`/templates/${id}`),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/templates/${id}`, data),
};

// ─── Analytics ───────────────────────────────────────────────
export const analyticsApi = {
  overview: (params?: Record<string, unknown>) =>
    apiClient.get("/analytics/overview", { params }),
  conversations: () => apiClient.get("/analytics/conversations"),
};

// ─── Voice ───────────────────────────────────────────────────
export const voiceApi = {
  initializeSession: (sessionId: string) =>
    apiClient.post("/voice/sessions/initialize", { session_id: sessionId }),
  getConfig: (sessionId: string) =>
    apiClient.get(`/voice/config/${sessionId}`),
  storeMessage: (conversationId: string, data: Record<string, unknown>) =>
    apiClient.post(`/voice/conversations/${conversationId}/messages`, data),
  submitQuestion: (conversationId: string, data: Record<string, unknown>) =>
    apiClient.post(`/voice/conversations/${conversationId}/questions`, data),
  completeSession: (conversationId: string, data: Record<string, unknown>) =>
    apiClient.post(`/voice/conversations/${conversationId}/complete`, data),
  linkElevenLabs: (conversationId: string, elevenlabsConversationId: string) =>
    apiClient.post(`/voice/conversations/${conversationId}/link-elevenlabs`, {
      elevenlabs_conversation_id: elevenlabsConversationId,
    }),
  getTranscript: (conversationId: string) =>
    apiClient.get(`/voice/conversations/${conversationId}/transcript`),
};

export default apiClient;
