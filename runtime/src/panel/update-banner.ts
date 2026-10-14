// "Update available" banner at the top of the panel. Built once per release and
// reused across re-renders, so an in-flight "Updating…" state isn't lost.

import { installUpdate, type UpdateStatus } from "../agent.js";

const NOTES_MAX_CHARS = 1200;

/** GitHub release notes are Markdown; tidy the common bits for plain-text display. */
function plainNotes(markdown: string): string {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .trim();
}

export function createUpdateBanner(status: UpdateStatus): HTMLElement {
  const banner = document.createElement("section");
  banner.className = "sc-update";
  banner.setAttribute("aria-label", "Update available");

  const text = document.createElement("div");
  text.className = "sc-update-text";
  const title = document.createElement("strong");
  title.textContent = `Update available · v${status.latest ?? ""}`;
  const sub = document.createElement("span");
  sub.textContent = `You have v${status.current}. Spotify restarts to finish.`;
  sub.setAttribute("aria-live", "polite");
  text.append(title, sub);

  const actions = document.createElement("div");
  actions.className = "sc-update-actions";

  const notes = document.createElement("pre");
  notes.className = "sc-update-notes";
  notes.hidden = true;
  const trimmed = plainNotes(status.notes);
  notes.textContent = trimmed.length > NOTES_MAX_CHARS ? `${trimmed.slice(0, NOTES_MAX_CHARS)}…` : trimmed;

  if (trimmed) {
    const whatsNew = document.createElement("button");
    whatsNew.type = "button";
    whatsNew.className = "sc-update-ghost";
    whatsNew.textContent = "What's new";
    whatsNew.setAttribute("aria-expanded", "false");
    whatsNew.onclick = () => {
      notes.hidden = !notes.hidden;
      whatsNew.setAttribute("aria-expanded", String(!notes.hidden));
    };
    actions.appendChild(whatsNew);
  }

  const update = document.createElement("button");
  update.type = "button";
  update.className = "sc-update-go";
  update.textContent = "Update";
  update.onclick = async () => {
    update.disabled = true;
    update.textContent = "Updating…";
    banner.classList.remove("sc-update--failed");
    sub.textContent = "Downloading — Spotify will restart in a moment.";
    const error = await installUpdate();
    // Success restarts Spotify, so reaching here with a message means it failed.
    if (error) {
      banner.classList.add("sc-update--failed");
      sub.textContent = error;
      update.disabled = false;
      update.textContent = "Try again";
    }
  };
  actions.appendChild(update);

  banner.append(text, actions, notes);
  return banner;
}
