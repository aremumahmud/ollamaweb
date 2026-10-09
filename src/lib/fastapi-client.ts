const BASE_URL = process.env.FASTAPI_BASE_URL ?? "http://localhost:8000";

export async function fastapiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`FastAPI ${path} failed: ${res.status} ${body}`);
  }
  return res;
}

export async function fastapiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fastapiFetch(path, init);
  return res.json() as Promise<T>;
}
