/**
 * Auto-generated database types from Supabase schema.
 * Run: npx supabase gen types typescript --schema public
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: 'student' | 'instructor' | 'admin';
          full_name: string | null;
          timezone: string;
          streak_freezes: number;
          last_action_date: string | null;
          last_streak_recovery_at: string | null;
          focus_path: 'civic' | 'green' | 'digital' | 'entrepreneurship' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      quest_templates: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string;
          quest_type: 'daily' | 'weekly' | 'path' | 'community';
          metric: 'intro_mission' | 'module_completion' | 'skill_completion' | 'poll_submission' | 'petition_signature';
          target_count: number;
          xp_reward: number;
          estimated_minutes: number;
          path_slug: string | null;
          icon_name: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['quest_templates']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['quest_templates']['Insert']>;
      };
      user_quests: {
        Row: {
          id: string;
          user_id: string;
          quest_template_id: string;
          period_key: string;
          starts_at: string;
          expires_at: string | null;
          progress_count: number;
          status: 'active' | 'completed' | 'expired';
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_quests']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_quests']['Insert']>;
      };
      daily_learning_activity: {
        Row: {
          user_id: string;
          activity_date: string;
          minutes_earned: number;
          action_count: number;
          goal_minutes: 5 | 10 | 15;
          goal_completed_at: string | null;
          updated_at: string;
        };
        Insert: Database['public']['Tables']['daily_learning_activity']['Row'];
        Update: Partial<Database['public']['Tables']['daily_learning_activity']['Insert']>;
      };
      policy_polls: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: string;
          status: 'draft' | 'active' | 'closed';
          created_by: string;
          closes_at: string | null;
          what_context: string | null;
          why_context: string | null;
          how_context: string | null;
          impact_context: string | null;
          ai_insights: string | null;
          insights_generated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['policy_polls']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['policy_polls']['Insert']>;
      };
      poll_comments: {
        Row: {
          id: string;
          poll_id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['poll_comments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['poll_comments']['Insert']>;
      };
      policy_briefs: {
        Row: {
          id: string;
          poll_id: string | null;
          title: string;
          content: string;
          status: 'draft' | 'approved' | 'published';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['policy_briefs']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['policy_briefs']['Insert']>;
      };
      policies: {
        Row: {
          id: string;
          title: string;
          summary: string;
          why_matters: string | null;
          impact_on_youth: string | null;
          opportunities: string | null;
          risks_challenges: string | null;
          real_world_examples: string | null;
          faqs: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['policies']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['policies']['Insert']>;
      };
      social_law_resources: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: string;
          file_url: string | null;
          resource_type: string;
          topic: string | null;
          county: string | null;
          governance_sector: string | null;
          sdg: string | null;
          summary: string | null;
          policy_references: string | null;
          is_youth_kb: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['social_law_resources']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['social_law_resources']['Insert']>;
      };
    };
  };
}
