package uy.alucast.presupuestos;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Alucast para Android: muestra la app (los mismos archivos que la versión de
 * escritorio, guardados adentro del .apk) y le da un puente "AndroidApp" para
 * guardar el PDF y la copia de seguridad en Descargas.
 */
public class MainActivity extends Activity {

    private static final int ELEGIR_ARCHIVO = 1;
    private WebView web;
    private ValueCallback<Uri[]> archivoElegido;

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#eef1f4"));

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);      // presupuestos, precios y gastos se guardan acá (localStorage)
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);        // la app está guardada como archivos dentro del .apk
        s.setTextZoom(100);                // el tamaño de letra lo maneja la app

        web.addJavascriptInterface(new Puente(), "AndroidApp");

        // Los links a otras páginas se abren en el navegador, no adentro de la app
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest pedido) {
                Uri uri = pedido.getUrl();
                if ("file".equals(uri.getScheme())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (ActivityNotFoundException e) { /* nada */ }
                return true;
            }
        });

        // "Importar copia": abre el selector de archivos de la tablet
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (archivoElegido != null) archivoElegido.onReceiveValue(null);
                archivoElegido = callback;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(i, "Elegí la copia de Alucast"), ELEGIR_ARCHIVO);
                } catch (ActivityNotFoundException e) {
                    archivoElegido = null;
                    return false;
                }
                return true;
            }
        });

        if (estado != null) web.restoreState(estado);
        else web.loadUrl("file:///android_asset/www/index.html");
        setContentView(web);
    }

    @Override
    protected void onActivityResult(int pedido, int resultado, Intent datos) {
        if (pedido == ELEGIR_ARCHIVO && archivoElegido != null) {
            Uri uri = (resultado == RESULT_OK && datos != null) ? datos.getData() : null;
            archivoElegido.onReceiveValue(uri != null ? new Uri[]{uri} : null);
            archivoElegido = null;
            return;
        }
        super.onActivityResult(pedido, resultado, datos);
    }

    @Override
    protected void onSaveInstanceState(Bundle estado) {
        super.onSaveInstanceState(estado);
        web.saveState(estado);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    /** Lo que la página puede pedirle a Android. */
    private class Puente {
        /** Guarda el PDF (en base64) en Descargas y lo abre. Devuelve "Descargas/nombre" o "ERROR:...". */
        @JavascriptInterface
        public String guardarPdf(String nombre, String base64) {
            try {
                byte[] datos = Base64.decode(base64, Base64.DEFAULT);
                Uri uri = guardarEnDescargas(nombre, "application/pdf", datos);
                abrir(uri, "application/pdf");
                return "Descargas/" + nombre;
            } catch (Exception e) {
                return "ERROR:" + e.getMessage();
            }
        }

        /** Guarda un texto (la copia de seguridad) en Descargas. */
        @JavascriptInterface
        public String guardarTexto(String nombre, String texto) {
            try {
                guardarEnDescargas(nombre, "application/json", texto.getBytes(StandardCharsets.UTF_8));
                return "Descargas/" + nombre;
            } catch (Exception e) {
                return "ERROR:" + e.getMessage();
            }
        }
    }

    /** Escribe el archivo en la carpeta Descargas (si ya hay uno con ese nombre, Android le agrega un número). */
    private Uri guardarEnDescargas(String nombre, String tipo, byte[] datos) throws Exception {
        ContentResolver cr = getContentResolver();
        ContentValues v = new ContentValues();
        v.put(MediaStore.MediaColumns.DISPLAY_NAME, nombre);
        v.put(MediaStore.MediaColumns.MIME_TYPE, tipo);
        v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
        Uri uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
        if (uri == null) throw new Exception("no se pudo crear el archivo en Descargas");
        try (OutputStream out = cr.openOutputStream(uri)) {
            if (out == null) throw new Exception("no se pudo escribir el archivo");
            out.write(datos);
        }
        return uri;
    }

    /** Abre el archivo con la app que corresponda (por ejemplo, el visor de PDF). */
    private void abrir(final Uri uri, final String tipo) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Intent i = new Intent(Intent.ACTION_VIEW);
                i.setDataAndType(uri, tipo);
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                try { startActivity(i); } catch (ActivityNotFoundException e) { /* quedó guardado igual */ }
            }
        });
    }
}
