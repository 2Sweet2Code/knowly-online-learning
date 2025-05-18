
# Mëso Online API

This is a simple PHP API for the Mëso Online learning platform.

## Setup

1. Create a MySQL database named `meso_online`
2. Import the SQL script from `sql/setup.sql`
3. Update the database connection details in `config/config.php`
4. Make sure your web server is configured to handle .htaccess files

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register new user

### Courses
- `GET /api/courses` - Get all courses
- `GET /api/courses/view?id=<course_id>` - Get a specific course
- `POST /api/courses/create` - Create a new course

### Enrollments
- `GET /api/enrollments?userId=<user_id>` - Get enrollments for a user
- `POST /api/enrollments/create` - Create a new enrollment
- `PUT /api/enrollments/update?id=<enrollment_id>` - Update enrollment progress

## Test Users

For testing purposes, you can use the following credentials:

- Admin: admin@mesoonline.com / password
- Instructor: ana.koci@mesoonline.com / password
- Student: albi.deda@mesoonline.com / password
