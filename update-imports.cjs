const fs = require('fs');
const path = require('path');

// Files to update
const files = [
  'src/pages/MySpacePage.tsx',
  'src/pages/HomePage.tsx',
  'src/pages/DashboardPage.tsx',
  'src/pages/CourseDetailPage.tsx',
  'src/pages/AdminApplyCoursesPage.tsx',
  'src/layouts/DashboardLayout.tsx',
  'src/components/MySpaceSection.tsx',
  'src/components/StudentGradesList.tsx',
  'src/components/modals/SignupModal.tsx',
  'src/components/modals/RequestAdminAccessModal.tsx',
  'src/components/modals/PurchaseCourseModal.tsx',
  'src/components/modals/ManageCourseAdminsModal.tsx',
  'src/components/modals/JoinCourseModal.tsx',
  'src/components/modals/EditCourseModal.tsx',
  'src/components/modals/CreateCourseModal.tsx',
  'src/components/Header.tsx',
  'src/components/CourseCard.tsx',
  'src/components/dashboard/AnnouncementModal.tsx',
  'src/components/dashboard/DashboardCourseLessons.tsx',
  'src/components/dashboard/DashboardCourses.tsx',
  'src/components/dashboard/DashboardOverview.tsx',
  'src/components/dashboard/DashboardSettings.tsx',
  'src/components/dashboard/DashboardSidebar.tsx',
  'src/components/ClassmatesList.tsx',
  'src/components/AssignmentsSection.tsx',
  'src/components/announcement/AnnouncementComments.tsx',
  'src/components/course/CourseContentManagement.tsx',
  'src/components/course/CourseAnnouncements.tsx'
];

// Update each file
files.forEach(filePath => {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace the import path
      const updatedContent = content.replace(
        /from ["']\.*\/context\/AuthContext["']/g,
        "from '@/hooks/useAuth'"
      );
      
      // Write the updated content back to the file
      fs.writeFileSync(fullPath, updatedContent, 'utf8');
      console.log(`Updated: ${filePath}`);
    } else {
      console.log(`Skipped (not found): ${filePath}`);
    }
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
  }
});

console.log('All files have been updated.');
