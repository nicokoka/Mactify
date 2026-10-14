import AppKit
import ServiceManagement

/// Tracks whether Spotify is running so the helper can stay invisible otherwise:
/// it starts hidden at login and its menu-bar icon only appears alongside Spotify.
@MainActor
final class SpotifyPresence: ObservableObject {
    @Published var isRunning: Bool

    nonisolated private static let spotifyBundleID = "com.spotify.client"
    private var observers: [NSObjectProtocol] = []

    init() {
        isRunning = NSWorkspace.shared.runningApplications
            .contains { $0.bundleIdentifier == Self.spotifyBundleID }

        let center = NSWorkspace.shared.notificationCenter
        let names = [NSWorkspace.didLaunchApplicationNotification, NSWorkspace.didTerminateApplicationNotification]
        observers = names.map { name in
            center.addObserver(forName: name, object: nil, queue: .main) { [weak self] note in
                let app = note.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication
                guard app?.bundleIdentifier == Self.spotifyBundleID else { return }
                let launched = name == NSWorkspace.didLaunchApplicationNotification
                MainActor.assumeIsolated { self?.isRunning = launched }
            }
        }
    }

    deinit {
        observers.forEach(NSWorkspace.shared.notificationCenter.removeObserver)
    }

    /// Register the installed .app as a login item so it's waiting when Spotify opens.
    /// Skipped for `swift run` builds, which have no bundle to register.
    static func registerLoginItem() {
        guard Bundle.main.bundleIdentifier != nil else { return }
        let service = SMAppService.mainApp
        guard service.status != .enabled else { return }
        do {
            try service.register()
        } catch {
            NSLog("[SpotifyCustomizer] login item registration failed: \(error.localizedDescription)")
        }
    }
}
