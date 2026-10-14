import Foundation
import Network

/// A request the patched Spotify UI sent the agent.
struct AgentRequest {
    let method: String
    let path: String
    let body: Data
}

struct AgentResponse {
    let status: String
    var body: Data = Data()

    static let noContent = AgentResponse(status: "204 No Content")
    static let notFound = AgentResponse(status: "404 Not Found")
    static let badRequest = AgentResponse(status: "400 Bad Request")

    static func json<T: Encodable>(_ value: T, status: String = "200 OK") -> AgentResponse {
        AgentResponse(status: status, body: (try? JSONEncoder().encode(value)) ?? Data())
    }
}

/// Loopback-only HTTP endpoint the patched Spotify UI talks to: popup settings
/// and in-Spotify updates. Only requests whose `Origin` is Spotify's UI are
/// accepted; everything else gets a 403.
final class AgentServer {
    static let port: NWEndpoint.Port = 47621
    private static let allowedOrigin = "https://xpui.app.spotify.com"
    private static let maxRequestBytes = 8 * 1024

    private let route: @MainActor (AgentRequest) async -> AgentResponse
    private var listener: NWListener?
    private let queue = DispatchQueue(label: "SpotifyCustomizer.agent-server")

    init(route: @escaping @MainActor (AgentRequest) async -> AgentResponse) {
        self.route = route
    }

    func start() {
        do {
            let params = NWParameters.tcp
            params.requiredLocalEndpoint = .hostPort(host: .ipv4(.loopback), port: Self.port)
            let listener = try NWListener(using: params)
            listener.newConnectionHandler = { [weak self] connection in self?.accept(connection) }
            listener.stateUpdateHandler = { state in
                if case .failed(let error) = state {
                    NSLog("[SpotifyCustomizer] agent server failed: \(error.localizedDescription)")
                }
            }
            listener.start(queue: queue)
            self.listener = listener
        } catch {
            NSLog("[SpotifyCustomizer] agent server could not start: \(error.localizedDescription)")
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
            return send(AgentResponse(status: "403 Forbidden"), on: connection)
        }
        if request.method == "OPTIONS" {
            return send(.noContent, on: connection)
        }
        let agentRequest = AgentRequest(method: request.method, path: request.path, body: request.body)
        let route = self.route
        Task { @MainActor in
            let response = await route(agentRequest)
            self.send(response, on: connection)
        }
    }

    private func send(_ response: AgentResponse, on connection: NWConnection) {
        var head = [
            "HTTP/1.1 \(response.status)",
            "Access-Control-Allow-Origin: \(Self.allowedOrigin)",
            "Access-Control-Allow-Methods: GET, POST, OPTIONS",
            "Access-Control-Allow-Headers: Content-Type",
            // Chromium's Private Network Access preflight for page → loopback requests.
            "Access-Control-Allow-Private-Network: true",
            "Content-Length: \(response.body.count)",
            "Connection: close",
        ]
        if !response.body.isEmpty { head.append("Content-Type: application/json") }
        let data = Data((head.joined(separator: "\r\n") + "\r\n\r\n").utf8) + response.body
        connection.send(content: data, completion: .contentProcessed { _ in connection.cancel() })
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
