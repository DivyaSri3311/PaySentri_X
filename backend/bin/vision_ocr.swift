
import Foundation
import Vision
import AppKit

if CommandLine.arguments.count < 2 {
    print("[]")
    exit(0)
}

let imagePath = CommandLine.arguments[1]
guard let image = NSImage(contentsOfFile: imagePath),
      let tiffData = image.tiffRepresentation,
      let bitmapImage = NSBitmapImageRep(data: tiffData),
      let cgImage = bitmapImage.cgImage else {
    print("[]")
    exit(0)
}

struct LineItem: Codable {
    let text: String
    let confidence: Float
}

var items = [LineItem]()

let request = VNRecognizeTextRequest { (request, error) in
    guard let observations = request.results as? [VNRecognizedTextObservation] else { return }
    for obs in observations {
        if let top = obs.topCandidates(1).first {
            items.append(LineItem(text: top.string, confidence: top.confidence))
        }
    }
}
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try? handler.perform([request])

if let data = try? JSONEncoder().encode(items),
   let jsonStr = String(data: data, encoding: .utf8) {
    print(jsonStr)
} else {
    print("[]")
}
