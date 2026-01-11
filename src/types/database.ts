export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'super_admin' | 'admin' | 'client'
          client_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role: 'super_admin' | 'admin' | 'client'
          client_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'super_admin' | 'admin' | 'client'
          client_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          contact_name: string | null
          contact_email: string | null
          avatar_url: string | null
          avatar_color: string | null
          growth_stage: 'seed' | 'sprout' | 'bloom' | 'harvest' | null
          status: 'active' | 'paused' | 'churned' | 'prospect'
          monthly_spend: number
          start_date: string | null
          highlevel_id: string | null
          basecamp_id: string | null
          stripe_customer_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          contact_name?: string | null
          contact_email?: string | null
          avatar_url?: string | null
          avatar_color?: string | null
          growth_stage?: 'seed' | 'sprout' | 'bloom' | 'harvest' | null
          status?: 'active' | 'paused' | 'churned' | 'prospect'
          monthly_spend?: number
          start_date?: string | null
          highlevel_id?: string | null
          basecamp_id?: string | null
          stripe_customer_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact_name?: string | null
          contact_email?: string | null
          avatar_url?: string | null
          avatar_color?: string | null
          growth_stage?: 'seed' | 'sprout' | 'bloom' | 'harvest' | null
          status?: 'active' | 'paused' | 'churned' | 'prospect'
          monthly_spend?: number
          start_date?: string | null
          highlevel_id?: string | null
          basecamp_id?: string | null
          stripe_customer_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          short_description: string | null
          long_description: string | null
          category: 'root' | 'growth' | 'cultivation'
          monthly_price: number | null
          onetime_price: number | null
          stripe_product_id: string | null
          stripe_monthly_price_id: string | null
          stripe_onetime_price_id: string | null
          supports_quantity: boolean
          status: 'active' | 'draft' | 'inactive'
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          short_description?: string | null
          long_description?: string | null
          category: 'root' | 'growth' | 'cultivation'
          monthly_price?: number | null
          onetime_price?: number | null
          stripe_product_id?: string | null
          stripe_monthly_price_id?: string | null
          stripe_onetime_price_id?: string | null
          supports_quantity?: boolean
          status?: 'active' | 'draft' | 'inactive'
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          short_description?: string | null
          long_description?: string | null
          category?: 'root' | 'growth' | 'cultivation'
          monthly_price?: number | null
          onetime_price?: number | null
          stripe_product_id?: string | null
          stripe_monthly_price_id?: string | null
          stripe_onetime_price_id?: string | null
          supports_quantity?: boolean
          status?: 'active' | 'draft' | 'inactive'
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      bundles: {
        Row: {
          id: string
          name: string
          description: string | null
          monthly_price: number | null
          onetime_price: number | null
          stripe_product_id: string | null
          stripe_price_id: string | null
          status: 'active' | 'draft' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          monthly_price?: number | null
          onetime_price?: number | null
          stripe_product_id?: string | null
          stripe_price_id?: string | null
          status?: 'active' | 'draft' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          monthly_price?: number | null
          onetime_price?: number | null
          stripe_product_id?: string | null
          stripe_price_id?: string | null
          status?: 'active' | 'draft' | 'inactive'
          created_at?: string
          updated_at?: string
        }
      }
      addons: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          stripe_product_id: string | null
          stripe_price_id: string | null
          status: 'active' | 'draft' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          stripe_product_id?: string | null
          stripe_price_id?: string | null
          status?: 'active' | 'draft' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          stripe_product_id?: string | null
          stripe_price_id?: string | null
          status?: 'active' | 'draft' | 'inactive'
          created_at?: string
          updated_at?: string
        }
      }
      reward_tiers: {
        Row: {
          id: string
          name: string
          monthly_threshold: number
          discount_percentage: number
          coupon_code: string | null
          free_product_slots: number
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          monthly_threshold: number
          discount_percentage?: number
          coupon_code?: string | null
          free_product_slots?: number
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          monthly_threshold?: number
          discount_percentage?: number
          coupon_code?: string | null
          free_product_slots?: number
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      recommendations: {
        Row: {
          id: string
          client_id: string
          created_by: string | null
          status: 'draft' | 'sent' | 'accepted' | 'declined'
          pricing_type: 'good' | 'better' | 'best' | null  // Tier name stored during recommendation creation
          total_monthly: number | null
          total_onetime: number | null
          discount_applied: number
          reward_tier_id: string | null
          notes: string | null
          sent_at: string | null
          responded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          created_by?: string | null
          status?: 'draft' | 'sent' | 'accepted' | 'declined'
          pricing_type?: 'good' | 'better' | 'best' | null
          total_monthly?: number | null
          total_onetime?: number | null
          discount_applied?: number
          reward_tier_id?: string | null
          notes?: string | null
          sent_at?: string | null
          responded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          created_by?: string | null
          status?: 'draft' | 'sent' | 'accepted' | 'declined'
          pricing_type?: 'good' | 'better' | 'best' | null
          total_monthly?: number | null
          total_onetime?: number | null
          discount_applied?: number
          reward_tier_id?: string | null
          notes?: string | null
          sent_at?: string | null
          responded_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      content: {
        Row: {
          id: string
          client_id: string
          title: string
          content_type: 'blog' | 'social' | 'email' | 'landing_page' | 'other' | null
          body: string | null
          status: 'draft' | 'pending_review' | 'revision_requested' | 'approved' | 'published' | 'rejected'
          author_id: string | null
          assigned_to: string | null
          due_date: string | null
          published_at: string | null
          basecamp_todo_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          title: string
          content_type?: 'blog' | 'social' | 'email' | 'landing_page' | 'other' | null
          body?: string | null
          status?: 'draft' | 'pending_review' | 'revision_requested' | 'approved' | 'published' | 'rejected'
          author_id?: string | null
          assigned_to?: string | null
          due_date?: string | null
          published_at?: string | null
          basecamp_todo_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          title?: string
          content_type?: 'blog' | 'social' | 'email' | 'landing_page' | 'other' | null
          body?: string | null
          status?: 'draft' | 'pending_review' | 'revision_requested' | 'approved' | 'published' | 'rejected'
          author_id?: string | null
          assigned_to?: string | null
          due_date?: string | null
          published_at?: string | null
          basecamp_todo_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string | null
          type: 'info' | 'success' | 'warning' | 'error' | null
          link: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message?: string | null
          type?: 'info' | 'success' | 'warning' | 'error' | null
          link?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string | null
          type?: 'info' | 'success' | 'warning' | 'error' | null
          link?: string | null
          read_at?: string | null
          created_at?: string
        }
      }
      activity_log: {
        Row: {
          id: string
          client_id: string | null
          user_id: string | null
          activity_type: string
          description: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          user_id?: string | null
          activity_type: string
          description?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string | null
          user_id?: string | null
          activity_type?: string
          description?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          client_id: string
          recommendation_id: string | null
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          status: 'active' | 'past_due' | 'canceled' | 'paused' | 'incomplete' | null
          current_period_start: string | null
          current_period_end: string | null
          monthly_amount: number | null
          canceled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          recommendation_id?: string | null
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          status?: 'active' | 'past_due' | 'canceled' | 'paused' | 'incomplete' | null
          current_period_start?: string | null
          current_period_end?: string | null
          monthly_amount?: number | null
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          recommendation_id?: string | null
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          status?: 'active' | 'past_due' | 'canceled' | 'paused' | 'incomplete' | null
          current_period_start?: string | null
          current_period_end?: string | null
          monthly_amount?: number | null
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      revenue_records: {
        Row: {
          id: string
          client_id: string
          month: string
          mrr: number
          arr: number | null
          change_type: string | null
          change_amount: number | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          month: string
          mrr: number
          arr?: number | null
          change_type?: string | null
          change_amount?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          month?: string
          mrr?: number
          arr?: number | null
          change_type?: string | null
          change_amount?: number | null
          created_at?: string
        }
      }
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Convenience types
export type Profile = Tables<'profiles'>
export type Client = Tables<'clients'>
export type Product = Tables<'products'>
export type Bundle = Tables<'bundles'>
export type Addon = Tables<'addons'>
export type RewardTier = Tables<'reward_tiers'>
export type Recommendation = Tables<'recommendations'>
export type Content = Tables<'content'>
export type Notification = Tables<'notifications'>
export type ActivityLog = Tables<'activity_log'>
export type Subscription = Tables<'subscriptions'>
export type RevenueRecord = Tables<'revenue_records'>
