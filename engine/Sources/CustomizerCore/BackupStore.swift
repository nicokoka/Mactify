import Foundation
import CryptoKit

/// Manages pristine, per-version backups of xpui.spa. The backup is the source we
/// always patch from, so it MUST be captured from a clean (unpatched) client.
public struct BackupStore {
    let patcher = Patcher()

    public init() {}

    /// Ensure a pristine backup exists for `version`, capturing it from the live
    /// archive if needed. Refuses to capture a backup from an already-patched file.
    /// Returns the URL of the pristine backup.
    @discardableResult
    public func ensurePristine(version: String, liveSpa: URL) throws -> URL {
        let backup = Paths.backup(forVersion: version)
        let fm = FileManager.default

        if fm.fileExists(atPath: backup.path) {
            return backup
        }

        // No backup yet: the live file must be clean to seed one safely.
        if try patcher.isPatched(spa: liveSpa) {
            throw CustomizerError.liveAlreadyPatched
        }

        try fm.createDirectory(at: backup.deletingLastPathComponent(), withIntermediateDirectories: true)
        try fm.copyItem(at: liveSpa, to: backup)
        return backup
    }

    /// The pristine backup for a version, or nil if none captured yet.
    public func pristine(forVersion version: String) -> URL? {
        let backup = Paths.backup(forVersion: version)
        return FileManager.default.fileExists(atPath: backup.path) ? backup : nil
    }

    public func hasPristine(forVersion version: String) -> Bool {
        pristine(forVersion: version) != nil
    }

    /// SHA-256 of a file, for integrity reporting in `status`.
    public static func sha256(of url: URL) throws -> String {
        let data = try Data(contentsOf: url)
        let digest = SHA256.hash(data: data)
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}
