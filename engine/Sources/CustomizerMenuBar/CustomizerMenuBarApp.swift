import SwiftUI
import CustomizerCore

@main
struct CustomizerMenuBarApp: App {
    @StateObject private var model = MenuModel()
    @StateObject private var overlay = NowPlayingOverlay()
    @StateObject private var spotify = SpotifyPresence()

    init() {
        SpotifyPresence.registerLoginItem()
    }

    var body: some Scene {
        // Hidden while Spotify is closed; the popup itself only fires while it plays.
        MenuBarExtra("Spotify Customizer", systemImage: "wand.and.stars", isInserted: $spotify.isRunning) {
            MenuContent(model: model, overlay: overlay)
        }
        .menuBarExtraStyle(.window)
    }
}

@MainActor
final class MenuModel: ObservableObject {
    private let customizer = Customizer()
    private let watcher = WatcherAgent()

    @Published var statusLine = "Checking…"
    @Published var installed = false
    @Published var patched = false
    @Published var version = "—"
    @Published var hasBackup = false
    @Published var watcherOn = false
    @Published var lastMessage = ""

    init() { refresh() }

    var assetsDir: URL { Paths.installedAssetsDir }

    func refresh() {
        do {
            let s = try customizer.status()
            installed = s.installed
            patched = s.patched
            version = s.version ?? "—"
            hasBackup = s.hasPristineBackup
            watcherOn = watcher.isInstalled
            statusLine = !s.installed
                ? "Spotify not found"
                : (s.patched ? "Patched · \(version)" : "Not patched · \(version)")
        } catch {
            statusLine = "Error: \(error.localizedDescription)"
        }
    }

    func apply() { run("Applied") { try customizer.apply(assetsDir: assetsDir) } }
    func restore() { run("Restored") { try customizer.restore() } }

    func toggleWatcher() {
        run(watcherOn ? "Watcher off" : "Watcher on") {
            if watcher.isInstalled {
                try watcher.uninstall()
            } else {
                // Point the agent at this binary's sibling CLI if present,
                // else fall back to a PATH lookup name.
                let cli = Bundle.main.bundleURL
                    .deletingLastPathComponent()
                    .appendingPathComponent("customizer")
                try watcher.install(cliPath: cli, assetsDir: assetsDir)
            }
        }
    }

    func openOptionsFolder() {
        NSWorkspace.shared.open(Paths.supportDir)
    }

    private func run(_ okMessage: String, _ work: () throws -> Void) {
        do {
            try work()
            lastMessage = okMessage
        } catch {
            lastMessage = error.localizedDescription
        }
        refresh()
    }
}

struct MenuContent: View {
    @ObservedObject var model: MenuModel
    @ObservedObject var overlay: NowPlayingOverlay

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Spotify Customizer").font(.headline)
            Label(model.statusLine, systemImage: model.patched ? "checkmark.seal.fill" : "seal")
                .font(.subheadline)
                .foregroundStyle(model.patched ? .green : .secondary)

            Divider()

            Button(model.patched ? "Re-apply" : "Apply") { model.apply() }
                .disabled(!model.installed)
            Button("Restore original") { model.restore() }
                .disabled(!model.installed || !model.hasBackup)
            Toggle("Auto re-apply after updates", isOn: Binding(
                get: { model.watcherOn },
                set: { _ in model.toggleWatcher() }
            ))

            Divider()

            Label(
                overlay.enabled ? "Now-playing popup on" : "Now-playing popup off",
                systemImage: overlay.enabled ? "bell.fill" : "bell.slash"
            )
            .font(.subheadline)
            Text("Set it in Spotify: ✦ panel → Now-playing toast")
                .font(.caption)
                .foregroundStyle(.secondary)

            Divider()

            Button("Open support folder") { model.openOptionsFolder() }
            Button("Refresh") { model.refresh() }

            if !model.lastMessage.isEmpty {
                Text(model.lastMessage).font(.caption).foregroundStyle(.secondary)
            }

            Divider()
            Button("Quit") { NSApp.terminate(nil) }
        }
        .padding(14)
        .frame(width: 260)
    }
}
