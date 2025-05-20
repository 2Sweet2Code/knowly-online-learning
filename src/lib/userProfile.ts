import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const createUserProfile = async (
  userId: string, 
  name: string, 
  role: string
): Promise<Database['public']['Tables']['profiles']['Row'] | null> => {
  try {
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    const profileData = {
      id: userId,
      name,
      role,
      updated_at: new Date().toISOString(),
    };

    if (existingProfile) {
      // Update existing profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) throw updateError;
      return updatedProfile;
    } else {
      // Create new profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (createError) throw createError;
      return newProfile;
    }
  } catch (error) {
    console.error('Error creating/updating profile:', error);
    return null;
  }
};
