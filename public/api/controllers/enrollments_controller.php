
<?php
class EnrollmentsController {
    private $conn;
    
    public function __construct() {
        $db = Database::getInstance();
        $this->conn = $db->getConnection();
    }
    
    public function index() {
        // Check if user ID is provided
        if (!isset($_GET['userId'])) {
            http_response_code(400);
            echo json_encode([
                'error' => true,
                'message' => 'User ID is required'
            ]);
            return;
        }
        
        $userId = $_GET['userId'];
        
        // In a real application, this would fetch from the database
        // For demonstration, we'll return mock enrollments
        $enrollments = [];
        
        // Only return enrollments for user ID 1 in our mock
        if ($userId === '1') {
            $enrollments = [
                [
                    'id' => '1',
                    'courseId' => '1',
                    'userId' => '1',
                    'progress' => 45,
                    'completed' => false,
                ],
                [
                    'id' => '2',
                    'courseId' => '2',
                    'userId' => '1',
                    'progress' => 20,
                    'completed' => false,
                ]
            ];
        }
        
        echo json_encode([
            'status' => 'success',
            'data' => $enrollments
        ]);
    }
    
    public function create() {
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
        if (!isset($data['userId']) || !isset($data['courseId'])) {
            http_response_code(400);
            echo json_encode([
                'error' => true,
                'message' => 'User ID and Course ID are required'
            ]);
            return;
        }
        
        // In a real application, this would save to the database
        // For now, we'll just return a success response with the mock enrollment
        $newEnrollment = [
            'id' => uniqid(),
            'courseId' => $data['courseId'],
            'userId' => $data['userId'],
            'progress' => 0,
            'completed' => false,
        ];
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Enrollment successful',
            'data' => $newEnrollment
        ]);
    }
    
    public function update() {
        // Check if the request is a PUT request
        if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
            http_response_code(405); // Method Not Allowed
            echo json_encode([
                'error' => true,
                'message' => 'Only PUT requests are allowed'
            ]);
            return;
        }
        
        // Get PUT data
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate input
        if (!isset($_GET['id'])) {
            http_response_code(400);
            echo json_encode([
                'error' => true,
                'message' => 'Enrollment ID is required'
            ]);
            return;
        }
        
        $enrollmentId = $_GET['id'];
        
        // In a real application, this would update the database
        // For now, we'll just return a success response with the updated enrollment
        $updatedEnrollment = [
            'id' => $enrollmentId,
            'courseId' => $data['courseId'] ?? '1',
            'userId' => $data['userId'] ?? '1',
            'progress' => $data['progress'] ?? 0,
            'completed' => $data['completed'] ?? false,
        ];
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Enrollment updated successfully',
            'data' => $updatedEnrollment
        ]);
    }
}
