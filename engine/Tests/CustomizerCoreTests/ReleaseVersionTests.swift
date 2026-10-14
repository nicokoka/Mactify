import XCTest
@testable import CustomizerCore

final class ReleaseVersionTests: XCTestCase {
    func testParsesPlainAndVPrefixedTags() {
        XCTAssertEqual(ReleaseVersion("1.2.3")?.description, "1.2.3")
        XCTAssertEqual(ReleaseVersion("v0.10.0")?.description, "0.10.0")
        XCTAssertEqual(ReleaseVersion(" v2.0.1\n")?.description, "2.0.1")
    }

    func testRejectsNonReleaseVersions() {
        for text in ["dev", "", "1.2", "1.2.3.4", "v1.x.0", "1.2.-3", "1..3"] {
            XCTAssertNil(ReleaseVersion(text), text)
        }
    }

    func testComparesNumericallyNotLexically() {
        XCTAssertLessThan(ReleaseVersion("0.9.0")!, ReleaseVersion("0.10.0")!)
        XCTAssertLessThan(ReleaseVersion("1.2.3")!, ReleaseVersion("1.2.4")!)
        XCTAssertLessThan(ReleaseVersion("1.9.9")!, ReleaseVersion("2.0.0")!)
        XCTAssertEqual(ReleaseVersion("v1.0.0"), ReleaseVersion("1.0.0"))
    }
}
