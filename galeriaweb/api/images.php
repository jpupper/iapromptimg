<?php
// images.php - Place this file on your server at jeyder.com.ar/iaprompt/api/
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// Configuration
$baseDir = '../img/'; // Path to the images directory

// Function to scan directory recursively
function scanImagesDirectory($dir) {
    $images = [];
    $baseUrl = 'https://jeyder.com.ar/iaprompt/';
    
    // Check if directory exists
    if (!file_exists($dir) || !is_dir($dir)) {
        return $images;
    }
    
    // Scan directory for files and subdirectories
    $items = scandir($dir);
    
    foreach ($items as $item) {
        // Skip . and ..
        if ($item === '.' || $item === '..') {
            continue;
        }
        
        $path = $dir . '/' . $item;
        $relativePath = str_replace('../', '', $path); // Convert to relative path
        
        if (is_dir($path)) {
            // If it's a directory, extract equipo number
            $equipo = null;
            if (preg_match('/equipo(\d+)/', $item, $matches)) {
                $equipo = $matches[1];
            }
            
            // Scan subdirectory
            $subDirImages = scanImagesDirectory($path);
            
            // Add equipo info to images from this subdirectory
            foreach ($subDirImages as &$image) {
                if (!isset($image['equipo']) && $equipo) {
                    $image['equipo'] = $equipo;
                }
            }
            
            // Add to main images array
            $images = array_merge($images, $subDirImages);
        } else {
            // Check if it's an image file
            $extension = strtolower(pathinfo($item, PATHINFO_EXTENSION));
            if (in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
                // Extract equipo from parent directory
                $equipo = null;
                $dirName = basename(dirname($path));
                if (preg_match('/equipo(\d+)/', $dirName, $matches)) {
                    $equipo = $matches[1];
                }
                
                // Get file modification time as timestamp
                $timestamp = filemtime($path);
                
                // Add image to array
                $images[] = [
                    'url' => $baseUrl . $relativePath,
                    'equipo' => $equipo,
                    'timestamp' => date('Y-m-d H:i:s', $timestamp),
                    'prompt' => getPromptFromFilename($item) // Extract prompt from filename if available
                ];
            }
        }
    }
    
    return $images;
}

// Function to extract prompt from filename (if your system stores prompts in filenames)
function getPromptFromFilename($filename) {
    // Get filename without extension
    $name = pathinfo($filename, PATHINFO_FILENAME);
    
    // Replace underscores with spaces to get the original prompt
    $prompt = str_replace('_', ' ', $name);
    
    // Capitalize first letter for better presentation
    return ucfirst($prompt);
}

// Get all images
$images = scanImagesDirectory($baseDir);

// Sort by timestamp (newest first)
usort($images, function($a, $b) {
    return strtotime($b['timestamp']) - strtotime($a['timestamp']);
});

// Return as JSON
echo json_encode($images);
?>
