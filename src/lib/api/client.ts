export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;

function buildUrl(url: string, params?: Params) {
  if (!params) return url;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${url}${url.includes("?") ? "&" : "?"}${qs}` : url;
}

async function request<T>(method: string, url: string, opts: { body?: unknown; params?: Params; signal?: AbortSignal } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(buildUrl(url, opts.params), {
      method,
      credentials: "same-origin",
      signal: opts.signal,
      headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiClientError("Can't reach the server. Check your connection and try again.", 0, "NETWORK");
  }

  let json: { data?: T; error?: { code: string; message: string; fields?: Record<string, string> } } | null = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    if (res.status === 401 && url.startsWith("/api/admin") && typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
      window.location.href = `/admin/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }
    throw new ApiClientError(json?.error?.message ?? `Request failed (${res.status})`, res.status, json?.error?.code ?? "ERROR", json?.error?.fields);
  }
  return json?.data as T;
}

export const api = {
  get: <T>(url: string, params?: Params, signal?: AbortSignal) => request<T>("GET", url, { params, signal }),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, { body: body ?? {} }),
  put: <T>(url: string, body?: unknown) => request<T>("PUT", url, { body: body ?? {} }),
  patch: <T>(url: string, body?: unknown) => request<T>("PATCH", url, { body: body ?? {} }),
  del: <T>(url: string) => request<T>("DELETE", url),
};

/** Downloads a file from an API endpoint (exports), surfacing server errors to the caller. */
export async function downloadFile(url: string, params?: Params) {
  const res = await fetch(buildUrl(url, params), { credentials: "same-origin" });
  if (!res.ok) {
    let msg = `Export failed (${res.status})`;
    try {
      msg = (await res.json()).error?.message ?? msg;
    } catch {}
    throw new ApiClientError(msg, res.status, "EXPORT");
  }
  const cd = res.headers.get("content-disposition") ?? "";
  const name = /filename="?([^"]+)"?/.exec(cd)?.[1] ?? "export";
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
