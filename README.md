# IA Prompt Image Generator

## Descripción
Esta aplicación permite generar imágenes utilizando IA a través de ComfyUI. Funciona como un middleware entre una interfaz web, ComfyUI y opcionalmente TouchDesigner. Las imágenes generadas se guardan localmente y también se suben automáticamente a un servidor web.

## Características
- Interfaz web simple para ingresar prompts y generar imágenes
- Conexión con ComfyUI para la generación de imágenes
- Carga automática de imágenes a un servidor web remoto
- Visualización de códigos QR para acceder a las imágenes desde dispositivos móviles
- Galería web para visualizar todas las imágenes generadas

## Requisitos Previos
- Node.js (v14 o superior)
- ComfyUI ejecutándose localmente (por defecto en 192.168.0.13:8188)
- Opcionalmente: TouchDesigner (si se desea integrar con esta herramienta)
- Acceso a un servidor web con PHP para la carga de imágenes

## Instalación
1. Clona el repositorio:
   ```
   git clone https://github.com/jpupper/iapromptimg.git
   ```
2. Navega al directorio del proyecto:
   ```
   cd iapromptimg
   ```
3. Instala las dependencias:
   ```
   npm install
   ```

## Configuración
1. Ajusta la IP de ComfyUI en `server.js` si es necesario
2. Configura la conexión a TouchDesigner en `public/js/script.js` si lo utilizas
3. Sube el archivo `upload.php` a tu servidor web en la ruta deseada
4. Sube la carpeta `galeriaweb` a tu servidor web para habilitar la galería

## Uso
1. Inicia el servidor:
   ```
   node server.js
   ```
2. Abre un navegador y accede a `http://localhost:3000`
3. Ingresa un prompt y haz clic en "Generar Imagen"
4. La imagen generada se mostrará en la interfaz, junto con un enlace a la versión web
5. Para ver la galería de imágenes, accede a la URL donde hayas subido la carpeta `galeriaweb`

## Estructura del Proyecto
- `server.js`: Servidor principal, maneja la comunicación con ComfyUI y la carga de imágenes
- `public/`: Archivos estáticos para la interfaz web
  - `js/script.js`: Lógica de la interfaz web
  - `css/style.css`: Estilos de la interfaz
- `galeriaweb/`: Aplicación web para visualizar todas las imágenes generadas
- `upload.php`: Script PHP para manejar la carga de imágenes al servidor web
- `workflow_api.json`: Configuración del flujo de trabajo para ComfyUI

## Licencia
Este proyecto se distribuye bajo la licencia MIT.

## Contacto
Para preguntas o sugerencias, contacta a [jpupper](https://github.com/jpupper).
