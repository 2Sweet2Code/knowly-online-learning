import { Database } from './database.types';

export type AnnouncementCommentWithProfile = {
  id: string;
  content: string;
  announcement_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  profiles: {
    name: string | null;
    avatar_url: string | null;
  } | null;
};

// Extend the Database type with our custom function
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace SupabaseSchema {
    interface PublicFunctions {
      get_announcement_comments_with_profiles: {
        Args: { announcement_id: string };
        Returns: AnnouncementCommentWithProfile[];
      };
    }
  }
}

export {};
