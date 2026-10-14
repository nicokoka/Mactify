// Client for the background agent's loopback endpoint (engine/Sources/CustomizerAgent).
// The agent may not be running — e.g. a dev build patched without install.sh —
// so every call degrades to "nothing to report" instead of throwing.

export const AGENT_URL = "http://127.0.0.1:47621";

export interface UpdateStatus {
  current: string;
  latest: string | null;
  available: boolean;
  /** Release notes (Markdown source; render as plain text). */
  notes: string;
  /** GitHub release page. */
  url: string | null;
}

export async function fetchUpdateStatus(): Promise<UpdateStatus | null> {
  try {
    const res = await fetch(`${AGENT_URL}/update`);
    return res.ok ? ((await res.json()) as UpdateStatus) : null;
  } catch {
    return null;
  }
}

/**
 * Ask the agent to install the latest release. On success it restarts Spotify
 * (reloading this page), so this only ever resolves with an error message.
 */
export async function installUpdate(): Promise<string> {
  try {
    const res = await fetch(`${AGENT_URL}/update`, { method: "POST" });
    if (res.ok) return "";
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    return body?.error ?? "The update failed. Try again later.";
  } catch {
    return "Couldn't reach the background helper. Paste the install line again to repair it.";
  }
}
