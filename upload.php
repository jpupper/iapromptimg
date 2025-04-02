<?php
// upload.php - Place this file on your server at jeyder.com.ar/iaprompt/
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

$response = array('success' => false, 'message' => '', 'url' => '');

// Check if file was uploaded
if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = 'img/';
    
    // Create directory if it doesn't exist
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    // Get file info
    $fileName = basename($_FILES['image']['name']);
    $targetFilePath = $uploadDir . $fileName;
    $fileType = pathinfo($targetFilePath, PATHINFO_EXTENSION);
    
    // Check if equipo parameter was provided
    $equipo = '';
    if (isset($_POST['equipo']) && !empty($_POST['equipo'])) {
        $equipo = $_POST['equipo'];
        $equipoDir = $uploadDir . 'equipo' . $equipo . '/';
        
        // Create equipo directory if it doesn't exist
        if (!file_exists($equipoDir)) {
            mkdir($equipoDir, 0755, true);
        }
        
        $targetFilePath = $equipoDir . $fileName;
    }
    
    // Allow only specific file formats
    $allowedTypes = array('jpg', 'jpeg', 'png', 'gif', 'webp');
    if (in_array(strtolower($fileType), $allowedTypes)) {
        // Upload file to server
        if (move_uploaded_file($_FILES['image']['tmp_name'], $targetFilePath)) {
            $response['success'] = true;
            $response['message'] = 'Image uploaded successfully';
            $response['url'] = 'https://jeyder.com.ar/iaprompt/' . $targetFilePath;
        } else {
            $response['message'] = 'Error uploading the file';
        }
    } else {
        $response['message'] = 'Only JPG, JPEG, PNG, GIF, and WEBP files are allowed';
    }
} else {
    $response['message'] = 'No file was uploaded or an error occurred';
    if (isset($_FILES['image'])) {
        $response['message'] .= ' - Error code: ' . $_FILES['image']['error'];
    }
}

// Return response as JSON
header('Content-Type: application/json');
echo json_encode($response);
?>
