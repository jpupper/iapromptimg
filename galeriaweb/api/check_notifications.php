<?php
// check_notifications.php - Place this file on your server at jeyder.com.ar/iaprompt/api/
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// Configuration
$notificationsDir = '../notifications/';

// Function to get unread notifications
function getUnreadNotifications() {
    global $notificationsDir;
    
    // Check if directory exists
    if (!file_exists($notificationsDir) || !is_dir($notificationsDir)) {
        return [];
    }
    
    $notifications = [];
    $files = scandir($notificationsDir);
    
    foreach ($files as $file) {
        // Skip . and .. and non-json files
        if ($file === '.' || $file === '..' || !str_ends_with($file, '.json')) {
            continue;
        }
        
        $path = $notificationsDir . '/' . $file;
        $content = file_get_contents($path);
        $notification = json_decode($content, true);
        
        // Add only unread notifications
        if ($notification && isset($notification['read']) && $notification['read'] === false) {
            $notifications[] = $notification;
        }
    }
    
    // Sort by timestamp (newest first)
    usort($notifications, function($a, $b) {
        return strtotime($b['timestamp']) - strtotime($a['timestamp']);
    });
    
    return $notifications;
}

// Function to mark notifications as read
function markAsRead($ids) {
    global $notificationsDir;
    
    if (!is_array($ids) || empty($ids)) {
        return 0;
    }
    
    $count = 0;
    
    foreach ($ids as $id) {
        $path = $notificationsDir . '/' . $id . '.json';
        
        if (file_exists($path)) {
            $content = file_get_contents($path);
            $notification = json_decode($content, true);
            
            if ($notification) {
                $notification['read'] = true;
                file_put_contents($path, json_encode($notification));
                $count++;
            }
        }
    }
    
    return $count;
}

// Handle request
$response = ['success' => true];

// Check if it's a POST request to mark notifications as read
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $jsonData = file_get_contents('php://input');
    $data = json_decode($jsonData, true);
    
    if ($data && isset($data['mark_read']) && is_array($data['mark_read'])) {
        $count = markAsRead($data['mark_read']);
        $response['marked_read'] = $count;
    } else {
        $response['success'] = false;
        $response['message'] = 'Invalid request';
    }
} else {
    // GET request - return unread notifications
    $response['notifications'] = getUnreadNotifications();
}

// Return response
echo json_encode($response);
?>
