import AppKit
import CustomizerCore

/// The current user's running Spotify, if any.
@MainActor
enum SpotifyProcess {
    nonisolated static let bundleID = "com.spotify.client"
    private static let quitTimeout: TimeInterval = 10

    static var running: NSRunningApplication? {
        NSRunningApplication.runningApplications(withBundleIdentifier: bundleID).first
    }

    /// Quit Spotify, wait for it to exit, then open it again so it loads the
    /// freshly patched UI. Opens it even if it wasn't running.
    static func restart() async {
        let app = running
        let appURL = app?.bundleURL ?? Paths.defaultSpotifyApp
        if let app {
            app.terminate()
            let deadline = Date().addingTimeInterval(quitTimeout)
            while !app.isTerminated, Date() < deadline {
                try? await Task.sleep(nanoseconds: 250_000_000)
            }
        }
        _ = try? await NSWorkspace.shared.openApplication(at: appURL, configuration: .init())
    }
}
