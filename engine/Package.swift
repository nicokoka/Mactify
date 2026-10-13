// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "SpotifyCustomizer",
    platforms: [.macOS(.v13)],
    products: [
        .library(name: "CustomizerCore", targets: ["CustomizerCore"]),
        .executable(name: "customizer", targets: ["customizer-cli"]),
        .executable(name: "CustomizerMenuBar", targets: ["CustomizerMenuBar"]),
    ],
    targets: [
        .target(name: "CustomizerCore"),
        .executableTarget(
            name: "customizer-cli",
            dependencies: ["CustomizerCore"]
        ),
        .executableTarget(
            name: "CustomizerMenuBar",
            dependencies: ["CustomizerCore"]
        ),
        .testTarget(
            name: "CustomizerCoreTests",
            dependencies: ["CustomizerCore"]
        ),
    ]
)
