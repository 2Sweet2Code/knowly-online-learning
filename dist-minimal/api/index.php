
<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get request parameters
$controller = $_GET['controller'] ?? 'home';
$action = $_GET['action'] ?? 'index';

// Load configuration
require_once 'config/config.php';

// Simple router
try {
    $controllerFile = 'controllers/' . $controller . '_controller.php';
    
    if (file_exists($controllerFile)) {
        require_once $controllerFile;
        
        $className = ucfirst($controller) . 'Controller';
        $controllerInstance = new $className();
        
        if (method_exists($controllerInstance, $action)) {
            $controllerInstance->$action();
        } else {
            throw new Exception("Action not found: $action");
        }
    } else {
        throw new Exception("Controller not found: $controller");
    }
} catch (Exception $e) {
    http_response_code(404);
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage()
    ]);
}
