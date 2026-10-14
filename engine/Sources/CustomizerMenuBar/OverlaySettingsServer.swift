import Foundation
import Network

/// Settings the in-Spotify "Now-playing toast" option pushes to the system popup.
struct OverlaySettings: Decodable, Equatable {
    var enabled: Bool
    var showOverFullScreen: Bool
    var seconds: Double
}

/// Loopback-only HTTP endpoint the patched Spotify UI posts toast settings to,
/// so the system-wide popup is controlled from the Spotify panel.
///
/// `POST /overlay` with a JSON `OverlaySettings` body. Only requests whose
/// `Origin` is Spotify's UI are accepted; everything else gets a 403.
final class OverlaySettingsServer {
    static let port: NWEndpoint.Port = 47621
    private static let allowedOrigin = "https://xpui.app.spotify.com"
    private static let maxRequestBytes = 8 * 1024

    private let onSettings: @MainActor (OverlaySettings) -> Void
    private var listener: NWListener?
    private let queue = DispatchQueue(label: "SpotifyCustomizer.overlay-settings")

    init(onSettings: @escaping @MainActor (OverlaySettings) -> Void) {
        self.onSettings = onSettings
    }

    func start() {
        do {
            let params = NWParameters.tcp
            params.requiredLocalEndpoint = .hostPort(host: .ipv4(.loopback), port: Self.port)
            let listener = try NWListener(using: params)
            listener.newConnectionHandler = { [weak self] connection in self?.accept(connection) }
            listener.stateUpdateHandler = { state in
                if case .failed(let error) = state {
                    NSLog("[SpotifyCustomizer] settings server failed: \(error.localizedDescription)")
                }
            }
            listener.start(queue: queue)
            self.listener = listener
        } catch {
            NSLog("[SpotifyCustomizer] settings server could not start: \(error.localizedDescription)")
        }
    }

    private func accept(_ connection: NWConnection) {
        connection.start(queue: queue)
        receive(on: connection, buffer: Data())
    }

    private func receive(on connection: NWConnection, buffer: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: Self.maxRequestBytes) { [weak self] data, _, isComplete, error in
            guard let self else { return }
            var buffer = buffer
            if let data { buffer.append(data) }
            if let request = HTTPRequest(buffer) {
                self.respond(to: request, on: connection)
            } else if error != nil || isComplete || buffer.count > Self.maxRequestBytes {
                connection.cancel()
            } else {
                self.receive(on: connection, buffer: buffer)
            }
        }
    }

    private func respond(to request: HTTPRequest, on connection: NWConnection) {
        guard request.headers["origin"] == Self.allowedOrigin else {
            return send(status: "403 Forbidden", on: connection)
        }
        switch (request.method, request.path) {
        case ("OPTIONS", _):
            send(status: "204 No Content", on: connection)
        case ("POST", "/overlay"):
            guard let settings = try? JSONDecoder().decode(OverlaySettings.self, from: request.body) else {
                return send(status: "400 Bad Request", on: connection)
            }
            let onSettings = self.onSettings
            Task { @MainActor in onSettings(settings) }
            send(status: "204 No Content", on: connection)
        default:
            send(status: "404 Not Found", on: connection)
        }
    }

    private func send(status: String, on connection: NWConnection) {
        let head = [
            "HTTP/1.1 \(status)",
            "Access-Control-Allow-Origin: \(Self.allowedOrigin)",
            "Access-Control-Allow-Methods: POST, OPTIONS",
            "Access-Control-Allow-Headers: Content-Type",
            // Chromium's Private Network Access preflight for page → loopback requests.
            "Access-Control-Allow-Private-Network: true",
            "Content-Length: 0",
            "Connection: close",
            "", "",
        ].joined(separator: "\r\n")
        connection.send(content: Data(head.utf8), completion: .contentProcessed { _ in connection.cancel() })
    }
}

/// Just enough HTTP/1.1 parsing for one small request. Returns nil until the
/// headers and the full `Content-Length` body have arrived.
private struct HTTPRequest {
    let method: String
    let path: String
    let headers: [String: String]
    let body: Data

    init?(_ data: Data) {
        guard let headerEnd = data.range(of: Data("\r\n\r\n".utf8)),
              let head = String(data: data[..<headerEnd.lowerBound], encoding: .utf8)
        else { return nil }
        let lines = head.components(separatedBy: "\r\n")
        let requestLine = lines.first?.split(separator: " ") ?? []
        guard requestLine.count >= 2 else { return nil }

        var headers: [String: String] = [:]
        for line in lines.dropFirst() {
            guard let colon = line.firstIndex(of: ":") else { continue }
            let name = line[..<colon].trimmingCharacters(in: .whitespaces).lowercased()
            headers[name] = line[line.index(after: colon)...].trimmingCharacters(in: .whitespaces)
        }

        let body = data[headerEnd.upperBound...]
        let length = Int(headers["content-length"] ?? "0") ?? 0
        guard body.count >= length else { return nil }

        method = String(requestLine[0])
        path = String(requestLine[1])
        self.headers = headers
        self.body = Data(body.prefix(length))
    }
}
