<?php
// Configuración
$uploadDir = 'img/'; // Directorio donde se guardarán las imágenes
$allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
$maxFileSize = 10 * 1024 * 1024; // 10MB

// Función para crear directorios recursivamente si no existen
function createDirectoryIfNotExists($dir) {
    if (!file_exists($dir)) {
        mkdir($dir, 0755, true);
    }
}

// Verificar si es un archivo de prompt o una imagen
if (isset($_POST['is_prompt_file']) && $_POST['is_prompt_file'] === 'true' && isset($_FILES['prompt_file'])) {
    // Procesar archivo de texto con el prompt
    $promptFile = $_FILES['prompt_file'];
    
    // Verificar errores
    if ($promptFile['error'] !== UPLOAD_ERR_OK) {
        echo json_encode([
            'success' => false,
            'message' => 'Error al subir el archivo de prompt: ' . $promptFile['error']
        ]);
        exit;
    }
    
    // Verificar tamaño
    if ($promptFile['size'] > $maxFileSize) {
        echo json_encode([
            'success' => false,
            'message' => 'El archivo de prompt excede el tamaño máximo permitido'
        ]);
        exit;
    }
    
    // Determinar la carpeta de destino
    $targetDir = $uploadDir;
    if (isset($_POST['equipo']) && !empty($_POST['equipo'])) {
        $targetDir .= 'equipo' . $_POST['equipo'] . '/';
    }
    
    // Crear el directorio si no existe
    createDirectoryIfNotExists($targetDir);
    
    // Guardar el archivo
    $targetFile = $targetDir . basename($promptFile['name']);
    if (move_uploaded_file($promptFile['tmp_name'], $targetFile)) {
        echo json_encode([
            'success' => true,
            'url' => 'https://jeyder.com.ar/iaprompt/' . $targetFile,
            'message' => 'Archivo de prompt subido correctamente'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Error al guardar el archivo de prompt'
        ]);
    }
} else if (isset($_FILES['image'])) {
    // Procesar imagen
    $image = $_FILES['image'];
    
    // Verificar errores
    if ($image['error'] !== UPLOAD_ERR_OK) {
        echo json_encode([
            'success' => false,
            'message' => 'Error al subir la imagen: ' . $image['error']
        ]);
        exit;
    }
    
    // Verificar tipo de archivo
    $fileType = mime_content_type($image['tmp_name']);
    if (!in_array($fileType, $allowedImageTypes)) {
        echo json_encode([
            'success' => false,
            'message' => 'Tipo de archivo no permitido: ' . $fileType
        ]);
        exit;
    }
    
    // Verificar tamaño
    if ($image['size'] > $maxFileSize) {
        echo json_encode([
            'success' => false,
            'message' => 'La imagen excede el tamaño máximo permitido'
        ]);
        exit;
    }
    
    // Determinar la carpeta de destino
    $targetDir = $uploadDir;
    if (isset($_POST['equipo']) && !empty($_POST['equipo'])) {
        $targetDir .= 'equipo' . $_POST['equipo'] . '/';
    }
    
    // Crear el directorio si no existe
    createDirectoryIfNotExists($targetDir);
    
    // Guardar la imagen
    $targetFile = $targetDir . basename($image['name']);
    if (move_uploaded_file($image['tmp_name'], $targetFile)) {
        echo json_encode([
            'success' => true,
            'url' => 'https://jeyder.com.ar/iaprompt/' . $targetFile,
            'message' => 'Imagen subida correctamente'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Error al guardar la imagen'
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'message' => 'No se ha enviado ningún archivo'
    ]);
}
?>
