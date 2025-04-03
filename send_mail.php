<?php
// Cargar la función de envío de correos
require_once __DIR__ . '/lib/send_email.php';

// Habilitar todos los errores para depuración
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Establecer tiempo máximo de ejecución
set_time_limit(120); // 2 minutos

// Registrar la solicitud recibida
error_log("Solicitud recibida en send_mail.php - " . date('Y-m-d H:i:s'));

// Verificar si se pasó un archivo de datos como argumento
if (isset($argv[1]) && file_exists($argv[1])) {
    // Leer datos desde el archivo JSON pasado como argumento
    $input = file_get_contents($argv[1]);
    error_log("Datos leídos desde archivo: " . $argv[1]);
} else {
    // Obtener y decodificar los datos de entrada desde PHP input
    $input = file_get_contents('php://input');
    error_log("Datos leídos desde php://input");
}

error_log("Datos de entrada: " . $input);

$data = json_decode($input, true);
error_log("Datos decodificados: " . print_r($data, true));

// Verificar que se recibieron todos los datos necesarios
if (empty($data['image_url'])) {
    $response = [
        'success' => false,
        'message' => 'Falta la URL de la imagen',
        'received_data' => $data
    ];
    echo json_encode($response);
    exit;
}

// Si falta el email o el nombre, usar valores predeterminados
if (empty($data['email'])) {
    $data['email'] = 'no-reply@jeyder.com.ar';
    error_log("Usando email predeterminado: " . $data['email']);
}

if (empty($data['name'])) {
    $data['name'] = 'Usuario';
    error_log("Usando nombre predeterminado: " . $data['name']);
}

// Extraer los datos
$email = $data['email'];
$name = $data['name'];
$image_url = $data['image_url'];
$prompt = isset($data['prompt']) ? $data['prompt'] : '';

// Validar el correo electrónico solo si no es el predeterminado
if ($email !== 'no-reply@jeyder.com.ar' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode([
        'success' => false,
        'message' => 'El correo electrónico no es válido: ' . $email
    ]);
    exit;
}

// Verificar que la URL de la imagen es válida y accesible
error_log("Verificando URL de imagen: " . $image_url);
if (!filter_var($image_url, FILTER_VALIDATE_URL)) {
    echo json_encode([
        'success' => false,
        'message' => 'La URL de la imagen no es válida: ' . $image_url
    ]);
    exit;
}

// Intentar descargar la imagen desde la URL
$temp_image_path = __DIR__ . '/temp_' . uniqid() . '.png';
error_log("Intentando descargar imagen desde: " . $image_url . " a " . $temp_image_path);

try {
    // Usar cURL para descargar la imagen con mejor manejo de errores
    $ch = curl_init($image_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    $image_content = curl_exec($ch);
    $curl_error = curl_error($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($image_content === false || $http_code != 200) {
        error_log("Error al descargar imagen: " . $curl_error . ", HTTP Code: " . $http_code);
        echo json_encode([
            'success' => false,
            'message' => 'No se pudo descargar la imagen desde la URL: ' . $image_url,
            'error' => $curl_error,
            'http_code' => $http_code
        ]);
        exit;
    }
    
    // Guardar la imagen descargada
    if (file_put_contents($temp_image_path, $image_content) === false) {
        error_log("Error al guardar la imagen descargada en: " . $temp_image_path);
        echo json_encode([
            'success' => false,
            'message' => 'No se pudo guardar la imagen descargada'
        ]);
        exit;
    }
    
    error_log("Imagen descargada correctamente a: " . $temp_image_path . " - Tamaño: " . filesize($temp_image_path) . " bytes");
    
    // Enviar el correo electrónico con la imagen descargada y la URL remota
    $result = send_image_email($email, $name, $temp_image_path, $prompt, $image_url);
    error_log("Resultado del envío de correo: " . print_r($result, true));
    
    // Si descargamos una imagen temporal, eliminarla
    if (file_exists($temp_image_path)) {
        @unlink($temp_image_path);
        error_log("Imagen temporal eliminada: " . $temp_image_path);
    }
    
    // Devolver el resultado
    echo json_encode($result);
    
} catch (Exception $e) {
    error_log("Excepción al procesar la solicitud: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al procesar la solicitud: ' . $e->getMessage()
    ]);
}
