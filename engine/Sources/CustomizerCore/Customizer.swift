import Foundation

/// High-level facade tying together locator + backup + patcher. This is what the
/// CLI and menu-bar app both drive.
public struct Customizer {
    public let locator: SpotifyLocator
    let backups = BackupStore()
    let patcher = Patcher()

    public init(locator: SpotifyLocator = SpotifyLocator()) {
        self.locator = locator
    }

    public struct Status {
        public let installed: Bool
        public let version: String?
        public let patched: Bool
        public let hasPristineBackup: Bool
    }

    public func status() throws -> Status {
        guard locator.isInstalled else {
            return Status(installed: false, version: nil, patched: false, hasPristineBackup: false)
        }
        let version = try locator.version()
        let patched = try patcher.isPatched(spa: locator.xpuiSpaURL)
        return Status(
            installed: true,
            version: version,
            patched: patched,
            hasPristineBackup: backups.hasPristine(forVersion: version)
        )
    }

    /// Capture a pristine backup if needed, then patch from pristine → live.
    /// Idempotent: re-running always produces the same patched result.
    public func apply(assetsDir: URL) throws {
        try requireInstalled()
        let live = locator.xpuiSpaURL
        try requireWritable(live)
        let version = try locator.version()
        let pristine = try backups.ensurePristine(version: version, liveSpa: live)
        try patcher.apply(pristine: pristine, assetsDir: assetsDir, destination: live)
    }

    /// Restore the pristine backup over the live archive.
    public func restore() throws {
        try requireInstalled()
        let version = try locator.version()
        guard let pristine = backups.pristine(forVersion: version) else {
            throw CustomizerError.noPristineBackup(version)
        }
        try requireWritable(locator.xpuiSpaURL)
        try patcher.restore(pristine: pristine, destination: locator.xpuiSpaURL)
    }

    private func requireInstalled() throws {
        guard locator.isInstalled else {
            throw CustomizerError.spotifyNotFound(locator.appURL.path)
        }
    }

    /// Fail early with an actionable message if we can't write the live archive's
    /// parent directory (typically: Spotify.app is owned by a different user).
    private func requireWritable(_ fileURL: URL) throws {
        let dir = fileURL.deletingLastPathComponent()
        guard !FileManager.default.isWritableFile(atPath: dir.path) else { return }
        let attrs = try? FileManager.default.attributesOfItem(atPath: dir.path)
        let owner = (attrs?[.ownerAccountName] as? String) ?? "another user"
        throw CustomizerError.destinationNotWritable(dir: dir.path, owner: owner)
    }
}
