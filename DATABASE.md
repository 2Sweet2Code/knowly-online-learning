# Database Setup Guide

This guide will help you set up and manage the database for the Knowly Online Learning platform.

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Supabase project with appropriate permissions

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/2Sweet2Code/knowly-online-learning.git
   cd knowly-online-learning
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Update the Supabase credentials in the `.env` file

## Running Migrations

To apply database migrations, run:

```bash
npm run migrate
```

This will apply all SQL migrations in the `supabase/migrations` directory in order.

## Database Schema

The database consists of the following main tables:

- `profiles` - User profiles (extends auth.users)
- `courses` - Course information
- `course_announcements` - Announcements for courses
- `enrollments` - Tracks user enrollments in courses

## Row Level Security (RLS)

RLS is enabled on all tables to ensure proper access control. The following policies are in place:

### Courses
- Public read access to active courses
- Instructors can manage their own courses
- Admins can manage all courses

### Course Announcements
- Read access to announcements for active courses
- Instructors can manage announcements for their courses
- Admins can manage all announcements

### Enrollments
- Users can see their own enrollments
- Authenticated users can enroll in courses
- Instructors can see enrollments for their courses

## Common Issues

### "Table does not exist"
Ensure you've run the migrations and the table names match exactly.

### Permission denied
Check that the Supabase service role key has the necessary permissions and that RLS policies are correctly configured.

### Connection issues
Verify that the Supabase URL and API keys in your `.env` file are correct and that your network allows connections to Supabase.
