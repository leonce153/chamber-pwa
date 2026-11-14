export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_analytics: {
        Row: {
          android_installs: number | null
          app_id: string
          created_at: string
          date: string
          id: string
          installs: number | null
          ios_installs: number | null
          visits: number | null
        }
        Insert: {
          android_installs?: number | null
          app_id: string
          created_at?: string
          date?: string
          id?: string
          installs?: number | null
          ios_installs?: number | null
          visits?: number | null
        }
        Update: {
          android_installs?: number | null
          app_id?: string
          created_at?: string
          date?: string
          id?: string
          installs?: number | null
          ios_installs?: number | null
          visits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "app_analytics_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_collaborators: {
        Row: {
          app_id: string
          assigned_by: string | null
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_id?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_collaborators_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_features: {
        Row: {
          app_id: string
          created_at: string
          feature_type: string
          icon: string | null
          id: string
          is_enabled: boolean | null
          name: string
          position: number | null
          settings: Json | null
          updated_at: string
        }
        Insert: {
          app_id: string
          created_at?: string
          feature_type: string
          icon?: string | null
          id?: string
          is_enabled?: boolean | null
          name: string
          position?: number | null
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          app_id?: string
          created_at?: string
          feature_type?: string
          icon?: string | null
          id?: string
          is_enabled?: boolean | null
          name?: string
          position?: number | null
          settings?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_features_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          app_name: string
          background_color: string | null
          base_portal_url: string | null
          contact_email: string | null
          created_at: string
          custom_domain: string | null
          description: string | null
          display_mode: string | null
          embed_portal_pages: boolean
          font_family: string | null
          homepage_image_url: string | null
          icon_url: string | null
          id: string
          legacy_app_id: string | null
          logo_url: string | null
          orientation: string | null
          primary_color: string | null
          privacy_policy_url: string | null
          secondary_color: string | null
          short_name: string
          splash_image_url: string | null
          start_url: string | null
          status: string
          subdomain: string | null
          support_url: string | null
          tagline: string | null
          terms_url: string | null
          text_color: string | null
          theme_color: string | null
          theme_mode: string | null
          total_subscribers: number | null
          total_visits: number | null
          updated_at: string
          weather_enabled: boolean
        }
        Insert: {
          app_name?: string
          background_color?: string | null
          base_portal_url?: string | null
          contact_email?: string | null
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          display_mode?: string | null
          embed_portal_pages?: boolean
          font_family?: string | null
          homepage_image_url?: string | null
          icon_url?: string | null
          id?: string
          legacy_app_id?: string | null
          logo_url?: string | null
          orientation?: string | null
          primary_color?: string | null
          privacy_policy_url?: string | null
          secondary_color?: string | null
          short_name?: string
          splash_image_url?: string | null
          start_url?: string | null
          status?: string
          subdomain?: string | null
          support_url?: string | null
          tagline?: string | null
          terms_url?: string | null
          text_color?: string | null
          theme_color?: string | null
          theme_mode?: string | null
          total_subscribers?: number | null
          total_visits?: number | null
          updated_at?: string
          weather_enabled?: boolean
        }
        Update: {
          app_name?: string
          background_color?: string | null
          base_portal_url?: string | null
          contact_email?: string | null
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          display_mode?: string | null
          embed_portal_pages?: boolean
          font_family?: string | null
          homepage_image_url?: string | null
          icon_url?: string | null
          id?: string
          legacy_app_id?: string | null
          logo_url?: string | null
          orientation?: string | null
          primary_color?: string | null
          privacy_policy_url?: string | null
          secondary_color?: string | null
          short_name?: string
          splash_image_url?: string | null
          start_url?: string | null
          status?: string
          subdomain?: string | null
          support_url?: string | null
          tagline?: string | null
          terms_url?: string | null
          text_color?: string | null
          theme_color?: string | null
          theme_mode?: string | null
          total_subscribers?: number | null
          total_visits?: number | null
          updated_at?: string
          weather_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_legacy_app_id_fkey"
            columns: ["legacy_app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          app_id: string
          created_at: string
          device_id: string | null
          id: string
          last_visit: string | null
          platform: string | null
          push_enabled: boolean | null
          push_token: string | null
        }
        Insert: {
          app_id: string
          created_at?: string
          device_id?: string | null
          id?: string
          last_visit?: string | null
          platform?: string | null
          push_enabled?: boolean | null
          push_token?: string | null
        }
        Update: {
          app_id?: string
          created_at?: string
          device_id?: string | null
          id?: string
          last_visit?: string | null
          platform?: string | null
          push_enabled?: boolean | null
          push_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_users_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      apps: {
        Row: {
          access_allowed_domains: string[] | null
          access_password: string | null
          access_type: string | null
          background_color: string | null
          created_at: string
          description: string | null
          email_reply_to: string | null
          email_sender_name: string | null
          email_welcome_body: string | null
          email_welcome_enabled: boolean | null
          email_welcome_subject: string | null
          font_family: string | null
          homepage_image_url: string | null
          icon_titles_visible: boolean | null
          icon_url: string | null
          id: string
          layout_style: string | null
          name: string
          orientation: string | null
          overlay_color: string | null
          slug: string
          smtp_enabled: boolean | null
          smtp_encryption: string | null
          smtp_from_email: string | null
          smtp_from_name: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_username: string | null
          splash_image_url: string | null
          status: string
          subdomain: string | null
          text_color: string | null
          theme_color: string | null
          total_installs: number | null
          total_visits: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_allowed_domains?: string[] | null
          access_password?: string | null
          access_type?: string | null
          background_color?: string | null
          created_at?: string
          description?: string | null
          email_reply_to?: string | null
          email_sender_name?: string | null
          email_welcome_body?: string | null
          email_welcome_enabled?: boolean | null
          email_welcome_subject?: string | null
          font_family?: string | null
          homepage_image_url?: string | null
          icon_titles_visible?: boolean | null
          icon_url?: string | null
          id?: string
          layout_style?: string | null
          name: string
          orientation?: string | null
          overlay_color?: string | null
          slug: string
          smtp_enabled?: boolean | null
          smtp_encryption?: string | null
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          splash_image_url?: string | null
          status?: string
          subdomain?: string | null
          text_color?: string | null
          theme_color?: string | null
          total_installs?: number | null
          total_visits?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_allowed_domains?: string[] | null
          access_password?: string | null
          access_type?: string | null
          background_color?: string | null
          created_at?: string
          description?: string | null
          email_reply_to?: string | null
          email_sender_name?: string | null
          email_welcome_body?: string | null
          email_welcome_enabled?: boolean | null
          email_welcome_subject?: string | null
          font_family?: string | null
          homepage_image_url?: string | null
          icon_titles_visible?: boolean | null
          icon_url?: string | null
          id?: string
          layout_style?: string | null
          name?: string
          orientation?: string | null
          overlay_color?: string | null
          slug?: string
          smtp_enabled?: boolean | null
          smtp_encryption?: string | null
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          splash_image_url?: string | null
          status?: string
          subdomain?: string | null
          text_color?: string | null
          theme_color?: string | null
          total_installs?: number | null
          total_visits?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_custom_pages: {
        Row: {
          content: string | null
          created_at: string
          feature_id: string
          header_image_url: string | null
          id: string
          page_type: string | null
          show_header: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          feature_id: string
          header_image_url?: string | null
          id?: string
          page_type?: string | null
          show_header?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          feature_id?: string
          header_image_url?: string | null
          id?: string
          page_type?: string | null
          show_header?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_custom_pages_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "app_features"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_links: {
        Row: {
          allow_downloads: boolean | null
          created_at: string
          custom_headers: string | null
          custom_user_agent: string | null
          enable_pull_refresh: boolean | null
          feature_id: string
          icon_url: string | null
          id: string
          inject_cookies: string | null
          open_mode: string | null
          position: number | null
          remember_session: boolean | null
          show_progress_bar: boolean | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          allow_downloads?: boolean | null
          created_at?: string
          custom_headers?: string | null
          custom_user_agent?: string | null
          enable_pull_refresh?: boolean | null
          feature_id: string
          icon_url?: string | null
          id?: string
          inject_cookies?: string | null
          open_mode?: string | null
          position?: number | null
          remember_session?: boolean | null
          show_progress_bar?: boolean | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          allow_downloads?: boolean | null
          created_at?: string
          custom_headers?: string | null
          custom_user_agent?: string | null
          enable_pull_refresh?: boolean | null
          feature_id?: string
          icon_url?: string | null
          id?: string
          inject_cookies?: string | null
          open_mode?: string | null
          position?: number | null
          remember_session?: boolean | null
          show_progress_bar?: boolean | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_links_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "app_features"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_rss_feeds: {
        Row: {
          created_at: string
          excerpt_length: number | null
          feature_id: string
          feed_url: string
          id: string
          max_items: number | null
          position: number | null
          show_author: boolean | null
          show_date: boolean | null
          show_images: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          excerpt_length?: number | null
          feature_id: string
          feed_url: string
          id?: string
          max_items?: number | null
          position?: number | null
          show_author?: boolean | null
          show_date?: boolean | null
          show_images?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          excerpt_length?: number | null
          feature_id?: string
          feed_url?: string
          id?: string
          max_items?: number | null
          position?: number | null
          show_author?: boolean | null
          show_date?: boolean | null
          show_images?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_rss_feeds_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "app_features"
            referencedColumns: ["id"]
          },
        ]
      }
      home_banner_slides: {
        Row: {
          alt_text: string
          alt_text_es: string | null
          created_at: string
          end_at: string | null
          id: string
          image_url: string
          image_url_es: string | null
          is_visible: boolean
          link_type: string | null
          link_value: string | null
          open_mode: string
          position: number
          section_id: string
          sponsor_name: string | null
          start_at: string | null
          tap_count: number
          updated_at: string
          updated_by: string | null
          updated_by_name: string | null
          view_count: number
        }
        Insert: {
          alt_text: string
          alt_text_es?: string | null
          created_at?: string
          end_at?: string | null
          id?: string
          image_url: string
          image_url_es?: string | null
          is_visible?: boolean
          link_type?: string | null
          link_value?: string | null
          open_mode?: string
          position?: number
          section_id: string
          sponsor_name?: string | null
          start_at?: string | null
          tap_count?: number
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
          view_count?: number
        }
        Update: {
          alt_text?: string
          alt_text_es?: string | null
          created_at?: string
          end_at?: string | null
          id?: string
          image_url?: string
          image_url_es?: string | null
          is_visible?: boolean
          link_type?: string | null
          link_value?: string | null
          open_mode?: string
          position?: number
          section_id?: string
          sponsor_name?: string | null
          start_at?: string | null
          tap_count?: number
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "home_banner_slides_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "home_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_banner_slides_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      home_gallery_photos: {
        Row: {
          alt_text: string
          alt_text_es: string | null
          caption: string | null
          caption_es: string | null
          created_at: string
          id: string
          image_url: string
          is_visible: boolean
          position: number
          section_id: string
          updated_at: string
          updated_by: string | null
          updated_by_name: string | null
        }
        Insert: {
          alt_text?: string
          alt_text_es?: string | null
          caption?: string | null
          caption_es?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_visible?: boolean
          position?: number
          section_id: string
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Update: {
          alt_text?: string
          alt_text_es?: string | null
          caption?: string | null
          caption_es?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_visible?: boolean
          position?: number
          section_id?: string
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "home_gallery_photos_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "home_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_gallery_photos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      home_image_cleanup: {
        Row: {
          delete_after: string
          id: string
          image_url: string | null
          replaced_at: string
          replaced_by: string | null
          replaced_by_name: string | null
          storage_path: string
          used_in: string | null
        }
        Insert: {
          delete_after?: string
          id?: string
          image_url?: string | null
          replaced_at?: string
          replaced_by?: string | null
          replaced_by_name?: string | null
          storage_path: string
          used_in?: string | null
        }
        Update: {
          delete_after?: string
          id?: string
          image_url?: string | null
          replaced_at?: string
          replaced_by?: string | null
          replaced_by_name?: string | null
          storage_path?: string
          used_in?: string | null
        }
        Relationships: []
      }
      home_section_items: {
        Row: {
          color: string
          created_at: string
          hint: string | null
          hint_es: string | null
          icon: string
          id: string
          is_visible: boolean
          label: string
          label_es: string | null
          link_type: string
          link_value: string
          open_mode: string
          position: number
          section_id: string
          updated_at: string
          updated_by: string | null
          updated_by_name: string | null
          viewer_title: string | null
          viewer_title_es: string | null
        }
        Insert: {
          color: string
          created_at?: string
          hint?: string | null
          hint_es?: string | null
          icon: string
          id?: string
          is_visible?: boolean
          label: string
          label_es?: string | null
          link_type: string
          link_value: string
          open_mode?: string
          position?: number
          section_id: string
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
          viewer_title?: string | null
          viewer_title_es?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          hint?: string | null
          hint_es?: string | null
          icon?: string
          id?: string
          is_visible?: boolean
          label?: string
          label_es?: string | null
          link_type?: string
          link_value?: string
          open_mode?: string
          position?: number
          section_id?: string
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
          viewer_title?: string | null
          viewer_title_es?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "home_section_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "home_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_section_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      home_sections: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          position: number
          settings: Json
          title: string | null
          title_es: string | null
          type: string
          updated_at: string
          updated_by: string | null
          updated_by_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          position?: number
          settings?: Json
          title?: string | null
          title_es?: string | null
          type: string
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          position?: number
          settings?: Json
          title?: string | null
          title_es?: string | null
          type?: string
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "home_sections_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_topics: {
        Row: {
          id: string
          name: string
          name_es: string | null
          description: string | null
          description_es: string | null
          tag: string
          position: number
          is_visible: boolean
          default_on: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          name_es?: string | null
          description?: string | null
          description_es?: string | null
          tag: string
          position?: number
          is_visible?: boolean
          default_on?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_es?: string | null
          description?: string | null
          description_es?: string | null
          tag?: string
          position?: number
          is_visible?: boolean
          default_on?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_owner: boolean | null
          is_super_admin: boolean | null
          role: string
          push_topic_ids: string[] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_owner?: boolean | null
          is_super_admin?: boolean | null
          role?: string
          push_topic_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_owner?: boolean | null
          is_super_admin?: boolean | null
          role?: string
          push_topic_ids?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      push_notifications: {
        Row: {
          app_id: string
          body: string
          created_at: string
          gravitec_push_id: string | null
          icon_url: string | null
          id: string
          recipients_count: number | null
          sent_at: string | null
          status: string | null
          title: string
          topic_ids: string[] | null
          sent_by: string | null
          sent_by_name: string | null
          url: string | null
        }
        Insert: {
          app_id: string
          body: string
          created_at?: string
          gravitec_push_id?: string | null
          icon_url?: string | null
          id?: string
          recipients_count?: number | null
          sent_at?: string | null
          status?: string | null
          title: string
          topic_ids?: string[] | null
          sent_by?: string | null
          sent_by_name?: string | null
          url?: string | null
        }
        Update: {
          app_id?: string
          body?: string
          created_at?: string
          gravitec_push_id?: string | null
          icon_url?: string | null
          id?: string
          recipients_count?: number | null
          sent_at?: string | null
          status?: string | null
          title?: string
          topic_ids?: string[] | null
          sent_by?: string | null
          sent_by_name?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_notifications_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_collaborators: { Args: { _app_id: string }; Returns: boolean }
      get_app_by_subdomain: {
        Args: { _subdomain: string }
        Returns: {
          background_color: string
          description: string
          font_family: string
          homepage_image_url: string
          icon_titles_visible: boolean
          id: string
          layout_style: string
          name: string
          slug: string
          status: string
          subdomain: string
          text_color: string
          theme_color: string
        }[]
      }
      get_app_id: { Args: never; Returns: string }
      has_app_access: { Args: { _app_id: string }; Returns: boolean }
      has_team_role: { Args: { _roles: string[] }; Returns: boolean }
      increment_banner_tap: { Args: { slide_id: string }; Returns: number }
      increment_banner_views: { Args: { slide_ids: string[] }; Returns: number }
      is_owner: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_team_member: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
