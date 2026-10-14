import AppKit
import CustomizerCore

/// Re-patches Spotify after it self-updates: an update swaps in a clean
/// xpui.spa, so the patch marker disappears and we apply again.
@MainActor
final class Reapplier {
    private static let checkInterval: TimeInterval = 30
    /// An update relaunches Spotify; if we re-patch within this window of that
    /// launch, restart it once more so the customizer loads right away.
    private static let freshLaunchWindow: TimeInterval = 90

    private let customizer = Customizer()
    private let assetsDir: URL
    private var timer: Timer?
    private var launchObserver: NSObjectProtocol?

    init(assetsDir: URL) {
        self.assetsDir = assetsDir
    }

    func start() {
        check()
        timer = Timer.scheduledTimer(withTimeInterval: Self.checkInterval, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.check() }
        }
        launchObserver = NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.didLaunchApplicationNotification, object: nil, queue: .main
        ) { [weak self] note in
            let app = note.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication
            guard app?.bundleIdentifier == SpotifyProcess.bundleID else { return }
            MainActor.assumeIsolated { self?.check() }
        }
    }

    private func check() {
        guard let status = try? customizer.status(), status.installed, !status.patched else { return }
        do {
            try customizer.apply(assetsDir: assetsDir)
            NSLog("[SpotifyCustomizer] re-applied after Spotify update (version \(status.version ?? "?"))")
            restartSpotifyIfJustLaunched()
        } catch {
            NSLog("[SpotifyCustomizer] re-apply failed: \(error.localizedDescription)")
        }
    }

    private func restartSpotifyIfJustLaunched() {
        guard let launched = SpotifyProcess.running?.launchDate,
              Date().timeIntervalSince(launched) < Self.freshLaunchWindow
        else { return }
        Task { await SpotifyProcess.restart() }
    }
}
