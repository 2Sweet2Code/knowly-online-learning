
<?php
class CoursesController {
    private $conn;
    
    public function __construct() {
        $db = Database::getInstance();
        $this->conn = $db->getConnection();
    }
    
    public function index() {
        // In a real application, this would fetch from the database
        // For now, we'll return mock data
        
        $courses = [
            [
                'id' => '1',
                'title' => 'Hyrje në Programim me Python',
                'description' => 'Mësoni bazat thelbësore të gjuhës Python, ideale për fillestarët në botën e kodimit.',
                'image' => 'https://placehold.co/600x360/5C4B3A/F5F0E6?text=Python+Kurs',
                'category' => 'programim',
                'instructor' => 'Ana Koci',
                'instructorId' => '101',
                'students' => 50,
                'status' => 'active',
            ],
            [
                'id' => '2',
                'title' => 'Bazat e Dizajnit Grafik me Figma',
                'description' => 'Krijoni ndërfaqe përdoruesi (UI) moderne dhe prototipe interaktive duke përdorur mjetin popullor Figma.',
                'image' => 'https://placehold.co/600x360/3E2D21/F5F0E6?text=Figma+Dizajn',
                'category' => 'dizajn',
                'instructor' => 'Besi Leka',
                'instructorId' => '102',
                'students' => 35,
                'status' => 'active',
            ],
            [
                'id' => '3',
                'title' => 'Marketing Dixhital për Fillestarë',
                'description' => 'Zbulo strategjitë kyçe të marketingut online: SEO, mediat sociale, email marketing dhe më shumë.',
                'image' => 'https://placehold.co/600x360/D4AF37/3E2D21?text=Marketing+Dixhital',
                'category' => 'marketing',
                'instructor' => 'Drini Malaj',
                'instructorId' => '103',
                'students' => 75,
                'status' => 'active',
            ],
            [
                'id' => '4',
                'title' => 'React.js: Ndërto Aplikacione Web',
                'description' => 'Thellohuni në librarinë React për të krijuar UI interaktive dhe efikase për aplikacionet moderne web.',
                'image' => 'https://placehold.co/600x360/5C4B3A/FFFFFF?text=React.js',
                'category' => 'programim',
                'instructor' => 'Era Bisha',
                'instructorId' => '104',
                'students' => 25,
                'status' => 'active',
            ],
            [
                'id' => '5',
                'title' => 'Principet Themelore të UI/UX Dizajnit',
                'description' => 'Mësoni principet kryesore për të krijuar eksperienca dixhitale intuitive dhe tërheqëse për përdoruesit.',
                'image' => 'https://placehold.co/600x360/3E2D21/F5F0E6?text=UI/UX+Principet',
                'category' => 'dizajn',
                'instructor' => 'Genta Muka',
                'instructorId' => '105',
                'students' => 40,
                'status' => 'active',
            ]
        ];
        
        echo json_encode([
            'status' => 'success',
            'data' => $courses
        ]);
    }
    
    public function view() {
        if (!isset($_GET['id'])) {
            http_response_code(400);
            echo json_encode([
                'error' => true,
                'message' => 'Course ID is required'
            ]);
            return;
        }
        
        $courseId = $_GET['id'];
        
        // In a real application, this would fetch from the database
        // For demonstration, we'll return a mock course
        $course = [
            'id' => $courseId,
            'title' => 'Hyrje në Programim me Python',
            'description' => 'Mësoni bazat thelbësore të gjuhës Python, ideale për fillestarët në botën e kodimit.',
            'image' => 'https://placehold.co/600x360/5C4B3A/F5F0E6?text=Python+Kurs',
            'category' => 'programim',
            'instructor' => 'Ana Koci',
            'instructorId' => '101',
            'students' => 50,
            'status' => 'active',
            'content' => [
                'sections' => [
                    [
                        'id' => '1',
                        'title' => 'Hyrje në Python',
                        'lessons' => [
                            [
                                'id' => '101',
                                'title' => 'Çfarë është Python?',
                                'duration' => '10:30',
                                'type' => 'video'
                            ],
                            [
                                'id' => '102',
                                'title' => 'Instalimi i Python',
                                'duration' => '15:45',
                                'type' => 'video'
                            ]
                        ]
                    ],
                    [
                        'id' => '2',
                        'title' => 'Variablat dhe Tipet e të Dhënave',
                        'lessons' => [
                            [
                                'id' => '201',
                                'title' => 'Variablat në Python',
                                'duration' => '12:20',
                                'type' => 'video'
                            ],
                            [
                                'id' => '202',
                                'title' => 'Tipet e të Dhënave',
                                'duration' => '14:10',
                                'type' => 'video'
                            ]
                        ]
                    ]
                ]
            ]
        ];
        
        echo json_encode([
            'status' => 'success',
            'data' => $course
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
        if (!isset($data['title']) || !isset($data['description']) || !isset($data['category'])) {
            http_response_code(400);
            echo json_encode([
                'error' => true,
                'message' => 'Missing required fields'
            ]);
            return;
        }
        
        // In a real application, this would save to the database
        // For now, we'll just return a success response with the mock data
        $newCourse = [
            'id' => uniqid(),
            'title' => $data['title'],
            'description' => $data['description'],
            'category' => $data['category'],
            'image' => $data['image'] ?? 'https://placehold.co/600x360/5C4B3A/F5F0E6?text=' . urlencode($data['title']),
            'instructor' => $data['instructor'] ?? 'Anonymous',
            'instructorId' => $data['instructorId'] ?? '0',
            'students' => 0,
            'status' => 'draft'
        ];
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Course created successfully',
            'data' => $newCourse
        ]);
    }
}
