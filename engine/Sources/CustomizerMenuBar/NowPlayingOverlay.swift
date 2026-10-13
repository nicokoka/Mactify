import AppKit
import SwiftUI

/// A system-wide "now playing" toast that floats above every app and Space.
///
/// Spotify posts `com.spotify.client.PlaybackStateChanged` on the distributed
/// notification center whenever playback changes, so no polling or AppleScript
/// permission is needed. Artwork comes from Spotify's public oEmbed endpoint.
@MainActor
final class NowPlayingOverlay: ObservableObject {
    static let defaultsKey = "nowPlayingOverlayEnabled"
    static let onlyWhenAwayKey = "nowPlayingOverlayOnlyWhenAway"

    @Published var enabled: Bool {
        didSet {
            UserDefaults.standard.set(enabled, forKey: Self.defaultsKey)
            enabled ? start() : stop()
        }
    }

    /// Skip the overlay while Spotify is the frontmost app (its in-app toast covers that).
    @Published var onlyWhenAway: Bool {
        didSet { UserDefaults.standard.set(onlyWhenAway, forKey: Self.onlyWhenAwayKey) }
    }

    private var observer: NSObjectProtocol?
    private var lastTrackID = ""
    private var panel: NSPanel?
    private var hideTask: Task<Void, Never>?
    private let model = ToastModel()

    private static let showSeconds: UInt64 = 4
    private static let spotifyBundleID = "com.spotify.client"

    init() {
        let defaults = UserDefaults.standard
        enabled = defaults.bool(forKey: Self.defaultsKey)
        onlyWhenAway = defaults.object(forKey: Self.onlyWhenAwayKey) as? Bool ?? true
        if enabled { start() }
    }

    private func start() {
        guard observer == nil else { return }
        observer = DistributedNotificationCenter.default().addObserver(
            forName: Notification.Name("com.spotify.client.PlaybackStateChanged"),
            object: nil,
            queue: .main
        ) { [weak self] note in
            let info = note.userInfo ?? [:]
            MainActor.assumeIsolated { self?.handle(info) }
        }
    }

    private func stop() {
        if let observer { DistributedNotificationCenter.default().removeObserver(observer) }
        observer = nil
        hideTask?.cancel()
        panel?.orderOut(nil)
    }

    private func handle(_ info: [AnyHashable: Any]) {
        guard (info["Player State"] as? String) == "Playing",
              let trackID = info["Track ID"] as? String,
              trackID != lastTrackID
        else { return }
        lastTrackID = trackID

        if onlyWhenAway,
           NSWorkspace.shared.frontmostApplication?.bundleIdentifier == Self.spotifyBundleID {
            return
        }

        model.title = info["Name"] as? String ?? "Unknown"
        model.artist = info["Artist"] as? String ?? ""
        model.artwork = nil
        show()
        Task { await loadArtwork(trackID: trackID) }
    }

    /// Fetch cover art via oEmbed (`thumbnail_url`). Failure just leaves the placeholder.
    private func loadArtwork(trackID: String) async {
        var components = URLComponents(string: "https://open.spotify.com/oembed")
        components?.queryItems = [URLQueryItem(name: "url", value: trackID)]
        guard let url = components?.url else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            guard let thumb = (json?["thumbnail_url"] as? String).flatMap(URL.init(string:)) else { return }
            let (imageData, _) = try await URLSession.shared.data(from: thumb)
            guard trackID == lastTrackID, let image = NSImage(data: imageData) else { return }
            model.artwork = image
        } catch {
            NSLog("[SpotifyCustomizer] overlay artwork failed: \(error.localizedDescription)")
        }
    }

    private func show() {
        let panel = self.panel ?? makePanel()
        self.panel = panel
        position(panel)
        panel.alphaValue = 0
        panel.orderFrontRegardless()
        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = 0.25
            panel.animator().alphaValue = 1
        }
        hideTask?.cancel()
        hideTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: Self.showSeconds * 1_000_000_000)
            guard !Task.isCancelled else { return }
            self?.fadeOut()
        }
    }

    private func fadeOut() {
        guard let panel else { return }
        NSAnimationContext.runAnimationGroup({ ctx in
            ctx.duration = 0.4
            panel.animator().alphaValue = 0
        }, completionHandler: { panel.orderOut(nil) })
    }

    private func makePanel() -> NSPanel {
        let panel = NSPanel(
            contentRect: NSRect(x: 0, y: 0, width: 340, height: 84),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: true
        )
        panel.level = .statusBar
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary, .ignoresCycle]
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.ignoresMouseEvents = true
        panel.hidesOnDeactivate = false
        panel.contentView = NSHostingView(rootView: ToastView(model: model))
        return panel
    }

    /// Top-right of the screen with the mouse, just under the menu bar.
    private func position(_ panel: NSPanel) {
        let mouse = NSEvent.mouseLocation
        let screen = NSScreen.screens.first { $0.frame.contains(mouse) } ?? NSScreen.main
        guard let visible = screen?.visibleFrame else { return }
        let size = panel.frame.size
        panel.setFrameOrigin(NSPoint(x: visible.maxX - size.width - 16, y: visible.maxY - size.height - 12))
    }
}

@MainActor
final class ToastModel: ObservableObject {
    @Published var title = ""
    @Published var artist = ""
    @Published var artwork: NSImage?
}

private struct ToastView: View {
    @ObservedObject var model: ToastModel

    var body: some View {
        HStack(spacing: 12) {
            Group {
                if let artwork = model.artwork {
                    Image(nsImage: artwork).resizable().aspectRatio(contentMode: .fill)
                } else {
                    ZStack {
                        Color.secondary.opacity(0.2)
                        Image(systemName: "music.note").foregroundStyle(.secondary)
                    }
                }
            }
            .frame(width: 60, height: 60)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

            VStack(alignment: .leading, spacing: 2) {
                Text("NOW PLAYING")
                    .font(.system(size: 10, weight: .heavy))
                    .tracking(1)
                    .foregroundStyle(Color(red: 0.11, green: 0.73, blue: 0.33))
                Text(model.title).font(.system(size: 14, weight: .semibold)).lineLimit(1)
                Text(model.artist).font(.system(size: 12)).foregroundStyle(.secondary).lineLimit(1)
            }
            Spacer(minLength: 0)
        }
        .padding(12)
        .frame(width: 340, height: 84)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .strokeBorder(.white.opacity(0.15), lineWidth: 1)
        )
    }
}
