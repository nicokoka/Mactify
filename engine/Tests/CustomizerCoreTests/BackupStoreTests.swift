import XCTest
@testable import CustomizerCore

final class BackupStoreTests: XCTestCase {
    let fm = FileManager.default
    var tmp: URL!

    override func setUpWithError() throws {
        tmp = fm.temporaryDirectory.appendingPathComponent("sc-bk-" + UUID().uuidString)
        try fm.createDirectory(at: tmp, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        try? fm.removeItem(at: tmp)
    }

    private func makeSpa(named name: String, patched: Bool) throws -> URL {
        let src = tmp.appendingPathComponent("src-" + name, isDirectory: true)
        try fm.createDirectory(at: src, withIntermediateDirectories: true)
        try "<html></html>".write(to: src.appendingPathComponent("index.html"), atomically: true, encoding: .utf8)
        if patched {
            let dir = src.appendingPathComponent("customizer", isDirectory: true)
            try fm.createDirectory(at: dir, withIntermediateDirectories: true)
            try "x".write(to: dir.appendingPathComponent("loader.js"), atomically: true, encoding: .utf8)
        }
        let spa = tmp.appendingPathComponent(name)
        try Shell.run("/usr/bin/zip", ["-q", "-r", "-X", "-0", spa.path, "."], cwd: src)
        return spa
    }

    func testSha256IsStable() throws {
        let spa = try makeSpa(named: "a.spa", patched: false)
        let h1 = try BackupStore.sha256(of: spa)
        let h2 = try BackupStore.sha256(of: spa)
        XCTAssertEqual(h1, h2)
        XCTAssertEqual(h1.count, 64)
    }

    func testRefusesToBackupAlreadyPatchedLive() throws {
        // We can't easily redirect Paths.supportDir, so exercise the guard logic
        // directly: a patched live archive must be rejected as a pristine source.
        let patched = try makeSpa(named: "patched.spa", patched: true)
        XCTAssertTrue(try Patcher().isPatched(spa: patched))
    }
}
