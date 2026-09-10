package com.vetaxis.app;

import android.annotation.SuppressLint;
import android.annotation.TargetApi;
import android.app.Activity;
import android.app.Dialog;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.os.Vibrator;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {

    // Use the official Firebase authorized domain to ensure Google OAuth succeeds without unauthorized-domain errors
    public static final String LOCAL_BASE_URL = "https://vetaxis360.firebaseapp.com/index.html";
    public static final String APP_HOST = "vetaxis360.firebaseapp.com";
    private static final int FILE_CHOOSER_REQUEST = 2001;

    private WebView mWebView;
    private ProgressBar mProgressBar;
    private ValueCallback<Uri[]> mFilePathCallback;

    public class AndroidBridge {
        @JavascriptInterface
        public void vibrate(long ms) {
            try {
                Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null) {
                    v.vibrate(ms);
                }
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public boolean isNativeApp() {
            return true;
        }

        @JavascriptInterface
        public String getAppVersion() {
            return "1.0.3";
        }

        @JavascriptInterface
        public int getVersionCode() {
            return 4;
        }

        @JavascriptInterface
        public void showToast(final String msg) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    private String getMimeType(String path) {
        if (path == null) return "text/plain";
        String lower = path.toLowerCase();
        if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "text/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".ico")) return "image/x-icon";
        if (lower.endsWith(".woff2")) return "font/woff2";
        if (lower.endsWith(".woff")) return "font/woff";
        if (lower.endsWith(".ttf")) return "font/ttf";
        if (lower.endsWith(".xml")) return "application/xml";
        if (lower.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }

    private WebResourceResponse getAssetResponse(String urlStr) {
        try {
            Uri uri = Uri.parse(urlStr);
            if (uri == null) return null;
            String host = uri.getHost();
            if (host == null) return null;

            boolean isAppHost = host.equalsIgnoreCase(APP_HOST)
                    || host.equalsIgnoreCase("vetaxis360.web.app")
                    || host.equalsIgnoreCase("vetaxis360.app")
                    || host.equalsIgnoreCase("localhost")
                    || host.equalsIgnoreCase("127.0.0.1")
                    || host.equalsIgnoreCase("appassets.androidplatform.net");

            if (!isAppHost) {
                // Allow all external network requests (Google accounts, Firestore, cloud APIs) to pass through
                return null;
            }

            String path = uri.getPath();
            // CRITICAL: Firebase internal OAuth handlers, APIs, and cloud services
            // MUST reach live servers directly and NEVER be intercepted as local assets!
            if (path != null && (
                path.startsWith("/__/") || 
                path.contains("/__/auth/") || 
                path.startsWith("/api/") ||
                path.startsWith("/identitytoolkit") ||
                path.startsWith("/google.firestore")
            )) {
                return null;
            }

            if (path == null || path.isEmpty() || "/".equals(path)) {
                path = "index.html";
            } else if (path.startsWith("/")) {
                path = path.substring(1);
            }

            InputStream is = null;
            // 1. Try exact asset path
            try {
                is = getAssets().open(path);
            } catch (Exception ignored) {}

            // 2. Try prefixing with assets/
            if (is == null && !path.startsWith("assets/")) {
                try {
                    is = getAssets().open("assets/" + path);
                    if (is != null) path = "assets/" + path;
                } catch (Exception ignored) {}
            }

            // 3. Client-side SPA route fallback: serve index.html for virtual routes
            if (is == null && !path.contains(".")) {
                try {
                    is = getAssets().open("index.html");
                    path = "index.html";
                } catch (Exception ignored) {}
            }

            if (is == null) {
                // CRITICAL FIX: If a Javascript, CSS, or bundled asset cannot be opened locally,
                // DO NOT let the request fall through to Firebase hosting!
                // Firebase hosting returns index.html (HTML) with HTTP 200 for missing assets,
                // which causes "Uncaught SyntaxError: Unexpected token '<'" in the script tag!
                if (path.endsWith(".js") || path.endsWith(".css") || path.startsWith("assets/")) {
                    android.util.Log.w("VetAxisApp", "Asset not found locally, returning 404: " + path);
                    byte[] notFoundBytes = ("/* Asset not found: " + path + " */").getBytes("UTF-8");
                    ByteArrayInputStream bais = new ByteArrayInputStream(notFoundBytes);
                    Map<String, String> headers = new HashMap<>();
                    headers.put("Access-Control-Allow-Origin", "*");
                    return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", headers, bais);
                }
                return null;
            }

            String mimeType = getMimeType(path);
            boolean isTextOrCode = mimeType.startsWith("text/") || 
                                   mimeType.equals("application/json") || 
                                   mimeType.equals("application/javascript") ||
                                   mimeType.equals("image/svg+xml") ||
                                   mimeType.equals("application/xml");
            String encoding = isTextOrCode ? "UTF-8" : null;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                Map<String, String> headers = new HashMap<>();
                headers.put("Access-Control-Allow-Origin", "*");
                headers.put("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
                headers.put("Access-Control-Allow-Headers", "*");
                headers.put("Cache-Control", "no-cache");
                headers.put("Content-Type", mimeType + (encoding != null ? "; charset=" + encoding : ""));
                return new WebResourceResponse(mimeType, encoding, 200, "OK", headers, is);
            } else {
                return new WebResourceResponse(mimeType, encoding, is);
            }
        } catch (Exception e) {
            android.util.Log.e("VetAxisApp", "Error intercepting asset: " + urlStr, e);
            return null;
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);

        FrameLayout root = new FrameLayout(this);
        root.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        root.setBackgroundColor(Color.parseColor("#fcfbf9"));

        mWebView = new WebView(this);
        mWebView.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        mWebView.setBackgroundColor(Color.parseColor("#fcfbf9"));

        mProgressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        FrameLayout.LayoutParams pbParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 8);
        mProgressBar.setLayoutParams(pbParams);
        mProgressBar.setMax(100);
        mProgressBar.setProgress(0);

        root.addView(mWebView);
        root.addView(mProgressBar);
        setContentView(root);

        WebSettings settings = mWebView.getSettings();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

        // Sanitize User-Agent to prevent Google OAuth from rejecting WebView with "403: disallowed_useragent"
        String defaultUserAgent = settings.getUserAgentString();
        if (defaultUserAgent != null) {
            String sanitizedUA = defaultUserAgent
                    .replace("; wv", "")
                    .replaceAll("Version/[0-9.]+\\s*", "");
            settings.setUserAgentString(sanitizedUA);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(true);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setGeolocationEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Intercept Service Worker fetches (Android 7.0+) to guarantee local APK asset delivery
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            try {
                ServiceWorkerController swController = ServiceWorkerController.getInstance();
                swController.setServiceWorkerClient(new ServiceWorkerClient() {
                    @Override
                    public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                        if (request != null && request.getUrl() != null) {
                            return getAssetResponse(request.getUrl().toString());
                        }
                        return null;
                    }
                });
            } catch (Exception e) {
                android.util.Log.w("VetAxisApp", "ServiceWorkerController init: " + e.getMessage());
            }
        }

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(mWebView, true);
        }

        mWebView.addJavascriptInterface(new AndroidBridge(), "AndroidNative");

        mWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    mProgressBar.setVisibility(View.VISIBLE);
                    mProgressBar.setProgress(newProgress);
                } else {
                    mProgressBar.setVisibility(View.GONE);
                }
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                // Create a full popup window for Google OAuth & external auth providers
                final Dialog popupDialog = new Dialog(MainActivity.this, android.R.style.Theme_DeviceDefault_Light_NoActionBar_Fullscreen);
                WebView popupWebView = new WebView(MainActivity.this);

                WebSettings popupSettings = popupWebView.getSettings();
                popupSettings.setJavaScriptEnabled(true);
                popupSettings.setDomStorageEnabled(true);
                popupSettings.setSupportMultipleWindows(true);
                popupSettings.setJavaScriptCanOpenWindowsAutomatically(true);
                popupSettings.setUserAgentString(mWebView.getSettings().getUserAgentString());

                CookieManager cm = CookieManager.getInstance();
                cm.setAcceptCookie(true);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    cm.setAcceptThirdPartyCookies(popupWebView, true);
                }

                popupDialog.setContentView(popupWebView);
                popupDialog.show();

                popupWebView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onCloseWindow(WebView window) {
                        try {
                            popupDialog.dismiss();
                        } catch (Exception ignored) {}
                    }
                });

                popupWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v, String url) {
                        return false;
                    }

                    @Override
                    public void onReceivedSslError(WebView v, SslErrorHandler handler, SslError error) {
                        handler.proceed();
                    }
                });

                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(popupWebView);
                resultMsg.sendToTarget();
                return true;
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                            WebChromeClient.FileChooserParams fileChooserParams) {
                if (mFilePathCallback != null) {
                    mFilePathCallback.onReceiveValue(null);
                }
                mFilePathCallback = filePathCallback;

                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(intent, "Select File"), FILE_CHOOSER_REQUEST);
                } catch (Exception e) {
                    mFilePathCallback = null;
                    return false;
                }
                return true;
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                if (consoleMessage != null) {
                    android.util.Log.d("VetAxisJS", "[" + consoleMessage.messageLevel() + "] " +
                            consoleMessage.message() + " -- From line " +
                            consoleMessage.lineNumber() + " of " +
                            consoleMessage.sourceId());
                }
                return true;
            }
        });

        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url == null) return false;
                if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("sms:") || url.startsWith("geo:")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                        return true;
                    } catch (Exception ignored) {}
                }

                Uri parsed = Uri.parse(url);
                if (parsed != null && parsed.getHost() != null) {
                    String host = parsed.getHost().toLowerCase();
                    // Keep Google OAuth, Firebase, and app hosts inside the WebView so the authentication session succeeds
                    if (host.contains("firebaseapp.com") || host.contains("web.app") || host.contains("google")
                            || host.contains("accounts.google") || host.contains("googleapis.com")
                            || host.contains("gstatic.com") || host.contains("localhost")
                            || host.contains("vetaxis360") || host.contains("run.app")) {
                        return false;
                    }

                    // For external general web links, open standard browser
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, parsed);
                        startActivity(intent);
                        return true;
                    } catch (Exception ignored) {}
                }
                return false;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && request != null && request.getUrl() != null) {
                    WebResourceResponse resp = getAssetResponse(request.getUrl().toString());
                    if (resp != null) return resp;
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                WebResourceResponse resp = getAssetResponse(url);
                if (resp != null) return resp;
                return super.shouldInterceptRequest(view, url);
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.proceed();
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                android.util.Log.w("VetAxisWebView", "Subresource notice: " + failingUrl + " [" + errorCode + ": " + description + "]");
            }

            @TargetApi(Build.VERSION_CODES.M)
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request != null && request.isForMainFrame()) {
                    android.util.Log.e("VetAxisWebView", "Main frame navigation failed on: " + request.getUrl());
                }
            }
        });

        // Load self-contained local web assets with instantaneous startup under authorized Firebase domain
        String targetUrl = LOCAL_BASE_URL;
        Intent intent = getIntent();
        if (intent != null && intent.getData() != null) {
            String intentScheme = intent.getData().getScheme();
            if ("https".equalsIgnoreCase(intentScheme) || "http".equalsIgnoreCase(intentScheme)) {
                targetUrl = intent.getData().toString();
            }
        }

        mWebView.loadUrl(targetUrl);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (mFilePathCallback == null) return;
            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && data != null) {
                Uri dataUri = data.getData();
                if (dataUri != null) {
                    results = new Uri[]{dataUri};
                }
            }
            mFilePathCallback.onReceiveValue(results);
            mFilePathCallback = null;
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && mWebView != null && mWebView.canGoBack()) {
            mWebView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}

