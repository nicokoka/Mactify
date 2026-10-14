import AppKit
import CustomizerCore

// Invisible background agent started by launchd (see install.sh). No Dock icon,
// no menu-bar item — everything is controlled from Spotify's ✦ panel.
//
//   spotify-customizer-agent [--assets <dir>]

let arguments = CommandLine.arguments
let assetsDir: URL = {
    guard let i = arguments.firstIndex(of: "--assets"), i + 1 < arguments.count else {
        return Paths.installedAssetsDir
    }
    return URL(fileURLWithPath: arguments[i + 1]).standardizedFileURL
}()

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

let (overlay, reapplier) = MainActor.assumeIsolated {
    let reapplier = Reapplier(assetsDir: assetsDir)
    reapplier.start()
    return (NowPlayingOverlay(), reapplier)
}
withExtendedLifetime((overlay, reapplier)) { app.run() }
