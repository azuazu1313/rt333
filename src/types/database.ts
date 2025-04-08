export type Json =
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
          email: string
          role: 'admin' | 'customer' | 'partner' | 'support'
          created_at: string | null
        }
        Insert: {
          id: string
          email: string
          role?: 'admin' | 'customer' | 'partner' | 'support'
          created_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          role?: 'admin' | 'customer' | 'partner' | 'support'
          created_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          first_name: string
          last_name: string
          phone: string | null
          profile_pic: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          first_name: string
          last_name: string
          phone?: string | null
          profile_pic?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          first_name?: string
          last_name?: string
          phone?: string | null
          profile_pic?: string | null
          created_at?: string | null
        }
      }
      vehicles: {
        Row: {
          id: string
          model: string
          license_plate: string
          capacity: number
          availability: boolean
          rate_per_km: number
          owner_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          model: string
          license_plate: string
          capacity: number
          availability?: boolean
          rate_per_km: number
          owner_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          model?: string
          license_plate?: string
          capacity?: number
          availability?: boolean
          rate_per_km?: number
          owner_id?: string | null
          created_at?: string | null
        }
      }
      bookings: {
        Row: {
          id: string
          user_id: string
          vehicle_id: string
          pickup_location: string
          dropoff_location: string
          pickup_time: string
          status: 'booked' | 'completed' | 'cancelled' 
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          vehicle_id: string
          pickup_location: string
          dropoff_location: string
          pickup_time: string
          status?: 'booked' | 'completed' | 'cancelled'
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          vehicle_id?: string
          pickup_location?: string
          dropoff_location?: string
          pickup_time?: string
          status?: 'booked' | 'completed' | 'cancelled'
          created_at?: string | null
        }
      }
      payments: {
        Row: {
          id: string
          booking_id: string
          amount: number
          status: 'pending' | 'completed' | 'failed'
          payment_method: 'credit_card' | 'paypal' | 'cash'
          created_at: string | null
        }
        Insert: {
          id?: string
          booking_id: string
          amount: number
          status?: 'pending' | 'completed' | 'failed'
          payment_method: 'credit_card' | 'paypal' | 'cash'
          created_at?: string | null
        }
        Update: {
          id?: string
          booking_id?: string
          amount?: number
          status?: 'pending' | 'completed' | 'failed'
          payment_method?: 'credit_card' | 'paypal' | 'cash'
          created_at?: string | null
        }
      }
      support_tickets: {
        Row: {
          id: string
          user_id: string
          subject: string
          description: string
          status: 'open' | 'closed' | 'in_progress'
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          subject: string
          description: string
          status?: 'open' | 'closed' | 'in_progress'
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          subject?: string
          description?: string
          status?: 'open' | 'closed' | 'in_progress'
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
  }
}