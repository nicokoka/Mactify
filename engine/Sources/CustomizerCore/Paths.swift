import Foundation

/// Canonical filesystem locations used by the customizer.
public enum Paths {
    /// Default macOS Spotify install location.
    public static let defaultSpotifyApp = URL(fileURLWithPath: "/Applications/Spotify.app")

    /// The UI bundle inside Spotify.app, relative to the app's root.
    public static func xpuiSpa(inAppAt appURL: URL) -> URL {
        appURL
            .appendingPathComponent("Contents/Resources/Apps/xpui.spa")
    }

    public static func infoPlist(inAppAt appURL: URL) -> URL {
        appURL.appendingPathComponent("Contents/Info.plist")
    }

    /// ~/Library/Application Support/SpotifyCustomizer
    public static var supportDir: URL {
        FileManager.default
            .homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Application Support/SpotifyCustomizer", isDirectory: true)
    }

    /// Pristine backups live under supportDir/backups/<version>/xpui.spa
    public static func backupsDir() -> URL {
        supportDir.appendingPathComponent("backups", isDirectory: true)
    }

    public static func backup(forVersion version: String) -> URL {
        backupsDir()
            .appendingPathComponent(version, isDirectory: true)
            .appendingPathComponent("xpui.spa")
    }

    /// Where the menu-bar app expects the built runtime assets to live.
    /// The dev script copies runtime/dist/customizer/* here so the GUI is
    /// decoupled from the repo checkout.
    public static var installedAssetsDir: URL {
        supportDir.appendingPathComponent("runtime/customizer", isDirectory: true)
    }

    /// LaunchAgent plist path for the auto-re-apply watcher.
    public static var launchAgentPlist: URL {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/LaunchAgents/com.spotifycustomizer.watcher.plist")
    }
}
