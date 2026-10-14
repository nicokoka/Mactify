import Foundation
import CustomizerCore

// Minimal hand-rolled arg parsing — no external dependency for a learning CLI.
//
//   customizer status
//   customizer apply   [--assets <dir>] [--app <Spotify.app>] [--restart]
//   customizer restore [--app <Spotify.app>]

let args = Array(CommandLine.arguments.dropFirst())

func flag(_ name: String) -> String? {
    guard let i = args.firstIndex(of: name), i + 1 < args.count else { return nil }
    return args[i + 1]
}
func has(_ name: String) -> Bool { args.contains(name) }

func resolveAssetsDir() -> URL {
    if let custom = flag("--assets") {
        return URL(fileURLWithPath: custom).standardizedFileURL
    }
    // Default: runtime build output relative to the current working directory.
    return URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        .appendingPathComponent("runtime/dist/customizer", isDirectory: true)
}

func makeCustomizer() -> Customizer {
    if let app = flag("--app") {
        return Customizer(locator: SpotifyLocator(appURL: URL(fileURLWithPath: app)))
    }
    return Customizer()
}

func fail(_ message: String) -> Never {
    FileHelper.printErr("error: \(message)")
    exit(1)
}

func restartSpotifyIfRequested() {
    guard has("--restart") else { return }
    // Only this user's Spotify — other accounts' copies aren't ours to kill.
    _ = try? Shell.runPublic("/usr/bin/pkill", ["-x", "-U", String(getuid()), "Spotify"])
    Thread.sleep(forTimeInterval: 1.0)
    _ = try? Shell.runPublic("/usr/bin/open", ["-a", "Spotify"])
    print("↻ restarted Spotify")
}

let command = args.first ?? "status"
let customizer = makeCustomizer()

do {
    switch command {
    case "status":
        let s = try customizer.status()
        print("Spotify installed : \(s.installed ? "yes" : "no")")
        print("Version           : \(s.version ?? "—")")
        print("Patched           : \(s.patched ? "yes" : "no")")
        print("Pristine backup   : \(s.hasPristineBackup ? "yes" : "no")")

    case "apply":
        let assets = resolveAssetsDir()
        try customizer.apply(assetsDir: assets)
        print("✓ applied customizer (assets: \(assets.path))")
        restartSpotifyIfRequested()

    case "restore":
        try customizer.restore()
        print("✓ restored pristine xpui.spa")
        restartSpotifyIfRequested()

    case "-h", "--help", "help":
        print("""
        Spotify Customizer CLI

          customizer status
          customizer apply   [--assets <dir>] [--app <Spotify.app>] [--restart]
          customizer restore [--app <Spotify.app>] [--restart]
        """)

    default:
        fail("unknown command '\(command)'. Try `customizer --help`.")
    }
} catch {
    fail(error.localizedDescription)
}
