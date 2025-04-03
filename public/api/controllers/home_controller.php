
<?php
class HomeController {
    public function index() {
        echo json_encode([
            'status' => 'success',
            'message' => 'Welcome to Mëso Online API',
            'version' => '1.0.0'
        ]);
    }
}
