
<?php
// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');  // Change this to your database username
define('DB_PASS', '');      // Change this to your database password
define('DB_NAME', 'meso_online');

// Application settings
define('APP_NAME', 'Mëso Online');
define('APP_URL', 'http://localhost:8080');

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Include database connection
require_once 'database.php';
