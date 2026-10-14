import AppKit
import SwiftUI

/// A system-wide "now playing" toast that floats above every app and Space.
///
/// Spotify posts `com.spotify.client.PlaybackStateChanged` on the distributed
/// notification center whenever playback changes, so no polling or AppleScript
/// permission is needed. Artwork comes from Spotify's public oEmbed endpoint.
///
/// Controlled from Spotify's own panel: the "Now-playing toast" option posts its
/// settings to `OverlaySettingsServer`, and they're kept in UserDefaults so the
/// popup keeps working when the agent restarts before Spotify does.
@MainActor
final class NowPlayingOverlay {
    static let defaultsKey = "nowPlayingOverlayEnabled"
    static let overFullScreenKey = "nowPlayingOverlayOverFullScreen"
    static let secondsKey = "nowPlayingOverlaySeconds"

    private var enabled: Bool {
        didSet {
            UserDefaults.standard.set(enabled, forKey: Self.defaultsKey)
            enabled ? start() : stop()
        }
    }

    /// Also show over full-screen apps (videos, games, full-screen Docs…).
    private var showOverFullScreen: Bool {
        didSet {
            UserDefaults.standard.set(showOverFullScreen, forKey: Self.overFullScreenKey)
            panel?.collectionBehavior = Self.spaceBehavior(overFullScreen: showOverFullScreen)
        }
    }

    private var showSeconds: Double {
        didSet { UserDefaults.standard.set(showSeconds, forKey: Self.secondsKey) }
    }

    private var server: OverlaySettingsServer?
    private var observer: PlaybackObserver?
    private var lastTrackID = ""
    private var panel: NSPanel?
    private var hideTask: Task<Void, Never>?
    private var pending: PendingTrack?
    private var artworkCache: [String: NSImage] = [:]
    private let model = ToastModel()

    /// How long to hold the toast back waiting for cover art before showing a placeholder.
    private static let artworkWaitNanoseconds: UInt64 = 1_500_000_000
    private static let artworkCacheLimit = 50
    private static let spotifyBundleID = "com.spotify.client"

    init() {
        let defaults = UserDefaults.standard
        enabled = defaults.bool(forKey: Self.defaultsKey)
        showOverFullScreen = defaults.object(forKey: Self.overFullScreenKey) as? Bool ?? true
        showSeconds = defaults.object(forKey: Self.secondsKey) as? Double ?? 4
        if enabled { start() }
        server = OverlaySettingsServer { [weak self] settings in self?.apply(settings) }
        server?.start()
    }

    /// Settings pushed from Spotify's panel. Spotify resends them on every track
    /// change, so only real changes are written through.
    private func apply(_ settings: OverlaySettings) {
        if enabled != settings.enabled { enabled = settings.enabled }
        if showOverFullScreen != settings.showOverFullScreen { showOverFullScreen = settings.showOverFullScreen }
        let seconds = min(max(settings.seconds, 1), 15)
        if showSeconds != seconds { showSeconds = seconds }
    }

    private func start() {
        guard observer == nil else { return }
        observer = PlaybackObserver { [weak self] info in
            MainActor.assumeIsolated { self?.handle(info) }
        }
    }

    private func stop() {
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

        // Inside Spotify its own in-app toast takes over.
        if NSWorkspace.shared.frontmostApplication?.bundleIdentifier == Self.spotifyBundleID {
            return
        }
        if !showOverFullScreen, Self.frontAppIsFullScreen() { return }

        let track = PendingTrack(
            id: trackID,
            title: info["Name"] as? String ?? "Unknown",
            artist: info["Artist"] as? String ?? ""
        )
        if let cached = artworkCache[trackID] {
            reveal(track, artwork: cached)
            return
        }

        // Hold the toast until the art arrives so it never flashes the gray
        // placeholder; if the network is slow, show it anyway after the wait.
        pending = track
        Task {
            let artwork = await Self.fetchArtwork(trackID: trackID)
            if let artwork { cacheArtwork(artwork, for: trackID) }
            guard trackID == lastTrackID else { return }
            if pending?.id == trackID {
                reveal(track, artwork: artwork)
            } else if model.artwork == nil {
                model.artwork = artwork
            }
        }
        Task {
            try? await Task.sleep(nanoseconds: Self.artworkWaitNanoseconds)
            if pending?.id == trackID { reveal(track, artwork: nil) }
        }
    }

    private func reveal(_ track: PendingTrack, artwork: NSImage?) {
        pending = nil
        model.title = track.title
        model.artist = track.artist
        model.artwork = artwork
        show()
    }

    private func cacheArtwork(_ image: NSImage, for trackID: String) {
        if artworkCache.count >= Self.artworkCacheLimit { artworkCache.removeAll() }
        artworkCache[trackID] = image
    }

    /// Fetch cover art via oEmbed (`thumbnail_url`). Returns nil on failure (placeholder shows).
    private static func fetchArtwork(trackID: String) async -> NSImage? {
        var components = URLComponents(string: "https://open.spotify.com/oembed")
        components?.queryItems = [URLQueryItem(name: "url", value: trackID)]
        guard let url = components?.url else { return nil }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            guard let thumb = (json?["thumbnail_url"] as? String).flatMap(URL.init(string:)) else { return nil }
            let (imageData, _) = try await URLSession.shared.data(from: thumb)
            return NSImage(data: imageData)
        } catch {
            NSLog("[SpotifyCustomizer] overlay artwork failed: \(error.localizedDescription)")
            return nil
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
            try? await Task.sleep(nanoseconds: UInt64(self?.showSeconds ?? 4) * 1_000_000_000)
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
        panel.collectionBehavior = Self.spaceBehavior(overFullScreen: showOverFullScreen)
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.ignoresMouseEvents = true
        panel.hidesOnDeactivate = false
        panel.contentView = NSHostingView(rootView: ToastView(model: model))
        return panel
    }

    /// `.fullScreenAuxiliary` is what lets a window into another app's full-screen Space.
    private static func spaceBehavior(overFullScreen: Bool) -> NSWindow.CollectionBehavior {
        var behavior: NSWindow.CollectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle]
        if overFullScreen { behavior.insert(.fullScreenAuxiliary) }
        return behavior
    }

    /// True when the frontmost app has a normal-layer window covering a whole screen.
    /// Window bounds and owner PIDs don't need Screen Recording permission.
    private static func frontAppIsFullScreen() -> Bool {
        guard let pid = NSWorkspace.shared.frontmostApplication?.processIdentifier,
              let windows = CGWindowListCopyWindowInfo(
                  [.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID
              ) as? [[String: Any]]
        else { return false }
        let screenSizes = NSScreen.screens.map(\.frame.size)
        return windows.contains { window in
            guard (window[kCGWindowOwnerPID as String] as? pid_t) == pid,
                  (window[kCGWindowLayer as String] as? Int) == 0,
                  let boundsDict = window[kCGWindowBounds as String] as? NSDictionary,
                  let bounds = CGRect(dictionaryRepresentation: boundsDict as CFDictionary)
            else { return false }
            return screenSizes.contains(bounds.size)
        }
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

/// Selector-based observer so delivery can be `.deliverImmediately`. The block API
/// uses `.coalesce`, and NSApplication suspends distributed notifications while the
/// app is inactive — which a background agent always is — so the toast would
/// never fire.
private final class PlaybackObserver: NSObject {
    private let onChange: ([AnyHashable: Any]) -> Void

    init(onChange: @escaping ([AnyHashable: Any]) -> Void) {
        self.onChange = onChange
        super.init()
        DistributedNotificationCenter.default().addObserver(
            self,
            selector: #selector(received(_:)),
            name: Notification.Name("com.spotify.client.PlaybackStateChanged"),
            object: nil,
            suspensionBehavior: .deliverImmediately
        )
    }

    deinit { DistributedNotificationCenter.default().removeObserver(self) }

    @objc private func received(_ note: Notification) { onChange(note.userInfo ?? [:]) }
}

private struct PendingTrack {
    let id: String
    let title: String
    let artist: String
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
