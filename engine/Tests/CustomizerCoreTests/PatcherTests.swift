import XCTest
@testable import CustomizerCore

final class PatcherTests: XCTestCase {
    let fm = FileManager.default
    var tmp: URL!

    override func setUpWithError() throws {
        tmp = fm.temporaryDirectory.appendingPathComponent("sc-test-" + UUID().uuidString)
        try fm.createDirectory(at: tmp, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        try? fm.removeItem(at: tmp)
    }

    /// Build a minimal "xpui.spa"-shaped zip: an index.html + a dummy chunk.
    private func makePristineSpa() throws -> URL {
        let src = tmp.appendingPathComponent("src", isDirectory: true)
        try fm.createDirectory(at: src, withIntermediateDirectories: true)
        try "<!doctype html><html><head></head><body><script src=\"/xpui-snapshot.js\"></script></body></html>"
            .write(to: src.appendingPathComponent("index.html"), atomically: true, encoding: .utf8)
        try "console.log('chunk')".write(
            to: src.appendingPathComponent("123.js"), atomically: true, encoding: .utf8)
        let spa = tmp.appendingPathComponent("xpui.spa")
        try Shell.run("/usr/bin/zip", ["-q", "-r", "-X", "-0", spa.path, "."], cwd: src)
        return spa
    }

    private func makeAssetsDir() throws -> URL {
        let assets = tmp.appendingPathComponent("assets", isDirectory: true)
        try fm.createDirectory(at: assets, withIntermediateDirectories: true)
        try "/* loader */".write(to: assets.appendingPathComponent("loader.js"), atomically: true, encoding: .utf8)
        try "/* css */".write(to: assets.appendingPathComponent("loader.css"), atomically: true, encoding: .utf8)
        return assets
    }

    func testApplyInjectsRuntimeAndRefs() throws {
        let patcher = Patcher()
        let pristine = try makePristineSpa()
        let assets = try makeAssetsDir()
        let dest = tmp.appendingPathComponent("live.spa")
        try fm.copyItem(at: pristine, to: dest)

        XCTAssertFalse(try patcher.isPatched(spa: dest))
        try patcher.apply(pristine: pristine, assetsDir: assets, destination: dest)
        XCTAssertTrue(try patcher.isPatched(spa: dest))

        // Verify the archive now serves the runtime and index.html references it.
        let listing = try Shell.run("/usr/bin/unzip", ["-l", dest.path])
        XCTAssertTrue(listing.contains("customizer/loader.js"))
        XCTAssertTrue(listing.contains("customizer/loader.css"))
        XCTAssertTrue(listing.contains("123.js"), "original chunks must survive")

        let indexHTML = try Shell.run("/usr/bin/unzip", ["-p", dest.path, "index.html"])
        XCTAssertTrue(indexHTML.contains(#"/customizer/loader.js"#))
        XCTAssertTrue(indexHTML.contains(#"/customizer/loader.css"#))
    }

    func testApplyIsIdempotentFromPristine() throws {
        let patcher = Patcher()
        let pristine = try makePristineSpa()
        let assets = try makeAssetsDir()
        let dest = tmp.appendingPathComponent("live.spa")
        try fm.copyItem(at: pristine, to: dest)

        try patcher.apply(pristine: pristine, assetsDir: assets, destination: dest)
        let index1 = try Shell.run("/usr/bin/unzip", ["-p", dest.path, "index.html"])
        try patcher.apply(pristine: pristine, assetsDir: assets, destination: dest)
        let index2 = try Shell.run("/usr/bin/unzip", ["-p", dest.path, "index.html"])

        // Patching always starts from pristine, so refs are never duplicated.
        XCTAssertEqual(
            index1.components(separatedBy: "/customizer/loader.js").count,
            index2.components(separatedBy: "/customizer/loader.js").count
        )
        XCTAssertEqual(index2.components(separatedBy: "/customizer/loader.js").count, 2)
    }

    func testRestoreReturnsPristineContents() throws {
        let patcher = Patcher()
        let pristine = try makePristineSpa()
        let assets = try makeAssetsDir()
        let dest = tmp.appendingPathComponent("live.spa")
        try fm.copyItem(at: pristine, to: dest)

        try patcher.apply(pristine: pristine, assetsDir: assets, destination: dest)
        XCTAssertTrue(try patcher.isPatched(spa: dest))

        try patcher.restore(pristine: pristine, destination: dest)
        XCTAssertFalse(try patcher.isPatched(spa: dest))
        let listing = try Shell.run("/usr/bin/unzip", ["-l", dest.path])
        XCTAssertFalse(listing.contains("customizer/loader.js"))
    }
}
