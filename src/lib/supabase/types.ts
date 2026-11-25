export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          display_name_changed_at: string | null;
          avatar_url: string | null;
          gender: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | null;
          dob: string;
          bio: string | null;
          interests: string[] | null;
          languages: string[] | null;
          area: { country?: string; state?: string; city?: string } | null;
          is_visible: boolean;
          is_online: boolean;
          last_seen_at: string | null;
          is_suspended: boolean;
          suspended_until: string | null;
          is_banned: boolean;
          role: 'user' | 'admin';
          mood_status: string | null;
          mood_updated_at: string | null;
          read_receipts_visible: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          display_name_changed_at?: string | null;
          avatar_url?: string | null;
          gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | null;
          dob: string;
          bio?: string | null;
          interests?: string[] | null;
          languages?: string[] | null;
          area?: { country?: string; state?: string; city?: string } | null;
          is_visible?: boolean;
          is_online?: boolean;
          last_seen_at?: string | null;
          is_suspended?: boolean;
          suspended_until?: string | null;
          is_banned?: boolean;
          role?: 'user' | 'admin';
          mood_status?: string | null;
          mood_updated_at?: string | null;
          read_receipts_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          display_name_changed_at?: string | null;
          avatar_url?: string | null;
          gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | null;
          dob?: string;
          bio?: string | null;
          interests?: string[] | null;
          languages?: string[] | null;
          area?: { country?: string; state?: string; city?: string } | null;
          is_visible?: boolean;
          is_online?: boolean;
          last_seen_at?: string | null;
          is_suspended?: boolean;
          suspended_until?: string | null;
          is_banned?: boolean;
          role?: 'user' | 'admin';
          mood_status?: string | null;
          mood_updated_at?: string | null;
          read_receipts_visible?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      filter_presets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          filters: {
            age_min?: number;
            age_max?: number;
            gender?: string;
            area?: { country?: string; state?: string; city?: string };
            interests?: string[];
            language?: string;
          };
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          filters: {
            age_min?: number;
            age_max?: number;
            gender?: string;
            area?: { country?: string; state?: string; city?: string };
            interests?: string[];
            language?: string;
          };
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          filters?: {
            age_min?: number;
            age_max?: number;
            gender?: string;
            area?: { country?: string; state?: string; city?: string };
            interests?: string[];
            language?: string;
          };
          updated_at?: string;
        };
        Relationships: [];
      };
      connection_requests: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          status: 'pending' | 'accepted' | 'rejected' | 'expired';
          intro: string | null;
          expires_at: string;
          responded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          status?: 'pending' | 'accepted' | 'rejected' | 'expired';
          intro?: string | null;
          expires_at?: string;
          responded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          receiver_id?: string;
          status?: 'pending' | 'accepted' | 'rejected' | 'expired';
          intro?: string | null;
          expires_at?: string;
          responded_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      chats: {
        Row: {
          id: string;
          participant_1: string;
          participant_2: string;
          connection_request_id: string | null;
          is_active: boolean;
          cleared_at_p1?: string | null;
          cleared_at_p2?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          participant_1: string;
          participant_2: string;
          connection_request_id?: string | null;
          is_active?: boolean;
          cleared_at_p1?: string | null;
          cleared_at_p2?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          participant_1?: string;
          participant_2?: string;
          connection_request_id?: string | null;
          is_active?: boolean;
          cleared_at_p1?: string | null;
          cleared_at_p2?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          sender_id: string;
          content: string;
          is_deleted: boolean;
          deleted_by_users?: string[] | null;
          delivered_at: string | null;
          read_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          sender_id: string;
          content: string;
          is_deleted?: boolean;
          deleted_by_users?: string[] | null;
          delivered_at?: string | null;
          read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          sender_id?: string;
          content?: string;
          is_deleted?: boolean;
          deleted_by_users?: string[] | null;
          delivered_at?: string | null;
          read_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      calls: {
        Row: {
          id: string;
          chat_id: string;
          caller_id: string;
          receiver_id: string;
          type: 'voice' | 'video';
          status: 'ringing' | 'active' | 'ended' | 'declined' | 'missed';
          livekit_room_name: string | null;
          started_at: string | null;
          ended_at: string | null;
          video_enabled_caller: boolean;
          video_enabled_receiver: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          caller_id: string;
          receiver_id: string;
          type: 'voice' | 'video';
          status?: 'ringing' | 'active' | 'ended' | 'declined' | 'missed';
          livekit_room_name?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          video_enabled_caller?: boolean;
          video_enabled_receiver?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          caller_id?: string;
          receiver_id?: string;
          type?: 'voice' | 'video';
          status?: 'ringing' | 'active' | 'ended' | 'declined' | 'missed';
          livekit_room_name?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          video_enabled_caller?: boolean;
          video_enabled_receiver?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          icon_url: string | null;
          tags: string[] | null;
          is_public: boolean;
          max_members: number;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          icon_url?: string | null;
          tags?: string[] | null;
          is_public?: boolean;
          max_members?: number;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          icon_url?: string | null;
          tags?: string[] | null;
          is_public?: boolean;
          max_members?: number;
          owner_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member';
          status: 'active' | 'pending' | 'banned';
          is_muted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          role?: 'owner' | 'admin' | 'member';
          status?: 'active' | 'pending' | 'banned';
          is_muted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'member';
          status?: 'active' | 'pending' | 'banned';
          is_muted?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      group_messages: {
        Row: {
          id: string;
          group_id: string;
          sender_id: string;
          content: string;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          sender_id: string;
          content: string;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          sender_id?: string;
          content?: string;
          is_deleted?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      group_invites: {
        Row: {
          id: string;
          group_id: string;
          created_by: string;
          token: string;
          expires_at: string | null;
          max_uses: number | null;
          use_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          created_by: string;
          token?: string;
          expires_at?: string | null;
          max_uses?: number | null;
          use_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          created_by?: string;
          token?: string;
          expires_at?: string | null;
          max_uses?: number | null;
          use_count?: number;
        };
        Relationships: [];
      };
      blocks: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          blocker_id?: string;
          blocked_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_id: string;
          reason: string;
          description: string | null;
          status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
          priority: 'normal' | 'high' | 'urgent';
          report_type: 'user' | 'message' | 'group' | null;
          target_message_id: string | null;
          target_group_id: string | null;
          admin_notes: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_id: string;
          reason: string;
          description?: string | null;
          status?: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
          priority?: 'normal' | 'high' | 'urgent';
          report_type?: 'user' | 'message' | 'group' | null;
          target_message_id?: string | null;
          target_group_id?: string | null;
          admin_notes?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          reported_id?: string;
          reason?: string;
          description?: string | null;
          status?: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
          priority?: 'normal' | 'high' | 'urgent';
          report_type?: 'user' | 'message' | 'group' | null;
          target_message_id?: string | null;
          target_group_id?: string | null;
          admin_notes?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      moderation_actions: {
        Row: {
          id: string;
          admin_id: string;
          target_id: string;
          report_id: string | null;
          action: 'warn' | 'suspend' | 'ban' | 'unban' | 'unsuspend';
          reason: string | null;
          duration: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          target_id: string;
          report_id?: string | null;
          action: 'warn' | 'suspend' | 'ban' | 'unban' | 'unsuspend';
          reason?: string | null;
          duration?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          target_id?: string;
          report_id?: string | null;
          action?: 'warn' | 'suspend' | 'ban' | 'unban' | 'unsuspend';
          reason?: string | null;
          duration?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      nearby_presence: {
        Row: {
          user_id: string;
          location: unknown; // PostGIS geography type
          fuzzed_location: unknown | null;
          radius_preference: number;
          is_active: boolean;
          last_updated_at: string;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          location: unknown;
          fuzzed_location?: unknown | null;
          radius_preference?: number;
          is_active?: boolean;
          last_updated_at?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          location?: unknown;
          fuzzed_location?: unknown | null;
          radius_preference?: number;
          is_active?: boolean;
          last_updated_at?: string;
          expires_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_zones: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          center: unknown; // PostGIS geography type
          radius_meters: number;
          join_code: string;
          organizer_id: string;
          is_active: boolean;
          starts_at: string | null;
          ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          center: unknown;
          radius_meters: number;
          join_code: string;
          organizer_id: string;
          is_active?: boolean;
          starts_at?: string | null;
          ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          center?: unknown;
          radius_meters?: number;
          join_code?: string;
          organizer_id?: string;
          is_active?: boolean;
          starts_at?: string | null;
          ends_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_zone_members: {
        Row: {
          id: string;
          zone_id: string;
          user_id: string;
          is_banned: boolean;
          joined_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          zone_id: string;
          user_id: string;
          is_banned?: boolean;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          zone_id?: string;
          user_id?: string;
          is_banned?: boolean;
          joined_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      predefined_interests: {
        Row: {
          id: string;
          name: string;
          icon: string | null;
          category: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          icon?: string | null;
          category?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          icon?: string | null;
          category?: string | null;
        };
        Relationships: [];
      };
      banned_identifiers: {
        Row: {
          id: string;
          user_id: string | null;
          ip_hash: string | null;
          device_hash: string | null;
          reason: string | null;
          banned_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          ip_hash?: string | null;
          device_hash?: string | null;
          reason?: string | null;
          banned_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          ip_hash?: string | null;
          device_hash?: string | null;
          reason?: string | null;
          banned_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          id: string;
          key: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      message_reactions: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          user_id?: string;
          emoji?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      public_profiles: {
        Row: {
          id: string;
          display_name: string;
          display_name_changed_at: string | null;
          avatar_url: string | null;
          gender: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | null;
          age_range: string;
          bio: string | null;
          interests: string[] | null;
          languages: string[] | null;
          area: { country?: string; state?: string; city?: string } | null;
          is_visible: boolean;
          is_online: boolean;
          last_seen_at: string | null;
          is_suspended: boolean;
          suspended_until: string | null;
          is_banned: boolean;
          role: 'user' | 'admin';
          created_at: string;
          updated_at: string;
          mood_status: string | null;
          mood_updated_at: string | null;
          read_receipts_visible: boolean;
        };
        Relationships: [];
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type PublicProfile = Omit<Profile, 'dob'> & {
  age_range: string;
};

export type ConnectionRequest = Database['public']['Tables']['connection_requests']['Row'];
export type ConnectionRequestInsert = Database['public']['Tables']['connection_requests']['Insert'];

export type Chat = Database['public']['Tables']['chats']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];

export type Call = Database['public']['Tables']['calls']['Row'];

export type Group = Database['public']['Tables']['groups']['Row'];
export type GroupInsert = Database['public']['Tables']['groups']['Insert'];
export type GroupMember = Database['public']['Tables']['group_members']['Row'];
export type GroupMessage = Database['public']['Tables']['group_messages']['Row'];
export type GroupInvite = Database['public']['Tables']['group_invites']['Row'];

export type Block = Database['public']['Tables']['blocks']['Row'];
export type Report = Database['public']['Tables']['reports']['Row'];
export type ReportInsert = Database['public']['Tables']['reports']['Insert'];

export type ModerationAction = Database['public']['Tables']['moderation_actions']['Row'];

export type NearbyPresence = Database['public']['Tables']['nearby_presence']['Row'];
export type EventZone = Database['public']['Tables']['event_zones']['Row'];
export type EventZoneMember = Database['public']['Tables']['event_zone_members']['Row'];

export type FilterPreset = Database['public']['Tables']['filter_presets']['Row'];
export type PredefinedInterest = Database['public']['Tables']['predefined_interests']['Row'];
export type BannedIdentifier = Database['public']['Tables']['banned_identifiers']['Row'];
export type RateLimit = Database['public']['Tables']['rate_limits']['Row'];
export type MessageReaction = Database['public']['Tables']['message_reactions']['Row'];
