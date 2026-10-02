import ExpoModulesCore

public class CampusNaverModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CampusNaver")
    View(CampusNaverView.self) {
      Events("onPlaceSelected", "onMapError")
      Prop("payload") { (view: CampusNaverView, value: String) in
        view.setPayload(value)
      }
    }
  }
}
