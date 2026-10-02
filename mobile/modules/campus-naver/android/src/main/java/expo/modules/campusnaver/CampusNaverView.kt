package expo.modules.campusnaver

import android.content.Context
import android.content.ComponentCallbacks2
import android.content.res.Configuration
import android.graphics.Color
import android.os.Bundle
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.findViewTreeLifecycleOwner
import com.naver.maps.geometry.LatLng
import com.naver.maps.map.CameraUpdate
import com.naver.maps.map.MapView
import com.naver.maps.map.NaverMap
import com.naver.maps.map.overlay.Marker
import com.naver.maps.map.overlay.PolylineOverlay
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import expo.modules.kotlin.viewevent.EventDispatcher
import org.json.JSONObject

/** Native POC implementation. Build/lifecycle/authentication must be checked on devices. */
class CampusNaverView(context: Context, appContext: AppContext) : ExpoView(context, appContext),
  DefaultLifecycleObserver, ComponentCallbacks2 {
  private val mapView = MapView(context)
  private var map: NaverMap? = null
  private var json: String? = null
  private var disposed = false
  private var started = false
  private var resumed = false
  private var lifecycleOwner: LifecycleOwner? = null
  private var lastCenter: LatLng? = null
  private val markers = mutableListOf<Marker>()
  private var route: PolylineOverlay? = null
  private val savedMapState = Bundle()
  val onPlaceSelected by EventDispatcher()
  val onMapError by EventDispatcher()

  init {
    addView(mapView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    mapView.onCreate(null)
    context.applicationContext.registerComponentCallbacks(this)
    mapView.getMapAsync { ready ->
      if (!disposed) { map = ready; ready.uiSettings.isLocationButtonEnabled = false; renderPayload() }
    }
  }
  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
    super.onLayout(changed, l, t, r, b)
    mapView.layout(0, 0, r - l, b - t)
  }
  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    lifecycleOwner = findViewTreeLifecycleOwner()
    lifecycleOwner?.lifecycle?.addObserver(this)
    if (lifecycleOwner == null) {
      // Do not leave an unowned native map running in the background.
      onMapError(mapOf("message" to "Native map lifecycle owner unavailable."))
    }
  }
  override fun onDetachedFromWindow() {
    lifecycleOwner?.lifecycle?.removeObserver(this); lifecycleOwner = null
    pauseMap(); stopMap()
    super.onDetachedFromWindow()
  }
  override fun onStart(owner: LifecycleOwner) { if (!started && !disposed) { mapView.onStart(); started = true } }
  override fun onResume(owner: LifecycleOwner) { if (!resumed && !disposed) { mapView.onResume(); resumed = true } }
  override fun onPause(owner: LifecycleOwner) = pauseMap()
  override fun onStop(owner: LifecycleOwner) = stopMap()
  override fun onDestroy(owner: LifecycleOwner) = dispose()
  private fun pauseMap() { if (resumed) { mapView.onPause(); resumed = false } }
  private fun stopMap() { if (started) { mapView.onSaveInstanceState(savedMapState); mapView.onStop(); started = false } }
  override fun onLowMemory() { if (!disposed) mapView.onLowMemory() }
  override fun onTrimMemory(level: Int) { if (level >= ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW) onLowMemory() }
  override fun onConfigurationChanged(newConfig: Configuration) { }

  fun dispose() {
    if (disposed) return
    lifecycleOwner?.lifecycle?.removeObserver(this); lifecycleOwner = null
    pauseMap(); stopMap(); disposed = true
    markers.forEach { it.map = null }; markers.clear(); route?.map = null
    mapView.onDestroy(); map = null
    context.applicationContext.unregisterComponentCallbacks(this)
  }
  fun setPayload(value: String) {
    if (value.length > 2_000_000) { onMapError(mapOf("message" to "Map payload too large.")); return }
    json = value; renderPayload()
  }
  private fun point(value: JSONObject): LatLng {
    val lat = value.getDouble("lat"); val lon = value.getDouble("lon")
    require(lat.isFinite() && lon.isFinite() && lat in 31.43..44.35 && lon in 122.37..132.0)
    return LatLng(lat, lon)
  }
  private fun renderPayload() {
    val naver = map ?: return
    val raw = json ?: return
    try {
      val data = JSONObject(raw)
      val center = point(data.getJSONObject("center"))
      val items = data.getJSONArray("markers"); require(items.length() <= 1000)
      markers.forEach { it.map = null }; markers.clear(); route?.map = null; route = null
      for (i in 0 until items.length()) {
        val item = items.getJSONObject(i); val id = item.getString("id"); require(id.length <= 100)
        val marker = Marker()
        marker.position = point(item)
        marker.captionText = item.getString("name").take(200)
        marker.width = (28 * resources.displayMetrics.density).toInt()
        marker.height = (38 * resources.displayMetrics.density).toInt()
        marker.setOnClickListener { onPlaceSelected(mapOf("placeId" to id)); true }
        marker.map = naver; markers.add(marker)
        if (id == data.optString("selectedId")) marker.zIndex = 100
      }
      val points = data.getJSONArray("route"); require(points.length() <= 10000)
      if (points.length() >= 2) {
        route = PolylineOverlay().also {
          it.coords = (0 until points.length()).map { j -> point(points.getJSONObject(j)) }
          it.width = (5 * resources.displayMetrics.density).toInt()
          it.color = Color.rgb(22, 116, 105)
          it.map = naver
        }
      }
      if (lastCenter != center) { naver.moveCamera(CameraUpdate.scrollAndZoomTo(center, 16.8)); lastCenter = center }
    } catch (_: Exception) { onMapError(mapOf("message" to "Native map data is invalid.")) }
  }
}
