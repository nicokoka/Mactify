import Foundation

/// CLI-local helpers. The core library's Shell is internal, so the CLI keeps its
/// own tiny process runner for restart convenience.
enum FileHelper {
    static func printErr(_ message: String) {
        FileHandle.standardError.write(Data((message + "\n").utf8))
    }
}

enum Shell {
    @discardableResult
    static func runPublic(_ launchPath: String, _ arguments: [String]) throws -> Int32 {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: launchPath)
        process.arguments = arguments
        try process.run()
        process.waitUntilExit()
        return process.terminationStatus
    }
}
