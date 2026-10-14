import Foundation
import CustomizerCore

/// What Spotify's ✦ panel shows about updates.
struct UpdateStatus: Encodable {
    let current: String
    let latest: String?
    let available: Bool
    let notes: String
    let url: String?
}

enum UpdateError: LocalizedError {
    case noUpdate
    case alreadyUpdating
    case downloadFailed(Int)
    case badBundle

    var errorDescription: String? {
        switch self {
        case .noUpdate: return "You're already on the latest version."
        case .alreadyUpdating: return "An update is already being installed."
        case .downloadFailed(let code): return "The download failed (HTTP \(code)). Try again later."
        case .badBundle: return "The downloaded update looks incomplete. Try again later."
        }
    }
}

/// Checks GitHub for a newer release and installs it in place: swap in the new
/// binaries and runtime, re-patch Spotify, then let launchd restart the agent.
@MainActor
final class Updater {
    static let repo = "nicokoka/Mactify"
    nonisolated private static let assetName = "spotify-customizer-macos.tar.gz"
    private static let checkInterval: TimeInterval = 6 * 60 * 60
    /// Override for testing against a local mock of the releases API.
    private static let apiOverrideKey = "SPOTIFY_CUSTOMIZER_RELEASE_API"

    private struct Release: Decodable {
        struct Asset: Decodable {
            let name: String
            let browserDownloadURL: URL
            enum CodingKeys: String, CodingKey { case name, browserDownloadURL = "browser_download_url" }
        }
        let tagName: String
        let body: String?
        let htmlURL: String
        let assets: [Asset]
        enum CodingKeys: String, CodingKey { case tagName = "tag_name", body, htmlURL = "html_url", assets }
    }

    private let installedVersion: String
    private var latest: Release?
    private var isUpdating = false
    private var timer: Timer?
    private let apiOverride = ProcessInfo.processInfo.environment[Updater.apiOverrideKey]

    init() {
        let raw = try? String(contentsOf: Paths.installedVersionFile, encoding: .utf8)
        installedVersion = raw?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "dev"
    }

    /// Local builds (`dev`) never look for updates.
    private var updatesEnabled: Bool { ReleaseVersion(installedVersion) != nil }

    func start() {
        guard updatesEnabled else { return }
        Task { await check() }
        timer = Timer.scheduledTimer(withTimeInterval: Self.checkInterval, repeats: true) { [weak self] _ in
            Task { @MainActor in await self?.check() }
        }
    }

    var status: UpdateStatus {
        let latestVersion = latest.flatMap { ReleaseVersion($0.tagName) }
        let available = latestVersion.map { latest in
            ReleaseVersion(installedVersion).map { $0 < latest } ?? false
        } ?? false
        return UpdateStatus(
            current: installedVersion,
            latest: latestVersion?.description,
            available: available && downloadURL != nil,
            notes: latest?.body ?? "",
            url: latest?.htmlURL
        )
    }

    private func check() async {
        let api = apiOverride ?? "https://api.github.com/repos/\(Self.repo)/releases/latest"
        guard let url = URL(string: api) else { return }
        var request = URLRequest(url: url)
        request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { return }
            latest = try JSONDecoder().decode(Release.self, from: data)
        } catch {
            NSLog("[SpotifyCustomizer] update check failed: \(error.localizedDescription)")
        }
    }

    /// The release tarball, only ever from this repo's GitHub releases.
    private var downloadURL: URL? {
        guard let asset = latest?.assets.first(where: { $0.name == Self.assetName }) else { return nil }
        let trusted = "https://github.com/\(Self.repo)/releases/download/"
        guard apiOverride != nil || asset.browserDownloadURL.absoluteString.hasPrefix(trusted) else { return nil }
        return asset.browserDownloadURL
    }

    /// Download and install the latest release. Afterwards the caller restarts
    /// Spotify and exits so launchd relaunches the new agent binary.
    func install() async throws {
        guard status.available, let downloadURL, let version = status.latest else { throw UpdateError.noUpdate }
        guard !isUpdating else { throw UpdateError.alreadyUpdating }
        isUpdating = true
        defer { isUpdating = false }

        let (download, response) = try await URLSession.shared.download(from: downloadURL)
        let code = (response as? HTTPURLResponse)?.statusCode ?? 0
        defer { try? FileManager.default.removeItem(at: download) }
        guard code == 200 else { throw UpdateError.downloadFailed(code) }

        // Unpacking and re-patching take a few seconds; keep them off the main
        // thread so the popup stays responsive.
        try await Task.detached(priority: .userInitiated) {
            try Self.installBundle(at: download, version: version)
        }.value
        NSLog("[SpotifyCustomizer] updated \(installedVersion) → \(version)")
    }

    nonisolated private static func installBundle(at archive: URL, version: String) throws {
        let fm = FileManager.default
        let work = fm.temporaryDirectory.appendingPathComponent("spotify-customizer-update-\(UUID().uuidString)")
        try fm.createDirectory(at: work, withIntermediateDirectories: true)
        defer { try? fm.removeItem(at: work) }
        try run("/usr/bin/tar", ["-xzf", archive.path, "-C", work.path])

        let bundle = work.appendingPathComponent("spotify-customizer")
        let newBin = bundle.appendingPathComponent("bin")
        let newAssets = bundle.appendingPathComponent("runtime/customizer")
        let required = [
            newBin.appendingPathComponent("customizer"),
            newBin.appendingPathComponent("spotify-customizer-agent"),
            newAssets.appendingPathComponent("loader.js"),
        ]
        guard required.allSatisfy({ fm.fileExists(atPath: $0.path) }) else { throw UpdateError.badBundle }
        try? run("/usr/bin/xattr", ["-dr", "com.apple.quarantine", newBin.path])

        // Swap directories in place. Replacing the running agent's binary is safe:
        // this process keeps the old file open until it exits.
        _ = try fm.replaceItemAt(Paths.installedBinDir, withItemAt: newBin)
        _ = try fm.replaceItemAt(Paths.installedAssetsDir, withItemAt: newAssets)
        try Data((version + "\n").utf8).write(to: Paths.installedVersionFile)

        try Customizer().apply(assetsDir: Paths.installedAssetsDir)
    }

    nonisolated private static func run(_ path: String, _ arguments: [String]) throws {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: path)
        process.arguments = arguments
        try process.run()
        process.waitUntilExit()
        guard process.terminationStatus == 0 else { throw UpdateError.badBundle }
    }
}
