<?php
// Importar las clases de PHPMailer
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

// Cargar los archivos necesarios
require_once __DIR__ . '/Exception.php';
require_once __DIR__ . '/PHPMailer.php';
require_once __DIR__ . '/SMTP.php';

/**
 * Función para enviar un correo electrónico con una imagen adjunta
 * 
 * @param string $to_email Correo electrónico del destinatario
 * @param string $to_name Nombre del destinatario
 * @param string $image_path Ruta completa a la imagen que se adjuntará
 * @param string $prompt Texto del prompt utilizado para generar la imagen
 * @param string $remote_url URL remota de la imagen
 * @return array Resultado de la operación (success: bool, message: string)
 */
function send_image_email($to_email, $to_name, $image_path, $prompt = '', $remote_url = '') {
    // Verificar que la imagen existe
    if (!file_exists($image_path)) {
        error_log("Error: La imagen no existe en la ruta: " . $image_path);
        return [
            'success' => false,
            'message' => 'La imagen no existe en la ruta especificada: ' . $image_path
        ];
    }

    error_log("Iniciando envío de correo a: " . $to_email . " con imagen: " . $image_path);
    if (!empty($remote_url)) {
        error_log("URL remota de la imagen: " . $remote_url);
    }

    // Crear una nueva instancia de PHPMailer
    $mail = new PHPMailer(true);

    try {
        // Configuración del servidor
        $mail->SMTPDebug = SMTP::DEBUG_SERVER; // Habilitar debug
        ob_start(); // Capturar output de debug
        
        $mail->isSMTP();
        $mail->Host = 'mail.jeyder.com.ar'; // Servidor SMTP correcto
        $mail->SMTPAuth = true;
        $mail->Username = 'tecnica@jeyder.com.ar';
        $mail->Password = 'Sarosa2025*';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;
        
        // Desactivar verificación de certificado para pruebas
        $mail->SMTPOptions = array(
            'ssl' => array(
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            )
        );

        // Configuración adicional para depuración
        $mail->Timeout = 60; // Aumentar el tiempo de espera a 60 segundos
        $mail->Debugoutput = function($str, $level) {
            error_log("PHPMailer Debug ($level): $str");
        };

        // Destinatarios
        $mail->setFrom('tecnica@jeyder.com.ar', 'Generador de Imágenes Luján');
        $mail->addAddress($to_email, $to_name);

        // Adjuntar la imagen
        error_log("Adjuntando imagen: " . $image_path);
        $mail->addAttachment($image_path);

        // Contenido
        $mail->isHTML(true);                                  // Establecer formato de email a HTML
        $mail->Subject = 'Tu imagen generada con IA - Luján';
        $mail->CharSet = 'UTF-8'; // Asegurar codificación correcta
        
        // Crear el cuerpo del correo electrónico
        $body = '
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #122b42; color: white; padding: 10px; text-align: center; }
                .content { padding: 20px; background-color: #f9f9f9; }
                .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #666; }
                .prompt { background-color: #e9e9e9; padding: 10px; border-left: 4px solid #122b42; margin: 15px 0; }
                .image-container { text-align: center; margin: 20px 0; }
                .button { display: inline-block; background-color: #122b42; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>¡Tu imagen está lista!</h1>
                </div>
                <div class="content">
                    <p>Hola <strong>' . htmlspecialchars($to_name) . '</strong>,</p>
                    <p>Tu imagen ha sido generada exitosamente con nuestro sistema de IA.</p>
                    
                    <div class="prompt">
                        <strong>Prompt utilizado:</strong><br>
                        ' . htmlspecialchars($prompt) . '
                    </div>
                    
                    <div class="image-container">
                        <img src="cid:imagen-generada" style="max-width: 100%; height: auto;" alt="Imagen generada con IA">
                    </div>';
        
        // Agregar enlace a la imagen remota si está disponible
        if (!empty($remote_url)) {
            $body .= '
                    <p style="text-align: center;">
                        <a href="' . htmlspecialchars($remote_url) . '" class="button" target="_blank">Ver imagen en línea</a>
                    </p>
                    <p style="text-align: center;">
                        <small>O copia este enlace: <a href="' . htmlspecialchars($remote_url) . '">' . htmlspecialchars($remote_url) . '</a></small>
                    </p>';
        }
        
        $body .= '
                </div>
                <div class="footer">
                    <p>Este correo fue enviado automáticamente desde el Generador de Imágenes de Luján.</p>
                    <p>Por favor no responda a este correo.</p>
                </div>
            </div>
        </body>
        </html>';
        
        $mail->Body = $body;
        $mail->AltBody = 'Tu imagen generada con IA - Prompt: ' . $prompt;
        
        // Agregar la imagen incrustada en el cuerpo del correo
        $mail->addEmbeddedImage($image_path, 'imagen-generada', basename($image_path));
        
        // Enviar el correo
        $mail->send();
        
        $debug_output = ob_get_clean(); // Obtener y limpiar el buffer de salida
        error_log("Correo enviado correctamente a: " . $to_email);
        error_log("Debug SMTP: " . $debug_output);
        
        return [
            'success' => true,
            'message' => 'Correo enviado correctamente',
            'to' => $to_email,
            'debug' => $debug_output
        ];
    } catch (Exception $e) {
        $debug_output = ob_get_clean(); // Obtener y limpiar el buffer de salida
        error_log("Error al enviar correo: " . $e->getMessage());
        error_log("Debug SMTP: " . $debug_output);
        
        return [
            'success' => false,
            'message' => 'Error al enviar correo: ' . $e->getMessage(),
            'debug' => $debug_output
        ];
    }
}
