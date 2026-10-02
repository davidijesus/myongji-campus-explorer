package expo.modules.campusnaver

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CampusNaverModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CampusNaver")
    View(CampusNaverView::class) {
      Events("onPlaceSelected", "onMapError")
      Prop("payload") { view: CampusNaverView, json: String -> view.setPayload(json) }
      OnViewDestroys { view: CampusNaverView -> view.dispose() }
    }
  }
}
