type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          role: string | null
          password_hash: string
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          role?: string | null
          password_hash: string
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          role?: string | null
          password_hash?: string
          created_at?: string | null
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          two_fa_enabled: boolean | null
        }
        Insert: {
          id?: string
          user_id?: string
          two_fa_enabled?: boolean | null
        }
        Update: {
          id?: string
          user_id?: string
          two_fa_enabled?: boolean | null
        }
      }
      email_verifications: {
        Row: {
          id: string
          user_id: string | null
          token: string
          created_at: string | null
          expires_at: string
          verified: boolean | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          token: string
          created_at?: string | null
          expires_at: string
          verified?: boolean | null
        }
        Update: {
          id?: string
          user_id?: string | null
          token?: string
          created_at?: string | null
          expires_at?: string
          verified?: boolean | null
        }
      }
      trips: {
        Row: {
          id: string
          user_id: string | null
          driver_id: string | null
          pickup_zone_id: string | null
          dropoff_zone_id: string | null
          estimated_distance_km: number | null
          estimated_duration_min: number | null
          estimated_price: number | null
          surge_multiplier: number | null
          promo_id: string | null
          promo_discount: number | null
          status: string | null
          datetime: string
          scheduled_for: string | null
          is_scheduled: boolean | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          driver_id?: string | null
          pickup_zone_id?: string | null
          dropoff_zone_id?: string | null
          estimated_distance_km?: number | null
          estimated_duration_min?: number | null
          estimated_price?: number | null
          surge_multiplier?: number | null
          promo_id?: string | null
          promo_discount?: number | null
          status?: string | null
          datetime: string
          scheduled_for?: string | null
          is_scheduled?: boolean | null
        }
        Update: {
          id?: string
          user_id?: string | null
          driver_id?: string | null
          pickup_zone_id?: string | null
          dropoff_zone_id?: string | null
          estimated_distance_km?: number | null
          estimated_duration_min?: number | null
          estimated_price?: number | null
          surge_multiplier?: number | null
          promo_id?: string | null
          promo_discount?: number | null
          status?: string | null
          datetime?: string
          scheduled_for?: string | null
          is_scheduled?: boolean | null
        }
      }
      payments: {
        Row: {
          id: string
          trip_id: string | null
          user_id: string | null
          amount: number
          payment_method: string
          status: string | null
          paid_at: string | null
        }
        Insert: {
          id?: string
          trip_id?: string | null
          user_id?: string | null
          amount: number
          payment_method: string
          status?: string | null
          paid_at?: string | null
        }
        Update: {
          id?: string
          trip_id?: string | null
          user_id?: string | null
          amount?: number
          payment_method?: string
          status?: string | null
          paid_at?: string | null
        }
      }
    }
    Enums: {
      user_role: "admin" | "customer" | "partner" | "support"
      booking_status: "booked" | "completed" | "cancelled"
      payment_status: "pending" | "completed" | "failed"
      payment_method: "credit_card" | "paypal" | "cash"
      ticket_status: "open" | "closed" | "in_progress"
      trip_status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled"
      document_type: "license" | "insurance" | "registration" | "other"
      discount_type: "percent" | "fixed"
    }
  }
}