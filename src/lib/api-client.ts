const API_BASE = "";

interface FetchOptions extends RequestInit {
  token?: string | null;
}

async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (fetchOptions.body && !(fetchOptions.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data as T;
}

// ─── Auth API ───

export const authAPI = {
  register: (data: {
    email: string;
    username: string;
    password: string;
    displayName?: string;
  }) =>
    apiFetch<{ user: Record<string, unknown>; token: string }>(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  login: (data: { email: string; password: string }) =>
    apiFetch<{ user: Record<string, unknown>; token: string }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  logout: (token: string) =>
    apiFetch("/api/auth/logout", { method: "POST", token }),

  me: (token: string) =>
    apiFetch<{ user: Record<string, unknown> }>("/api/auth/me", { token }),

  storePublicKey: (token: string, publicKey: string) =>
    apiFetch("/api/auth/keys", {
      method: "POST",
      token,
      body: JSON.stringify({ publicKey }),
    }),

  resendVerification: (token: string) =>
    apiFetch<{ message: string }>("/api/auth/resend-verification", {
      method: "POST",
      token,
    }),
};

// ─── Profile API ───

export const profileAPI = {
  get: (token: string) =>
    apiFetch<Record<string, unknown>>("/api/profile", { token }),

  getUser: (token: string, username: string) =>
    apiFetch<Record<string, unknown>>(`/api/profile/${username}`, { token }),

  update: (token: string, data: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>("/api/profile", {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),

  uploadAvatar: (token: string, formData: FormData) =>
    apiFetch<Record<string, unknown>>("/api/profile", {
      method: "PATCH",
      token,
      body: formData,
    }),

  follow: (token: string, username: string) =>
    apiFetch("/api/profile/" + username + "/follow", { method: "POST", token }),

  unfollow: (token: string, username: string) =>
    apiFetch("/api/profile/" + username + "/follow", {
      method: "DELETE",
      token,
    }),

  friends: (token: string) =>
    apiFetch<{ friends: Record<string, unknown>[] }>("/api/profile/friends", {
      token,
    }),

  roomLog: (token: string, page?: number) => {
    const query = new URLSearchParams();
    if (page) query.set("page", page.toString());
    return apiFetch<{
      logs: Record<string, unknown>[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/api/profile/room-log?${query.toString()}`, { token });
  },
};

// ─── Room API ───

export const roomAPI = {
  list: (
    token: string,
    params?: { search?: string; type?: string; page?: number },
  ) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.type) query.set("type", params.type);
    if (params?.page) query.set("page", params.page.toString());
    return apiFetch<{
      rooms: Record<string, unknown>[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/api/room?${query.toString()}`, { token });
  },

  myRooms: (
    token: string,
    params?: { search?: string; type?: string; page?: number },
  ) => {
    const query = new URLSearchParams();
    query.set("view", "mine");
    if (params?.search) query.set("search", params.search);
    if (params?.type) query.set("type", params.type);
    if (params?.page) query.set("page", params.page.toString());
    return apiFetch<{
      rooms: Record<string, unknown>[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/api/room?${query.toString()}`, { token });
  },

  get: (token: string, roomId: string) =>
    apiFetch<Record<string, unknown>>(`/api/room/${roomId}`, { token }),

  create: (token: string, data: Record<string, unknown>) =>
    apiFetch<{ room: Record<string, unknown> }>("/api/room", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, roomId: string, data: Record<string, unknown>) =>
    apiFetch<{ room: Record<string, unknown> }>(`/api/room/${roomId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, roomId: string) =>
    apiFetch(`/api/room/${roomId}`, { method: "DELETE", token }),

  join: (token: string, roomId: string, password?: string) =>
    apiFetch(`/api/room/${roomId}/join`, {
      method: "POST",
      token,
      body: JSON.stringify({ password }),
    }),

  leave: (token: string, roomId: string) =>
    apiFetch(`/api/room/${roomId}/leave`, { method: "POST", token }),

  getByInviteCode: (token: string, inviteCode: string) =>
    apiFetch<{ room: Record<string, unknown> }>(
      `/api/room/join/${inviteCode}`,
      { token },
    ),

  distributeKeys: (
    token: string,
    roomId: string,
    keys: { userId: string; encryptedKey: string }[],
  ) =>
    apiFetch(`/api/room/${roomId}/keys`, {
      method: "POST",
      token,
      body: JSON.stringify({ keys }),
    }),

  getMyKey: (token: string, roomId: string) =>
    apiFetch<{ encryptedKey: string }>(`/api/room/${roomId}/keys`, { token }),

  invite: (token: string, roomId: string, receiverId: string) =>
    apiFetch<{ message: string; invite: { id: string; roomId: string } }>(
      `/api/room/${roomId}/invite`,
      {
        method: "POST",
        token,
        body: JSON.stringify({ receiverId }),
      },
    ),
};

// ─── Chat API ───

export const chatAPI = {
  getMessages: (token: string, roomId: string, cursor?: string) => {
    const query = cursor ? `?cursor=${cursor}` : "";
    return apiFetch<{
      messages: Record<string, unknown>[];
      nextCursor: string | null;
    }>(`/api/room/${roomId}/chat${query}`, { token });
  },

  sendMessage: (
    token: string,
    roomId: string,
    data: { encryptedContent: string; iv: string; type?: string },
  ) =>
    apiFetch<{ message: Record<string, unknown> }>(`/api/room/${roomId}/chat`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  uploadMedia: (token: string, roomId: string, formData: FormData) =>
    apiFetch<{ message: Record<string, unknown> }>(
      `/api/room/${roomId}/media`,
      {
        method: "POST",
        token,
        body: formData,
      },
    ),

  uploadMediaWithProgress: (
    token: string,
    roomId: string,
    formData: FormData,
    onProgress: (percent: number) => void,
  ): Promise<{ message: Record<string, unknown> }> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/room/${roomId}/media`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(new Error(data.error || "Upload failed"));
          }
        } catch {
          reject(new Error("Upload failed"));
        }
      };

      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(formData);
    }),
};

// ─── Poll API ───

export const pollAPI = {
  list: (token: string, roomId: string) =>
    apiFetch<{ polls: Record<string, unknown>[] }>(`/api/room/${roomId}/poll`, {
      token,
    }),

  create: (
    token: string,
    roomId: string,
    data: { question: string; options: string[]; expiresInMinutes?: number },
  ) =>
    apiFetch<{ poll: Record<string, unknown> }>(`/api/room/${roomId}/poll`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  vote: (token: string, roomId: string, pollId: string, optionId: string) =>
    apiFetch(`/api/room/${roomId}/poll/${pollId}/vote`, {
      method: "POST",
      token,
      body: JSON.stringify({ optionId }),
    }),
};

// ─── Invites API ───

export const invitesAPI = {
  list: (token: string) =>
    apiFetch<{ invites: Record<string, unknown>[] }>("/api/invites", { token }),

  respond: (token: string, inviteId: string, action: "accept" | "decline") =>
    apiFetch<{ message: string; roomId?: string }>(`/api/invites/${inviteId}`, {
      method: "POST",
      token,
      body: JSON.stringify({ action }),
    }),
};

// ─── Achievements API ───

export const achievementsAPI = {
  list: () =>
    apiFetch<{ achievements: Record<string, unknown>[] }>("/api/achievements"),
};

// ─── Leaderboard API ───

export const leaderboardAPI = {
  get: (params?: { sort?: string; search?: string; page?: number }) => {
    const query = new URLSearchParams();
    if (params?.sort) query.set("sort", params.sort);
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", params.page.toString());
    return apiFetch<{
      leaderboard: Record<string, unknown>[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/api/leaderboard?${query.toString()}`);
  },
};
