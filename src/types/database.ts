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
          name: string
          email: string
          phone: string | null
          role: 'admin' | 'customer' | 'driver' | 'support'
          password_hash: string
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          role?: 'admin' | 'customer' | 'driver' | 'support'
          password_hash: string
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          role?: 'admin' | 'customer' | 'driver' | 'support'
          password_hash?: string
          created_at?: string | null
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          two_fa_enabled: boolean
        }
        Insert: {
          id?: string
          user_id: string
          two_fa_enabled?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          two_fa_enabled?: boolean
        }
      }
      // Add other table types as needed for your application
    }
  }
}