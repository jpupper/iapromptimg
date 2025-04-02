<?php
// notify.php - Place this file on your server at jeyder.com.ar/iaprompt/api/
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check if it's a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Get JSON data from request body
$jsonData = file_get_contents('php://input');
$data = json_decode($jsonData, true);

// Validate data
if (!$data || !isset($data['url'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid data']);
    exit();
}

// Create notifications directory if it doesn't exist
$notificationsDir = '../notifications/';
if (!file_exists($notificationsDir)) {
    mkdir($notificationsDir, 0755, true);
}

// Create a unique notification ID
$notificationId = uniqid();

// Store notification data
$notification = [
    'id' => $notificationId,
    'url' => $data['url'],
    'prompt' => $data['prompt'] ?? '',
    'equipo' => $data['equipo'] ?? '',
    'timestamp' => $data['timestamp'] ?? date('Y-m-d H:i:s'),
    'read' => false
];

// Save notification to file
$notificationFile = $notificationsDir . $notificationId . '.json';
file_put_contents($notificationFile, json_encode($notification));

// Return success response
echo json_encode([
    'success' => true,
    'message' => 'Notification received',
    'notification_id' => $notificationId
]);
?>
