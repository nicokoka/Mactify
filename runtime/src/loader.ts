// Entry point injected into Spotify via <script src="/customizer/loader.js">.
// Importing styles.css makes esbuild emit dist/customizer/loader.css alongside.

import "./styles.css";

import { CATALOG } from "./catalog/index.js";
import { disableAll } from "./config.js";
import { onHotkey } from "./dom.js";
import { CustomizerEngine } from "./engine.js";
import { mountPanel } from "./panel/panel.js";
import { waitForReady } from "./spotify-api.js";

/**
 * Escape hatch that works even if an option covers the whole UI: ⌘⌥⇧X turns every
 * option off and reloads. Registered before anything else so it can't be blocked.
 */
function installSafeMode(): void {
  onHotkey({ key: "x", meta: true, alt: true, shift: true }, () => {
    disableAll();
    window.location.reload();
  });
}

async function boot(): Promise<void> {
  installSafeMode();
  try {
    await waitForReady();
    const engine = new CustomizerEngine(CATALOG);
    engine.applyEnabled();
    mountPanel(engine);
    console.info(
      `[SpotifyCustomizer] ready — ${CATALOG.length} options, ${engine.failures.size} failed to apply`,
    );
  } catch (err) {
    // Never let the customizer take down the Spotify client.
    console.error("[SpotifyCustomizer] boot failed", err);
  }
}

void boot();
