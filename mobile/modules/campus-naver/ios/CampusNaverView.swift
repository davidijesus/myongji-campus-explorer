import ExpoModulesCore
import NMapsMap
import UIKit

/** Native implementation pending Xcode/device verification. Never receives demo geography. */
final class CampusNaverView: ExpoView {
  private let mapView = NMFMapView(frame: .zero)
  private var markers: [NMFMarker] = []
  private var route: NMFPolylineOverlay?
  private var centerKey = ""
  let onPlaceSelected = EventDispatcher()
  let onMapError = EventDispatcher()

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    addSubview(mapView)
    mapView.positionMode = .disabled
  }
  override func layoutSubviews() {
    super.layoutSubviews()
    mapView.frame = bounds
  }
  private struct Coordinate: Decodable {
    let lat: Double
    let lon: Double
    func validated() throws -> NMGLatLng {
      guard lat.isFinite, lon.isFinite, (31.43...44.35).contains(lat), (122.37...132.0).contains(lon) else {
        throw PayloadError.invalidCoordinate
      }
      return NMGLatLng(lat: lat, lng: lon)
    }
  }
  private struct Pin: Decodable { let id: String; let lat: Double; let lon: Double; let name: String }
  private struct Payload: Decodable {
    let center: Coordinate; let markers: [Pin]; let selectedId: String?; let route: [Coordinate]
  }
  private enum PayloadError: Error { case invalidCoordinate, tooLarge }

  func setPayload(_ value: String) {
    do {
      guard value.utf8.count <= 2_000_000, let raw = value.data(using: .utf8) else { throw PayloadError.tooLarge }
      let payload = try JSONDecoder().decode(Payload.self, from: raw)
      guard payload.markers.count <= 1000, payload.route.count <= 10000 else { throw PayloadError.tooLarge }
      let center = try payload.center.validated()
      markers.forEach { $0.mapView = nil }; markers.removeAll(); route?.mapView = nil; route = nil
      for pin in payload.markers {
        guard pin.id.count <= 100 else { throw PayloadError.tooLarge }
        let marker = NMFMarker()
        marker.position = try Coordinate(lat: pin.lat, lon: pin.lon).validated()
        marker.captionText = String(pin.name.prefix(200))
        marker.width = 28; marker.height = 38
        if pin.id == payload.selectedId { marker.zIndex = 100 }
        marker.touchHandler = { [weak self] _ in
          self?.onPlaceSelected(["placeId": pin.id]); return true
        }
        marker.mapView = mapView
        markers.append(marker)
      }
      if payload.route.count >= 2 {
        let line = NMFPolylineOverlay(points: try payload.route.map { try $0.validated() })
        line?.width = 5
        line?.color = UIColor(red: 22/255, green: 116/255, blue: 105/255, alpha: 1)
        line?.mapView = mapView; route = line
      }
      let key = "\(payload.center.lat),\(payload.center.lon)"
      if centerKey != key {
        mapView.moveCamera(NMFCameraUpdate(scrollTo: center, zoomTo: 16.8))
        centerKey = key
      }
    } catch { onMapError(["message": "Native map data is invalid."]) }
  }
  deinit {
    markers.forEach { $0.touchHandler = nil; $0.mapView = nil }
    route?.mapView = nil
  }
}
