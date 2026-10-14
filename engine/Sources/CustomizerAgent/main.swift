import AppKit
import CustomizerCore

// Invisible background agent started by launchd (see install.sh). No Dock icon,
// no menu-bar item — everything is controlled from Spotify's ✦ panel, which
// talks to this process over AgentServer.
//
//   spotify-customizer-agent [--assets <dir>]

let arguments = CommandLine.arguments
let assetsDir: URL = {
    guard let i = arguments.firstIndex(of: "--assets"), i + 1 < arguments.count else {
        return Paths.installedAssetsDir
    }
    return URL(fileURLWithPath: arguments[i + 1]).standardizedFileURL
}()

private struct UpdateFailure: Encodable { let error: String }

/// After an update: reload Spotify with the new UI, then exit so launchd
/// (KeepAlive) starts the new agent binary.
@MainActor
private func finishUpdate() {
    Task {
        try? await Task.sleep(nanoseconds: 300_000_000) // let the response reach Spotify
        await SpotifyProcess.restart()
        exit(0)
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

let (overlay, reapplier, updater, server) = MainActor.assumeIsolated {
    let overlay = NowPlayingOverlay()
    let reapplier = Reapplier(assetsDir: assetsDir)
    let updater = Updater()
    let server = AgentServer { request in
        switch (request.method, request.path) {
        case ("POST", "/overlay"):
            guard let settings = try? JSONDecoder().decode(OverlaySettings.self, from: request.body) else {
                return .badRequest
            }
            overlay.apply(settings)
            return .noContent
        case ("GET", "/update"):
            return .json(updater.status)
        case ("POST", "/update"):
            do {
                try await updater.install()
                finishUpdate()
                return .noContent
            } catch {
                return .json(UpdateFailure(error: error.localizedDescription), status: "500 Internal Server Error")
            }
        default:
            return .notFound
        }
    }
    reapplier.start()
    updater.start()
    server.start()
    return (overlay, reapplier, updater, server)
}
withExtendedLifetime((overlay, reapplier, updater, server)) { app.run() }
