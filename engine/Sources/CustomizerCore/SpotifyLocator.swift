import Foundation

/// Finds the Spotify.app install and reads its version. Kept free of AppKit so the
/// core library stays unit-testable from the command line.
public struct SpotifyLocator {
    public let appURL: URL

    public init(appURL: URL = Paths.defaultSpotifyApp) {
        self.appURL = appURL
    }

    public var isInstalled: Bool {
        FileManager.default.fileExists(atPath: appURL.path)
    }

    public var xpuiSpaURL: URL {
        Paths.xpuiSpa(inAppAt: appURL)
    }

    /// CFBundleShortVersionString (e.g. "1.3.4.258"), read via PlistBuddy.
    public func version() throws -> String {
        let plist = Paths.infoPlist(inAppAt: appURL)
        guard FileManager.default.fileExists(atPath: plist.path) else {
            throw CustomizerError.spotifyNotFound(appURL.path)
        }
        // Prefer CFBundleVersion; fall back to short version string.
        for key in ["CFBundleVersion", "CFBundleShortVersionString"] {
            if let value = try? Shell.run(
                "/usr/libexec/PlistBuddy",
                ["-c", "Print :\(key)", plist.path]
            ).trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty {
                return value
            }
        }
        throw CustomizerError.versionUnreadable(plist.path)
    }
}

public enum CustomizerError: LocalizedError {
    case spotifyNotFound(String)
    case versionUnreadable(String)
    case noPristineBackup(String)
    case liveAlreadyPatched
    case assetsMissing(String)
    case destinationNotWritable(dir: String, owner: String)

    public var errorDescription: String? {
        switch self {
        case .spotifyNotFound(let path):
            return "Spotify.app not found at \(path)."
        case .versionUnreadable(let path):
            return "Could not read Spotify version from \(path)."
        case .noPristineBackup(let version):
            return "No pristine backup for version \(version). Reinstall Spotify, then run `apply` on a clean client."
        case .liveAlreadyPatched:
            return "The live xpui.spa is already patched and no pristine backup exists to recover from."
        case .assetsMissing(let path):
            return "Runtime assets not found at \(path). Build the runtime first (npm run build)."
        case .destinationNotWritable(let dir, let owner):
            return """
            Can't write to \(dir)
            It's owned by '\(owner)' and this account (\(NSUserName())) lacks write access.
            Fix with ONE of:
              • Run the customizer from \(owner)'s login (it owns Spotify.app), or
              • Grant access once:  sudo chmod -R a+wr "\(dir)"
            """
        }
    }
}
