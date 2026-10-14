package dev.student.myongjiexplorer.standalone;

import android.app.Activity;
import android.app.AlertDialog;
import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.provider.Settings;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/** Dependency-free Android shell. WebView content remains local and frozen. */
public final class MainActivity extends Activity {
    private static final String ASSET_ORIGIN = "https://appassets.androidplatform.net";
    private static final String PAGE = "https://appassets.androidplatform.net/assets/index.html";
    private static final String COMMUNITY_REFRESH = ASSET_ORIGIN + "/native/community-refresh";
    private static final int LOCATION_PERMISSION_REQUEST = 2401;
    private WebView web;
    private FrameLayout root;
    private boolean foreground;
    private boolean backPending;
    private boolean locationPermissionRequestInFlight;
    private String pendingLocationOrigin;
    private GeolocationPermissions.Callback pendingLocationCallback;
    private WebView pendingLocationWeb;
    private WebView locationPermissionWeb;
    private boolean locationPermissionResultReady;
    private int locationPermissionGeneration;
    private CommunityRefreshClient community;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        WebView.setWebContentsDebuggingEnabled(false);
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(244,247,251));
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                Insets keyboard = insets.getInsets(WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));
                return WindowInsets.CONSUMED;
            });
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) controller.setSystemBarsAppearance(WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS, WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
            root.requestApplyInsets();
        } else {
            root.setFitsSystemWindows(true);
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | (Build.VERSION.SDK_INT >= 26 ? View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR : 0));
        }
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        community = new CommunityRefreshClient(CommunityEndpoint.URL, new CommunityCache(getFilesDir()), this::sendCommunityState, this::runOnUiThread);
        createWebView();
    }

    private void createWebView() {
        if (community != null) community.pageLoading();
        backPending = false;
        finishLocationPrompt(false);
        clearPermissionContinuation();
        // Never restore a website permission from an earlier process/page. The OS
        // grant is checked anew for each page; location itself is never persisted.
        GeolocationPermissions.getInstance().clearAll();
        web = new WebView(this);
        final WebView localWeb = web;
        web.setBackgroundColor(Color.rgb(244,247,251));
        if (Build.VERSION.SDK_INT >= 26) web.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setTextZoom(100); // App receives the OS scale explicitly; avoid double scaling.
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setBlockNetworkLoads(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setGeolocationEnabled(foreground);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(true);
        CookieManager.getInstance().setAcceptCookie(false);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if ("GET".equals(request.getMethod()) && PAGE.equals(request.getUrl().toString())) {
                    try {
                        Map<String,String> headers = new HashMap<>();
                        headers.put("Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'");
                        headers.put("X-Content-Type-Options", "nosniff");
                        headers.put("Permissions-Policy", "geolocation=(self), camera=(), microphone=()");
                        return new WebResourceResponse("text/html", "UTF-8", 200, "OK", headers, getAssets().open("index.html"));
                    } catch (IOException error) { return blocked(500, "Asset unavailable"); }
                }
                return blocked(403, "Local content only");
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request.getUrl().toString().startsWith(NaverMapLink.REQUEST + "?")) {
                    // A cancelled local navigation leaves the guide, selection
                    // and chat mounted while the external map is in front.
                    if (view == web && PAGE.equals(view.getUrl()) && request.isForMainFrame() &&
                        "GET".equals(request.getMethod()) && request.hasGesture() && foreground &&
                        !isFinishing() && !isDestroyed()) openNaver(request.getUrl().toString());
                    return true;
                }
                if (COMMUNITY_REFRESH.equals(request.getUrl().toString())) {
                    if (canRefreshCommunity(view, request.isForMainFrame(), request.getMethod())) community.refresh();
                    return true;
                }
                if (PAGE.equals(request.getUrl().toString())) return false;
                if (request.isForMainFrame()) openExternal(request.getUrl().toString());
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                if (view == web && community != null) community.pageLoading();
                if (pendingLocationWeb == view) finishLocationPrompt(false);
                if (locationPermissionWeb == view) clearPermissionContinuation();
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (view == web && PAGE.equals(url)) {
                    updateEnvironment();
                    view.evaluateJavascript("window.MCENaver=Object.freeze({open:function(url){if(navigator.userActivation&&!navigator.userActivation.isActive)return;if(typeof url==='string'&&url.indexOf('" + NaverMapLink.REQUEST + "?')===0)window.location.href=url;}});", null);
                    view.evaluateJavascript("window.MCECommunity=Object.freeze({refresh:function(){if(navigator.userActivation&&!navigator.userActivation.isActive)return;window.location.href='" + COMMUNITY_REFRESH + "';}});", result -> {
                        if (view == web && PAGE.equals(view.getUrl()) && !isFinishing() && !isDestroyed()) community.ready();
                    });
                }
            }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                // A dead renderer cannot receive permission results. Do not allow
                // its delayed OS permission response to authorize a replacement.
                if (pendingLocationWeb == view) clearLocationPrompt();
                if (locationPermissionWeb == view) clearPermissionContinuation();
                if (web != view) { root.removeView(view); view.destroy(); return true; }
                if (community != null) community.pageLoading();
                root.removeView(view); view.destroy(); web = null;
                new AlertDialog.Builder(MainActivity.this).setTitle("Map view stopped")
                    .setMessage("Reopen the saved campus guide. Favorites and language remain on this device.")
                    .setPositiveButton("Reload", (dialog, which) -> createWebView())
                    .setNegativeButton("Close", (dialog, which) -> finish()).setCancelable(false).show();
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) { request.deny(); }
            @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                requestLocationPermission(localWeb, origin, callback);
            }
            @Override public void onGeolocationPermissionsHidePrompt() {
                if (pendingLocationWeb == localWeb) clearLocationPrompt();
            }
            @Override public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message result) {
                if (!isUserGesture) return false;
                final WebView popup = new WebView(MainActivity.this);
                popup.getSettings().setAllowFileAccess(false);
                popup.getSettings().setAllowContentAccess(false);
                popup.getSettings().setBlockNetworkLoads(true);
                popup.setWebViewClient(new WebViewClient() {
                    @Override public boolean shouldOverrideUrlLoading(WebView target, WebResourceRequest request) {
                        openExternal(request.getUrl().toString()); target.post(target::destroy); return true;
                    }
                    @Override public void onPageStarted(WebView target, String url, android.graphics.Bitmap icon) {
                        if (!"about:blank".equals(url)) { target.stopLoading(); openExternal(url); target.post(target::destroy); }
                    }
                    @Override public WebResourceResponse shouldInterceptRequest(WebView target, WebResourceRequest request) { return blocked(403, "External links only"); }
                });
                ((WebView.WebViewTransport) result.obj).setWebView(popup); result.sendToTarget(); return true;
            }
        });
        root.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        web.loadUrl(PAGE);
    }

    private static WebResourceResponse blocked(int status, String reason) {
        return new WebResourceResponse("text/plain", "UTF-8", status, reason, new HashMap<>(), new ByteArrayInputStream(new byte[0]));
    }
    private boolean canRefreshCommunity(WebView owner, boolean mainFrame, String method) {
        return foreground && mainFrame && "GET".equals(method) && owner != null && owner == web
            && PAGE.equals(owner.getUrl()) && !isFinishing() && !isDestroyed() && community != null;
    }
    private void sendCommunityState(CommunityRefreshClient.State state) {
        final WebView owner = web;
        if (owner == null || !PAGE.equals(owner.getUrl()) || isFinishing() || isDestroyed()) return;
        String message = "{type:'community-state',status:'" + state.status + "'"
            + (state.reason == null ? "" : ",reason:'" + state.reason + "'")
            + (state.snapshot == null ? "" : ",snapshot:" + state.snapshot.canonicalJson + ",updatedAt:" + org.json.JSONObject.quote(state.snapshot.updatedAt)) + "}";
        owner.evaluateJavascript("if(window.MCE){MCE.receive(" + message.replace("\u2028", "\\u2028").replace("\u2029", "\\u2029") + ");}", null);
    }
    private static boolean isLocalLocationOrigin(String origin) {
        // WebView versions can serialize an origin with or without a trailing
        // slash. No paths, other hosts, ports, credentials or insecure origins.
        return ASSET_ORIGIN.equals(origin) || (ASSET_ORIGIN + "/").equals(origin);
    }
    private boolean hasLocationPermission() {
        // Approximate location remains useful and is never silently upgraded.
        return checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }
    private boolean canUseLocation(WebView owner, String origin) {
        return foreground && !isFinishing() && !isDestroyed() && owner != null
            && owner == web && PAGE.equals(owner.getUrl()) && isLocalLocationOrigin(origin);
    }
    private void requestLocationPermission(WebView owner, String origin, GeolocationPermissions.Callback callback) {
        // The bundled UI invokes navigator.geolocation only from its My Location
        // action. There is no JavaScript interface and no native location service.
        if (!canUseLocation(owner, origin)) { callback.invoke(origin, false, false); return; }
        if (hasLocationPermission()) { callback.invoke(origin, true, false); return; }
        // WebView normally coalesces requests for an origin. Never replace a
        // pending callback or open a second Android dialog if it does not.
        if (locationPermissionRequestInFlight || pendingLocationCallback != null) {
            callback.invoke(origin, false, false); return;
        }
        pendingLocationOrigin = origin;
        pendingLocationCallback = callback;
        pendingLocationWeb = owner;
        locationPermissionWeb = owner;
        locationPermissionResultReady = false;
        final int generation = ++locationPermissionGeneration;
        // UI preserves the intent of this explicit tap across Android's dialog,
        // but still clears its watch when the Activity pauses. This event carries
        // permission state only, never position data or privileged native access.
        owner.evaluateJavascript("(function(){if(!window.MCE)return false;MCE.receive({type:'location-permission',pending:true,granted:false,cancelled:false});return true;})()", notified -> {
            // Opening the OS dialog can pause the Activity immediately. Wait for
            // the page to receive pending:true before allowing that transition.
            // Reload can reuse the same WebView and URL. A result from the old
            // page must neither open a dialog nor clear a newer page's request.
            if (generation != locationPermissionGeneration || locationPermissionWeb != owner) return;
            if (!"true".equals(notified) || pendingLocationCallback != callback || !canUseLocation(owner, origin)) {
                finishLocationPrompt(false);
                sendLocationPermissionState(locationPermissionWeb, false, false);
                clearPermissionContinuation();
                return;
            }
            locationPermissionRequestInFlight = true;
            try {
                // Request together so Android 12+ offers approximate/precise.
                // Precise is useful for a building-scale campus map.
                requestPermissions(new String[] { Manifest.permission.ACCESS_COARSE_LOCATION,
                    Manifest.permission.ACCESS_FINE_LOCATION }, LOCATION_PERMISSION_REQUEST);
            } catch (RuntimeException error) {
                locationPermissionRequestInFlight = false;
                finishLocationPrompt(false);
                locationPermissionResultReady = true;
                deliverLocationPermissionResult();
            }
        });
    }
    private void clearLocationPrompt() {
        pendingLocationCallback = null;
        pendingLocationOrigin = null;
        pendingLocationWeb = null;
    }
    private void finishLocationPrompt(boolean allow) {
        GeolocationPermissions.Callback callback = pendingLocationCallback;
        String origin = pendingLocationOrigin;
        boolean grant = allow && canUseLocation(pendingLocationWeb, origin) && hasLocationPermission();
        clearLocationPrompt();
        if (callback != null) callback.invoke(origin, grant, false);
    }
    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != LOCATION_PERMISSION_REQUEST) return;
        locationPermissionRequestInFlight = false;
        locationPermissionResultReady = true;
        // Check actual OS state (including approximate/one-time grants), not the
        // positions of entries in a potentially empty/cancelled result array.
        if (!hasLocationPermission()) finishLocationPrompt(false);
        else if (foreground) finishLocationPrompt(true);
        deliverLocationPermissionResult();
        // Permission dialogs may pause the Activity. A still-live page receives
        // a grant only after onResume; onStop/destruction discards the request.
    }
    private void sendLocationPermissionState(WebView owner, boolean pending, boolean granted) {
        sendLocationPermissionState(owner, pending, granted, false);
    }
    private void sendLocationPermissionState(WebView owner, boolean pending, boolean granted, boolean cancelled) {
        if (owner == null || owner != web || !PAGE.equals(owner.getUrl()) || isDestroyed()) return;
        owner.evaluateJavascript("if(window.MCE){MCE.receive({type:'location-permission',pending:"
            + pending + ",granted:" + granted + ",cancelled:" + cancelled + "});}", null);
    }
    private void clearPermissionContinuation() {
        locationPermissionGeneration++;
        locationPermissionWeb = null;
        locationPermissionResultReady = false;
    }
    private void deliverLocationPermissionResult() {
        if (!locationPermissionResultReady || !foreground) return;
        WebView owner = locationPermissionWeb;
        clearPermissionContinuation();
        sendLocationPermissionState(owner, false, canUseLocation(owner, ASSET_ORIGIN) && hasLocationPermission());
    }
    private void suspendLocation() {
        finishLocationPrompt(false);
        // MCE's lifecycle handler clears its watch before the WebView pauses.
        // Disabling this capability also rejects new calls while not visible.
        updateEnvironment();
        if (web != null) web.getSettings().setGeolocationEnabled(false);
    }
    private void openNaver(String value) {
        NaverMapLink link = NaverMapLink.fromRequest(value, getPackageName());
        if (link == null) { Toast.makeText(this, "This map destination is unavailable.", Toast.LENGTH_SHORT).show(); return; }
        try {
            // Package pinning avoids dispatch to arbitrary custom-scheme apps.
            // Calling directly needs no QUERY_ALL_PACKAGES or new permission.
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(link.appUrl))
                .setPackage(NaverMapLink.PACKAGE).addCategory(Intent.CATEGORY_BROWSABLE));
        } catch (ActivityNotFoundException | SecurityException error) {
            // No forced installation: the same campus-qualified search remains
            // available in a browser. Its results are not verified entrances.
            openExternal(link.webUrl);
        }
    }
    private void openExternal(String value) {
        if (!ExternalLinkPolicy.allows(value)) { Toast.makeText(this, "This link is not a reviewed campus source.", Toast.LENGTH_SHORT).show(); return; }
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(value)).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch (ActivityNotFoundException | SecurityException error) { Toast.makeText(this, "No app is available to open this source.", Toast.LENGTH_SHORT).show(); }
    }
    private void updateEnvironment() {
        if (web == null) return;
        float scale = Math.max(1f, Math.min(2f, getResources().getConfiguration().fontScale));
        boolean reduced = Settings.Global.getFloat(getContentResolver(), Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f;
        web.evaluateJavascript("if(window.MCE){MCE.receive({type:'lifecycle',active:"+foreground+"});MCE.receive({type:'font-scale',scale:"+scale+"});MCE.receive({type:'reduced-motion',enabled:"+reduced+"});}", null);
    }
    private void handleBack() {
        if (web == null) { finish(); return; }
        // Let the app unwind its visible UI before leaving the local guide.
        // Do not infer navigation from DOM nodes: a selected building can remain
        // mounted while a different tab is visible.
        if (backPending || isFinishing() || isDestroyed()) return;
        final WebView current = web;
        backPending = true;
        current.evaluateJavascript("(function(){return !!(window.MCE && typeof MCE.handleBack === 'function' && MCE.handleBack());})()", handled -> {
            // A renderer replacement or Activity destruction can outlive the JS
            // evaluation. Its old result must not finish the replacement screen.
            if (web != current || isFinishing() || isDestroyed()) return;
            backPending = false;
            if (!"true".equals(handled)) finish();
        });
    }
    @Override public void onBackPressed() { handleBack(); }
    @Override protected void onResume() {
        super.onResume(); foreground = true;
        if (community != null) community.resume();
        if (web != null) { web.getSettings().setGeolocationEnabled(true); web.onResume(); }
        updateEnvironment();
        if (!locationPermissionRequestInFlight) finishLocationPrompt(true);
        deliverLocationPermissionResult();
    }
    @Override protected void onPause() {
        foreground = false;
        if (community != null) community.pause();
        suspendLocation();
        if (web != null) web.onPause();
        super.onPause();
    }
    @Override protected void onStop() {
        foreground = false; suspendLocation();
        // Cancel on the current page even if the OS result was already delivered:
        // its UI may still be waiting for document visibility before continuing.
        // Leaving the app must never resume that intent on the next onResume.
        sendLocationPermissionState(web, false, false, true);
        clearPermissionContinuation();
        super.onStop();
    }
    @Override public void onConfigurationChanged(Configuration configuration) { super.onConfigurationChanged(configuration); root.requestApplyInsets(); updateEnvironment(); }
    @Override protected void onDestroy() {
        if (community != null) community.close();
        foreground = false; finishLocationPrompt(false);
        clearPermissionContinuation();
        if (web != null) { root.removeView(web); web.destroy(); web = null; }
        GeolocationPermissions.getInstance().clearAll();
        super.onDestroy();
    }
}
