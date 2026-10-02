package dev.student.myongjiexplorer.standalone;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
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

/** Dependency-free, local-only Android shell. The bundled HTML is byte-for-byte frozen. */
public final class MainActivity extends Activity {
    private static final String PAGE = "https://appassets.androidplatform.net/assets/index.html";
    private WebView web;
    private FrameLayout root;
    private boolean foreground;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        WebView.setWebContentsDebuggingEnabled(false);
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(245,248,243));
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
        createWebView();
    }

    private void createWebView() {
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(245,248,243));
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
        settings.setGeolocationEnabled(false);
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
                        return new WebResourceResponse("text/html", "UTF-8", 200, "OK", headers, getAssets().open("index.html"));
                    } catch (IOException error) { return blocked(500, "Asset unavailable"); }
                }
                return blocked(403, "Local content only");
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (PAGE.equals(request.getUrl().toString())) return false;
                if (request.isForMainFrame()) openExternal(request.getUrl().toString());
                return true;
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (PAGE.equals(url)) updateEnvironment();
            }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
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
            @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) { callback.invoke(origin, false, false); }
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
        web.evaluateJavascript("(function(){var d=document.querySelector('dialog[open]');if(d){d.close();return true;}var s=document.querySelector('#place-sheet:not([hidden]) [data-action=close-place]');if(s){s.click();return true;}return false;})()", handled -> {
            if (!"true".equals(handled)) finish();
        });
    }
    @Override public void onBackPressed() { handleBack(); }
    @Override protected void onResume() { super.onResume(); foreground = true; if (web != null) web.onResume(); updateEnvironment(); }
    @Override protected void onPause() { foreground = false; updateEnvironment(); if (web != null) web.onPause(); super.onPause(); }
    @Override public void onConfigurationChanged(Configuration configuration) { super.onConfigurationChanged(configuration); root.requestApplyInsets(); updateEnvironment(); }
    @Override protected void onDestroy() { if (web != null) { root.removeView(web); web.destroy(); web = null; } super.onDestroy(); }
}
