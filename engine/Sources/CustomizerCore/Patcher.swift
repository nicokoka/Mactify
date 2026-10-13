import Foundation

/// Patches Spotify's xpui.spa (an uncompressed ZIP of the web UI) to load the
/// customizer runtime. The cardinal rule: ALWAYS patch from a pristine source, so
/// applying is idempotent and never stacks patches on top of each other.
public struct Patcher {
    /// Marker file we inject; also how we detect an already-patched archive.
    static let markerEntry = "customizer/loader.js"

    private static let linkTag =
        #"<link rel="stylesheet" href="/customizer/loader.css">"#
    private static let scriptTag =
        #"<script defer src="/customizer/loader.js"></script>"#

    public init() {}

    /// True if the archive already contains the injected runtime.
    public func isPatched(spa: URL) throws -> Bool {
        let listing = try Shell.run("/usr/bin/unzip", ["-l", spa.path])
        return listing.contains(Patcher.markerEntry)
    }

    /// Produce a patched xpui.spa at `destination` from a pristine archive.
    /// `assetsDir` must contain loader.js and loader.css (runtime build output).
    public func apply(pristine: URL, assetsDir: URL, destination: URL) throws {
        let fm = FileManager.default
        guard fm.fileExists(atPath: assetsDir.appendingPathComponent("loader.js").path) else {
            throw CustomizerError.assetsMissing(assetsDir.path)
        }

        let work = try makeTempDir()
        defer { try? fm.removeItem(at: work) }

        // 1. Unpack pristine.
        let unpacked = work.appendingPathComponent("spa", isDirectory: true)
        try fm.createDirectory(at: unpacked, withIntermediateDirectories: true)
        // Spotify's xpui.spa carries a spurious "/" entry; unzip strips it and exits 2
        // while still extracting every real file, so tolerate its recoverable warnings.
        try Shell.run(
            "/usr/bin/unzip", ["-q", "-o", pristine.path, "-d", unpacked.path],
            allowedExitCodes: [0, 1, 2]
        )

        // 2. Inject references into index.html.
        try injectIndexHTML(at: unpacked.appendingPathComponent("index.html"))

        // 3. Copy runtime assets into customizer/.
        let customizerDir = unpacked.appendingPathComponent("customizer", isDirectory: true)
        try? fm.removeItem(at: customizerDir)
        try fm.createDirectory(at: customizerDir, withIntermediateDirectories: true)
        for asset in try fm.contentsOfDirectory(at: assetsDir, includingPropertiesForKeys: nil) {
            try fm.copyItem(at: asset, to: customizerDir.appendingPathComponent(asset.lastPathComponent))
        }

        // 4. Re-zip with store compression (-0) to match the original .spa.
        let output = work.appendingPathComponent("xpui.spa")
        try Shell.run("/usr/bin/zip", ["-q", "-r", "-X", "-0", output.path, "."], cwd: unpacked)

        // 5. Atomically swap into place.
        try atomicReplace(destination: destination, with: output)
    }

    /// Restore a pristine archive over the live one.
    public func restore(pristine: URL, destination: URL) throws {
        let fm = FileManager.default
        let staged = try makeTempDir().appendingPathComponent("xpui.spa")
        try fm.copyItem(at: pristine, to: staged)
        try atomicReplace(destination: destination, with: staged)
    }

    // MARK: - Internals

    func injectIndexHTML(at url: URL) throws {
        var html = try String(contentsOf: url, encoding: .utf8)
        guard !html.contains(Patcher.markerEntry) else { return } // already injected
        if let headRange = html.range(of: "</head>") {
            html.replaceSubrange(headRange, with: Patcher.linkTag + "</head>")
        }
        if let bodyRange = html.range(of: "</body>") {
            html.replaceSubrange(bodyRange, with: Patcher.scriptTag + "</body>")
        }
        try html.write(to: url, atomically: true, encoding: .utf8)
    }

    private func makeTempDir() throws -> URL {
        let dir = FileManager.default.temporaryDirectory
            .appendingPathComponent("spotify-customizer-" + UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    private func atomicReplace(destination: URL, with source: URL) throws {
        let fm = FileManager.default
        if fm.fileExists(atPath: destination.path) {
            _ = try fm.replaceItemAt(destination, withItemAt: source)
        } else {
            try fm.moveItem(at: source, to: destination)
        }
    }
}
