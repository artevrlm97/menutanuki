PROYECTO: MENÚ DIGITAL — TANUKI BAR / TERRAZA PASCANA
VERSIÓN: 6

NOVEDADES V6
- Base de datos actualizada desde el archivo cocktails (1).xlsm.
- Se incorporó Soda Italiana de Piña como tercera opción del grupo Soda Italiana.
- Se completaron sus campos técnicos: color, orden, activo y estado.
- Se normalizó su identificador a soda-italiana-pina para evitar caracteres especiales en URLs.
- Se conservaron todas las rutas de fotografías registradas en el Excel.
- El cargador de imágenes ahora acepta rutas locales, URLs directas, enlaces compartidos de Google Drive y Dropbox.
- Se agregó ?v=6 a CSS y JavaScript para evitar que el navegador muestre una versión antigua en caché.
- Se mantiene la cuadrícula compacta V5: 2 tarjetas en teléfono, 3 en tablet y hasta 4 en escritorio.

ARCHIVOS PRINCIPALES
- cocktails.xlsx: archivo editable corregido.
- cocktails.csv: base de datos que leen las páginas HTML.
- index.html: menú, búsqueda y filtros.
- cocktail.html: detalle, precio, sabores, ingredientes y variantes.
- config.js: dirección del CSV.
- REPORTE_IMAGENES.txt: indica qué fotografías están incluidas y cuáles son rutas pendientes.

CÓMO EDITAR LOS DATOS
1. Edita cocktails.xlsx.
2. Exporta la hoja “Menu” como CSV UTF-8 y reemplaza cocktails.csv.
3. Usa | para separar sabores e ingredientes.
4. Usa el mismo grupo_id para las variantes de una bebida.
5. precio debe contener solo el número; la web agrega “Bs”.
6. imagen acepta:
   - una ruta local: assets/images/archivo.png
   - una URL directa https://...
   - un enlace compartido de Google Drive o Dropbox.
7. activo debe ser TRUE para mostrar la bebida.

IMPORTANTE SOBRE LAS FOTOGRAFÍAS
Las rutas del Excel se integraron exactamente. El ZIP solo puede incluir los archivos de imagen que estaban disponibles en el proyecto previo. Consulta REPORTE_IMAGENES.txt. Para las rutas pendientes, copia cada fotografía en assets/images con el nombre indicado o cambia la celda imagen por una URL pública directa.

CÓMO PROBAR LOCALMENTE
Desde la carpeta del proyecto ejecuta:

python3 -m http.server 8000

Luego abre:
http://localhost:8000

GOOGLE SHEETS
Publica la hoja como CSV y pega la URL pública en config.js:
window.MENU_DATA_URL = 'URL_PUBLICA_CSV';

V7: integración visual de fotografías, tarjetas sin marco doble y transición suave en la vista de detalle.
