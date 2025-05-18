
<?php
class AuthController {
    private $conn;
    
    public function __construct() {
        $db = Database::getInstance();
        $this->conn = $db->getConnection();
    }
    
    public function login() {
        // Check if the request is a POST request
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405); // Method Not Allowed
            echo json_encode([
                'error' => true,
                'message' => 'Only POST requests are allowed'
            ]);
            return;
        }
        
        // Get POST data
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate input
        if (!isset($data['email']) || !isset($data['password'])) {
            http_response_code(400);
            echo json_encode([
                'error' => true,
                'message' => 'Email and password are required'
            ]);
            return;
        }
        
        $email = $data['email'];
        $password = $data['password'];
        
        // In a real application, this would verify against the database
        // For demonstration purposes, we'll accept any credentials
        
        // Determine role based on email for testing purposes
        $role = 'student';
        if (strpos($email, 'admin') !== false) {
            $role = 'admin';
        } elseif (strpos($email, 'instructor') !== false) {
            $role = 'instructor';
        }
        
        // Generate a mock user
        $user = [
            'id' => uniqid(),
            'name' => explode('@', $email)[0],
            'email' => $email,
            'role' => $role,
        ];
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Login successful',
            'data' => $user
        ]);
    }
    
    public function register() {
        // Check if the request is a POST request
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405); // Method Not Allowed
            echo json_encode([
                'error' => true,
                'message' => 'Only POST requests are allowed'
            ]);
            return;
        }
        
        // Get POST data
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate input
        if (!isset($data['name']) || !isset($data['email']) || !isset($data['password']) || !isset($data['role'])) {
            http_response_code(400);
            echo json_encode([
                'error' => true,
                'message' => 'Name, email, password and role are required'
            ]);
            return;
        }
        
        // In a real application, this would save to the database
        // For now, we'll just return a success response with the mock user
        $newUser = [
            'id' => uniqid(),
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
        ];
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Registration successful',
            'data' => $newUser
        ]);
    }
}
