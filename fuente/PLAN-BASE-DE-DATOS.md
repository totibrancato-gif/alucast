# Alucast: agregar base de datos (Supabase) con inicio de sesión

Hablame siempre en español rioplatense y en palabras simples (no soy programador).

## Qué es Alucast
Es mi app para hacer presupuestos de aberturas de aluminio y llevar el control de gastos (caja chica, banco, deudores por ventas). Está hecha en HTML + CSS + JavaScript puro, sin npm y sin paso de compilación. Tiene estas versiones:
- **Windows y Mac**, con Neutralino.js 6.1.0.
- **Android**, un APK con WebView para una tablet Samsung Galaxy Tab S10.
- **Web**: https://totibrancato-gif.github.io/alucast/, publicada con GitHub Pages desde la rama `main`.

La hice a medida para un cliente, un taller de aberturas.

## Dónde está el código
- Repo `totibrancato-gif/alucast`, rama **`claude/new-session-2j36qk`**, carpeta **`fuente/`**:
  - `fuente/codigo-fuente/`: la app (`resources/`), `neutralino.config.json` y los scripts PowerShell que arman cada versión.
  - `fuente/otras-versiones/`: Windows, Mac y Android (`MainActivity.java`, `armar-apk.ps1`).
- **Leé primero `fuente/codigo-fuente/MAPA-DEL-CODIGO.md`.** Explica cada archivo, dónde se guardan los datos y cómo se arma cada versión.
- La raíz del repo en `main` es la página web, pero es una **versión vieja**: todavía no tiene el control de gastos ni el PDF con jsPDF. La versión buena es la de `fuente/`.

## Qué quiero
1. **Base de datos en Supabase**, para que lo que hago en la Mac se vea en la tablet, en la PC y en la web.
2. **Inicio de sesión** con correo y contraseña para usar el programa.
3. **No perder nada** de lo que ya tengo: hay que migrar mis datos desde la copia de seguridad `.json`.
4. Que la **página web quede actualizada** con la versión nueva (de `fuente/`) y con la base de datos, y publicada en `main`.

## Lo que te voy a pasar
- **Project URL** y **anon public key** de Supabase.
- La **copia de seguridad `.json`**, exportada desde Alucast en la PC. Tiene datos de clientes: no la subas a GitHub.

## Ideas para hacerlo (revisalas y decidí)
- Hoy todo pasa por `load()` / `save()` en `utilidades.js`, sobre `localStorage`. Las claves están en `CLAVES` (`datos.js`). Es el lugar natural para enganchar la sincronización.
- Mantener `localStorage` como **copia local**, para que funcione sin internet, y sincronizar con Supabase cuando haya conexión.
- Cuidar los conflictos entre equipos:
  - El **historial** (por `num`) y los **gastos** (por `id`) son listas. No conviene pisar la lista entera con la del último que guardó; mejor combinar registro por registro.
  - El borrador puede quedar solo local.
- **Seguridad**:
  - Row Level Security activado, para que cada empresa vea solo lo suyo.
  - Varios usuarios de la misma empresa comparten los mismos datos.
  - Registro público desactivado: los usuarios los creo yo desde Supabase.
- Ampliar la **CSP** (`connect-src`) de `index.html` para `https://<proyecto>.supabase.co`.
- La librería de Supabase:
  - **Escritorio y APK**: incluida en el código, para no depender de un CDN.
  - **Web**: desde cdnjs o jsDelivr, con versión fija.
- Cada cambio en la web necesita una versión nueva del service worker (`sw.js`), si no, queda la vieja en caché.
- Los scripts de armado son PowerShell y corren en mi PC. Si estás en la nube, armá la carpeta web a mano siguiendo lo que hace `armar-web.ps1`, y dejame anotado qué script correr en la PC para rearmar Windows, Mac y APK.
- Revisar el `neutralino.config.json` por si hace falta algún permiso nuevo.

## Lo que tengo que hacer yo (guiame)
1. Crear la cuenta en **supabase.com** con **Sign up** con correo (mi correo, no el de la empresa):
   - **New project**, con nombre `alucast` y región **São Paulo**.
   - Anotar la contraseña de la base de datos y **no pasarla**.
2. Pasar la **Project URL** y la **anon public key**, que están en *Project Settings → API*.
3. Crear los usuarios que me indiques: el mío y los de la empresa.
4. Correr en Supabase el SQL que me des, para crear las tablas.

## Otras cosas pendientes
- **Mac**: probar que el PDF se guarde en Descargas. Todavía no se probó en una Mac real.
- **Tablet**: probar la instalación del APK, pasándolo por Drive, WhatsApp o cable.
- Guardar la carpeta `Android\firma\` de la PC en un lugar seguro.
- Más adelante: pasar el código a un repo **privado**, si lo voy a vender.
