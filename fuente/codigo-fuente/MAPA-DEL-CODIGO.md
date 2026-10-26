# Alucast: mapa del código

Alucast es una app para hacer presupuestos de aberturas de aluminio y llevar el control de gastos (caja chica, banco y deudores por ventas). Es HTML + CSS + JavaScript puro, **sin frameworks, sin npm y sin paso de compilación**. La misma carpeta `resources/` se usa para todas las versiones:

| Versión | Motor | Cómo se arma |
|---|---|---|
| Windows | Neutralino.js 6.1.0 (WebView2) | `codigo-fuente/empaquetar.ps1` |
| Mac | Neutralino.js 6.1.0 (WKWebView) | `Mac/armar-mac.ps1` |
| Android (tablet) | WebView nativo + puente Java | `Android/armar-apk.ps1` |
| Web (GitHub Pages) | navegador común | `codigo-fuente/armar-web.ps1` + `armar-instrucciones-github.ps1` |
| Link de prueba (Artifact de Claude) | navegador, un solo archivo HTML | `codigo-fuente/armar-prueba.ps1` |

Todos los scripts son PowerShell 5.1 (Windows) y están guardados en **UTF-8 con BOM**. Si se guardan sin BOM, los acentos se rompen.

---

## 1. Estructura del zip

```
codigo-fuente/
  neutralino.config.json      configuración del programa de escritorio (ver sección 5)
  empaquetar.ps1              arma resources.neu (Windows/Mac)
  armar-web.ps1               arma la carpeta Web/ (GitHub Pages)
  armar-instrucciones-github.ps1  genera PARA-CLAUDE-GITHUB.md a partir de Web/
  armar-prueba.ps1            genera Prueba/alucast-prueba.html (link de prueba)
  MAPA-DEL-CODIGO.md          este archivo
  resources/
    index.html                toda la interfaz, la política de seguridad (CSP) y el orden de los scripts
    icon-512.png              ícono
    css/estilos.css           todos los estilos
    fonts/*.woff2             tipografías Archivo y Barlow (incluidas para funcionar sin internet)
    js/                       la lógica (ver sección 2)
otras-versiones/              (fuera de codigo-fuente en la PC; se suman al zip para tener todo)
  Windows/Instalar Alucast.cmd, LEEME.txt   instalador para otra PC con Windows
  Mac/armar-mac.ps1, LEEME-MAC.txt
  Android/armar-apk.ps1, proyecto/AndroidManifest.xml, proyecto/src/.../MainActivity.java
```

En la PC, la carpeta completa es `Descargas\Alucast\` y contiene:
- `codigo-fuente\`.
- `Windows\`, `Mac\`, `Android\`, `Web\` y `Prueba\`.
- `resources.neu`, que se genera con `empaquetar.ps1`.
- `Alucast.exe`, el motor de Neutralino para Windows.
- `respaldo-original\`, con las versiones viejas y copias de datos.

## 2. Archivos JavaScript

Son **scripts clásicos (no módulos)** que comparten el ámbito global y se cargan en este orden fijo, definido en `index.html`. **No se puede cambiar el orden.**

| # | Archivo | Para qué sirve |
|---|---|---|
| 1 | `neutralino.js` | Cliente oficial de Neutralino (solo escritorio; las otras versiones lo sacan) |
| 2 | `plataforma.js` | Puente con el sistema: crea `window.alucast` con `guardarPDF`, `guardarArchivo`, `abrirArchivo`. Tiene una rama para Android (`window.AndroidApp`) y otra para Neutralino. En la web `window.alucast` no existe y se usan alternativas del navegador |
| 3 | `utilidades.js` | `$()`, `esc()` (anti-XSS), `num()`, `dinero(n, moneda)`, `numPesos()`, `load()/save()` sobre `localStorage`, `toast()`, coma→punto en los campos numéricos |
| 4 | `lista-fabrica.js` | `LISTA_FABRICA`: lista de precios de fábrica (barra, acabados, líneas con perfiles/kg por metro/accesorios, vidrios) |
| 5 | `datos.js` | `CLAVES` de `localStorage`, valores por defecto, estado global (`P` precios, `EMP` empresa, `items`, `extras`, `especs`, `monedaPres`, `numero`, `F` ventana en edición, `editIdx`), **migraciones** de una sola vez, normalizadores, `historial()`, `siguienteNumero()` |
| 6 | `calculo.js` | Cálculo de precios: aluminio por kg cobrando barras enteras, accesorios, vidrio por m² o por unidad, mano de obra **por ventana × cantidad**, extras, `totals()`, `preciosCliente()` (reparte y redondea; convierte a U$S si el presupuesto es en dólares) |
| 7 | `ventana.js` | Formulario de una ventana (tipo, acabado, medidas, cantidad, aluminio, accesorios, vidrio con descuentos automáticos/manuales, mano de obra y extras) |
| 8 | `presupuesto.js` | Panel del presupuesto: lista de ventanas, extras generales, especificaciones, moneda (pesos/dólares), totales con ".- IVA Inc", texto para WhatsApp, guardar en el historial, borrador |
| 9 | `trabajos.js` | Pestañas "Guardados" (historial) y "Por entregar"; resumen del mes en pesos y en dólares |
| 10 | `precios.js` | Pestaña "Lista de precios": editar precios, líneas, vidrios ("se cobra por" m² o unidad), duplicar tipo, número de presupuesto |
| 11 | `dolar.js` | Dólar fijo (41 por defecto) con flechas ±0,50 |
| 12 | `copia.js` | "Ajustes y copia": datos de la empresa, **exportar/importar copia** (`.json`) y limpieza/validación de lo importado |
| 13 | `jspdf.umd.min.js` | jsPDF 2.5.1, incluido (en la web se carga de cdnjs con SRI) |
| 14 | `pdf.js` | Arma el PDF del presupuesto con jsPDF: encabezado, cliente, tabla (con P. unitario si hay cantidad > 1), total, especificaciones, validez, mensaje de cierre y contacto |
| 15 | `gastos.js` | Control de gastos: cuentas fijas (caja chica, banco), deudores (una cuenta cada uno), movimientos desde/hacia con moneda, saldos en dos columnas |
| 16 | `menu.js` | Menú lateral (arriba a la izquierda): tipos de presupuesto y cuentas de gastos |
| 17 | `nube.js` | **Nube (Supabase)**: pantalla de inicio de sesión, sesión guardada, y sincronización registro por registro con la tabla `registros` (ver sección 8). `save()` le avisa con `nubeCambio()` |
| 18 | `app.js` | Arranque: pestañas, carga del borrador o del ejemplo, `iniciar()` |

## 3. Dónde se guardan los datos

**Todo está en `localStorage` del WebView/navegador, y se sincroniza con Supabase** (ver sección 8) cuando hay sesión iniciada y conexión. No se usan archivos de Neutralino para los datos. *Exportar/Importar copia* sigue funcionando como respaldo.

| Clave (`CLAVES.*`) | Valor en localStorage | Qué guarda |
|---|---|---|
| `lista` | `alucast-lista-v5` | Precios: barra, acabados, líneas (perfiles, accesorios, descuentos de vidrio, vidrio por defecto), vidrios, dólar, días de validez, cobrar barra entera |
| `historial` | `alucast-hist-v4` | Presupuestos guardados (array). Cada uno: `num`, cliente, tel, fecha, items, extras, especs, `moneda` (UYU/USD), `dolar`, `total` en pesos, estado de entrega |
| `numero` | `alucast-num` | Último número de presupuesto (empieza en 2345) |
| `borrador` | `alucast-borrador-v5` | Lo que se está cargando ahora (items, extras, especs, monedaPres, F, editIdx, numero, cliente) |
| `empresa` | `alucast-empresa` | Datos de la empresa para el PDF (tel. 098975733, dirección Bolivia 915, etc.) |
| `gastos` | `alucast-gastos-v1` | Movimientos: `{id, fecha, desde, hacia, monto, moneda, desc}`. Cuentas: `caja`, `banco` o el id de un deudor |
| `deudores` | `alucast-deudores-v1` | Deudores: `{id, nombre}`. El id `calle` es el viejo "En la calle" |

Además hay **marcas de migración** (booleanos que evitan repetir cambios hechos una sola vez): `alucast-precios-2026-10-12`, `alucast-num-2345`, `alucast-num-2345-v2`, `alucast-dolar-fijo`, `alucast-empresa-contacto`, `alucast-probba2`, `alucast-acrilico`, `alucast-precios-2026-10-24` (`VERSION_LISTA`) y `alucast-acrilico-v2`. Están en `datos.js` (función `migrar()`) y la copia de seguridad las incluye (`CLAVES_COPIA` en `copia.js`).

**Ubicación física por versión:**
- **Windows.** WebView2 guarda en `%APPDATA%\Alucast.exe\EBWebView`, con el origen `http://127.0.0.1:47615`. **El puerto 47615 no se puede cambiar**: si cambia el origen, la app "pierde" los datos (quedan guardados en otro origen).
- **Mac.** Está en el almacenamiento del WKWebView del programa, con el mismo puerto.
- **Android.** Está en el `localStorage` del WebView de la app `uy.alucast.presupuestos`.
- **Web.** Está en el `localStorage` del navegador, en `totibrancato-gif.github.io`.

**Copia de seguridad** (`copia.js`): exporta un JSON `{app:"alucast", version:2, exportado:"<fecha ISO>", datos:{clave: valor}}`, con el nombre `alucast-copia-AAAA-MM-DD.json`, con todas las claves de `CLAVES_COPIA`. Al importar se valida y limpia cada clave (normalizadores) antes de escribirla. Para pasar a Supabase, este formato sirve de punto de partida para migrar los datos existentes.

## 4. Cómo se arma cada versión

Todos se corren desde PowerShell en la PC, por ejemplo `powershell -ExecutionPolicy Bypass -File .\codigo-fuente\empaquetar.ps1`.

- **Windows: `empaquetar.ps1`**
  1. Arma `..\resources.neu`, un archivo ASAR que contiene `neutralino.config.json` y `resources/`.
  2. Guarda el anterior como `resources.neu.anterior`.
  3. Si la app está instalada en `%LOCALAPPDATA%\Programs\Alucast`, la actualiza.

  El programa para Windows es `Alucast.exe` (Neutralino 6.1.0) junto con `resources.neu`. El zip para otra PC (`Windows\Alucast-Windows.zip`) tiene `Alucast.exe`, `resources.neu`, `Instalar Alucast.cmd` y `LEEME.txt`. El instalador copia todo a `%LOCALAPPDATA%\Programs\Alucast` y crea los accesos directos.
- **Mac: `Mac/armar-mac.ps1`**
  1. Abre el `Alucast-Mac.zip` anterior y reemplaza `resources.neu` adentro del `.app`.
  2. Vuelve a comprimir con `tar` y un mtree, para que el binario quede con permiso de ejecución (0755).

  **No descarga nada: necesita el zip anterior** porque de ahí saca el motor de Mac. La app no está firmada por Apple, así que la primera vez hay que abrirla con clic derecho → Abrir.
- **Android: `Android/armar-apk.ps1`**. No usa Gradle ni Android Studio:
  1. Copia `resources/` sin `neutralino.js` y saca la CSP de `index.html`.
  2. Después corre `aapt2` compile/link → `javac -source 8` → `d8` → `jar cfM0` → `zipalign` → `apksigner`.

  Usa `Android/herramientas/`: el JDK y el Android SDK con build-tools 34.0.0 y platform android-34. El paquete es `uy.alucast.presupuestos`, con minSdk 29 y target 34. `MainActivity.java` muestra la app en un WebView con un puente JS `AndroidApp` (`guardarPdf`, `guardarTexto`) que escribe en Descargas con MediaStore. "Importar copia" usa el selector de archivos del sistema.
- **Web: `armar-web.ps1`**. Arma `..\Web\` con todos los archivos en una sola carpeta (sin subcarpetas). Cambia lo siguiente respecto de la versión de escritorio:
  - Saca `neutralino.js`.
  - Las tipografías se cargan de Google Fonts y jsPDF de cdnjs, con SRI.
  - Ajusta la CSP.
  - Genera `sw.js`, un service worker para que funcione sin internet, con una versión nueva en cada armado.
  - No toca lo que ya está en el repo (manifest e íconos).
- **Link de prueba: `armar-prueba.ps1`**. Junta todo en `..\Prueba\alucast-prueba.html`, un solo archivo sin CSP ni jsPDF. Ahí el PDF y "Exportar copia" muestran un aviso.

## 5. `neutralino.config.json` y guardar el PDF en la Mac

- `applicationId` es `uy.alucast.presupuestos`, `port` es **47615** (fijo, ver sección 3), `documentRoot` es `/resources/` y `tokenSecurity` es `one-time`.
- `nativeAllowList`, la lista de lo único que la página puede pedirle al sistema:
  - `app.exit`
  - `os.open` (abrir el PDF o un link)
  - `os.getPath` (encontrar Descargas)
  - `os.showSaveDialog` y `os.showOpenDialog`
  - `filesystem.writeFile` (la copia `.json`) y `filesystem.writeBinaryFile` (el PDF)
  - `filesystem.readFile` (importar la copia)

  **Si se agrega una función nativa nueva hay que sumarla acá**, o Neutralino la bloquea.
- **PDF** (`pdf.js` + `plataforma.js`). `pdf.js` genera el PDF con jsPDF y llama a `window.alucast.guardarPDF(nombre, bytes)`:
  - **Mac** (`window.NL_OS === "Darwin"`):
    1. No abre la ventana "Guardar como…", porque en WKWebView se colgaba.
    2. Busca Descargas con `os.getPath("downloads")`.
    3. Escribe el PDF con `writeBinaryFile`.
    4. Lo abre con `os.open("file://…")`.

    Cada paso tiene un tiempo máximo (`conTiempo`) para avisar en vez de quedarse trabado, y al final la app muestra un mensaje con la ruta. **Todavía no se probó en una Mac real.**
  - **Windows**: abre la ventana "Guardar como…" en Descargas, escribe el archivo y lo abre.
  - **Android**: guarda en Descargas mediante el puente `AndroidApp`.
  - **Web**: usa `doc.save()` del navegador.
- La copia de seguridad (`guardarArchivo`) hace lo mismo: en Mac va directo a Descargas y en Windows pregunta dónde guardar.

## 6. `PARA-CLAUDE-GITHUB.md`

Es un documento con instrucciones y el **contenido completo de cada archivo de `Web/`**, con su tamaño y el inicio de su SHA-256. Sirve para pasárselo a un chat de Claude con acceso a GitHub, que lo sube al repo `totibrancato-gif/alucast` en la rama `main`, en la raíz, sin tocar los íconos, el manifest, `dolar.json`, `README.md`, `.nojekyll`, `scripts/` ni `.github/`. Para generarlo hay que correr **primero `armar-web.ps1` y después `armar-instrucciones-github.ps1`**.

## 7. Qué quedó afuera del zip y cómo recuperarlo

| Afuera | Por qué | Cómo recuperarlo |
|---|---|---|
| `Alucast.exe` (motor de Windows) | Binario, se puede volver a bajar | Neutralino **v6.1.0**: https://github.com/neutralinojs/neutralinojs/releases/tag/v6.1.0 → `neutralinojs-v6.1.0.zip`, usar `neutralino-win_x64.exe` renombrado a `Alucast.exe` |
| Motor de Mac (`Alucast-Mac.zip`) | Binario | Mismo release: `neutralino-mac_universal` (o `mac_arm64`/`mac_x64`) dentro de un `.app` (`Alucast.app/Contents/MacOS/Alucast` + `Info.plist`). También está en la PC, en `Descargas\Alucast\Mac\Alucast-Mac.zip` |
| `Alucast.apk`, `Alucast-Windows.zip`, `resources.neu`, carpetas `Web/` y `Prueba/` | Se rearman con los scripts | Correr el script correspondiente (sección 4) |
| `Android/herramientas/` (680 MB) | Muy pesado, se puede volver a bajar | JDK 17 (por ejemplo, Eclipse Temurin) y Android command-line tools; con `sdkmanager` instalar `build-tools;34.0.0` y `platforms;android-34` en `Android/herramientas/jdk` y `Android/herramientas/sdk` |
| `Android/firma/` (`alucast.keystore` + `clave.txt`) | **Es la firma de la app**: es privada y no se comparte | Queda en la PC. **Hay que guardarla en un lugar seguro.** Sin esa firma, una versión nueva del APK **no se puede instalar encima** de la que está en la tablet (habría que desinstalar, y se borran los datos de la tablet) |
| `respaldo-original/` y copias `.json` | Tienen datos de clientes | No se suben |

No hay `node_modules`, `dist` ni carpeta `bin`: el proyecto no usa npm.

## 8. Nube (Supabase)

- **Proyecto**: `https://joedpfvixhxbegdtgpky.supabase.co`, región Américas. La URL y la clave pública (`sb_publishable_…`) están en `NUBE`, arriba de `js/nube.js`. La clave pública puede ir en el código: lo que protege los datos son las reglas (RLS) de la base. **Nunca** poner la clave secreta ni la contraseña de la base en la app.
- **Tablas** (`fuente/supabase/1-tablas.sql`, ya corrido): `empresas`, `miembros` (usuario → empresa) y `registros` (`empresa_id`, `tipo`, `id`, `datos` jsonb, `borrado`, `actualizado`). Cada usuario solo ve y cambia los registros de su empresa. La fecha `actualizado` la pone el servidor.
- **Usuarios**: el registro público está apagado. Se crean en *Authentication → Users → Add user* y se suman a la empresa con `fuente/supabase/2-empresa-y-usuarios.sql` (parte 2).
- **Qué se sincroniza**: cada presupuesto (`tipo` presupuesto, id = número), cada movimiento y cada deudor (por su id), y como `ajuste` la lista de precios, los datos de la empresa y el último número (que nunca baja). El borrador y las marcas de migración quedan solo en cada equipo. Lo borrado queda con `borrado = true`.
- **Cómo**: `localStorage` sigue siendo la copia de trabajo (la app anda sin internet). `nube.js` guarda en `alucast-nube` una huella de cada registro tal como está en la nube; al sincronizar baja lo cambiado en la nube desde la última vez, después sube lo que cambió acá. Si el mismo registro cambió en los dos lados, gana el de la nube. Sincroniza 1,5 s después de guardar, cada 30 s, al volver a la app y al volver internet.
- **Primera vez en un equipo**: guarda una copia de lo que había en `alucast-copia-antes-de-nube` (por si un presupuesto local tenía el mismo número que uno de la nube) — se puede ver y recuperar desde "Ajustes y copia" y después junta lo de la nube con lo local.
- **El primer equipo en entrar tiene que ser el que tiene los datos buenos** (la PC), o hay que importar ahí la copia `.json` apenas se entra: si entra primero un equipo con la lista de precios de fábrica, esa lista queda en la nube y les gana a las de los equipos que entran después (queda en su copia de antes de la nube).
- **Migrar los datos viejos**: entrar con la cuenta en la PC y usar *Importar copia* con el `.json`: lo importado se sube solo.
- **CSP**: `connect-src` de `index.html` incluye la URL del proyecto (la web la hereda de ahí). Android necesita el permiso `INTERNET` (ya está en `AndroidManifest.xml`). Neutralino no necesita permisos nuevos: los pedidos son `fetch` comunes.
- No usar `NL_OS` para nada que deba funcionar en la web o en Android, y mantener la rama `window.AndroidApp` de `plataforma.js`.
