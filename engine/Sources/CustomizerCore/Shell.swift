import Foundation

/// Thin wrapper around Process for the zip/unzip calls the patcher needs.
/// macOS ships `/usr/bin/zip` and `/usr/bin/unzip`, so we avoid a third-party
/// archive dependency and match Spotify's "store" compression exactly.
enum Shell {
    struct CommandError: LocalizedError {
        let command: String
        let status: Int32
        let output: String
        var errorDescription: String? {
            "`\(command)` exited \(status):\n\(output)"
        }
    }

    @discardableResult
    static func run(
        _ launchPath: String,
        _ arguments: [String],
        cwd: URL? = nil,
        allowedExitCodes: Set<Int32> = [0]
    ) throws -> String {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: launchPath)
        process.arguments = arguments
        if let cwd { process.currentDirectoryURL = cwd }

        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = pipe

        try process.run()
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        process.waitUntilExit()

        let output = String(data: data, encoding: .utf8) ?? ""
        guard allowedExitCodes.contains(process.terminationStatus) else {
            throw CommandError(
                command: "\(launchPath) \(arguments.joined(separator: " "))",
                status: process.terminationStatus,
                output: output
            )
        }
        return output
    }
}
