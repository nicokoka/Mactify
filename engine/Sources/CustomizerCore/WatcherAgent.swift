import Foundation

/// Installs/removes a launchd LaunchAgent that runs `customizer watch`, which
/// re-applies the patch automatically after Spotify updates replace xpui.spa.
public struct WatcherAgent {
    public static let label = "com.spotifycustomizer.watcher"

    public init() {}

    public var isInstalled: Bool {
        FileManager.default.fileExists(atPath: Paths.launchAgentPlist.path)
    }

    /// Write + load the agent. `cliPath` is the `customizer` binary; `assetsDir`
    /// is where built runtime assets live.
    public func install(cliPath: URL, assetsDir: URL, intervalSeconds: Int = 15) throws {
        let plist = Self.plistXML(
            cliPath: cliPath.path,
            assetsDir: assetsDir.path,
            intervalSeconds: intervalSeconds
        )
        let dest = Paths.launchAgentPlist
        try FileManager.default.createDirectory(
            at: dest.deletingLastPathComponent(), withIntermediateDirectories: true)
        try plist.write(to: dest, atomically: true, encoding: .utf8)
        _ = try? Shell.run("/bin/launchctl", ["unload", dest.path]) // no-op on first install
        try Shell.run("/bin/launchctl", ["load", dest.path])
    }

    public func uninstall() throws {
        let dest = Paths.launchAgentPlist
        if FileManager.default.fileExists(atPath: dest.path) {
            _ = try? Shell.run("/bin/launchctl", ["unload", dest.path])
            try FileManager.default.removeItem(at: dest)
        }
    }

    static func plistXML(cliPath: String, assetsDir: String, intervalSeconds: Int) -> String {
        """
        <?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
        <plist version="1.0">
        <dict>
          <key>Label</key><string>\(label)</string>
          <key>ProgramArguments</key>
          <array>
            <string>\(cliPath)</string>
            <string>watch</string>
            <string>--assets</string>
            <string>\(assetsDir)</string>
            <string>--interval</string>
            <string>\(intervalSeconds)</string>
          </array>
          <key>RunAtLoad</key><true/>
          <key>KeepAlive</key><true/>
        </dict>
        </plist>
        """
    }
}
