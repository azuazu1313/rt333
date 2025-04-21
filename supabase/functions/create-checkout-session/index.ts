import Stripe from "npm:stripe@12.0.0";
import { createClient } from "npm:@supabase/supabase-js@2.41.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Get the Stripe secret key from environment variables
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || 
      "sk_test_51PoZUCBf2yTNcRUo1QV8kTiBasytVelePrLdEchzzQJp1odHA4FmL9RA0Aq24OM9CLT8k2CdrrQirwAphQsEgXe600U7I5pYg1";
    
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key is missing from environment variables.");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://phcqdnzuicgmlhkmnpxc.supabase.co";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "PLACEHOLDER_SERVICE_ROLE_KEY";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the request body
    const { booking_reference, trip, vehicle, customer, extras, amount, discountCode } = await req.json();

    // Validate required fields
    if (!trip || !vehicle || !customer || !customer.email || !booking_reference) {
      throw new Error("Missing required booking information");
    }

    // Validate email format - this is critical for Stripe
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.email)) {
      throw new Error("Invalid email address format");
    }

    console.log("Creating checkout session with data:", { 
      booking_reference,
      trip, 
      vehicle: vehicle.name, 
      customerEmail: customer.email,
      amount 
    });

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${vehicle.name} - ${trip.from} to ${trip.to}`,
              description: `${trip.type} transfer on ${new Date(trip.date).toLocaleDateString()} for ${trip.passengers} passenger(s)`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents and ensure it's an integer
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/booking-success?reference=${booking_reference}`,
      cancel_url: `${req.headers.get("origin")}/booking-cancelled`,
      customer_email: customer.email,
      metadata: {
        booking_reference: booking_reference,
        trip_from: trip.from,
        trip_to: trip.to,
        trip_type: trip.type,
        trip_date: new Date(trip.date).toISOString(),
        trip_return_date: trip.returnDate ? new Date(trip.returnDate).toISOString() : "",
        trip_passengers: String(trip.passengers),
        vehicle_id: vehicle.id,
        vehicle_name: vehicle.name,
        customer_name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
        customer_phone: customer.phone || "",
        extras: extras.join(","),
        discount_code: discountCode || "",
      },
    });

    // When payment is successful via Stripe, insert the trip into the database
    // Prepare trip data for database insertion
    const tripData = {
      user_id: customer.user_id || null,
      booking_reference: booking_reference,
      pickup_address: trip.from,
      dropoff_address: trip.to,
      estimated_distance_km: 0, // Will be calculated by admin
      estimated_duration_min: 0, // Will be calculated by admin
      estimated_price: amount,
      datetime: trip.date || new Date().toISOString(),
      is_scheduled: true,
      status: 'pending', // Initially pending until assigned
      vehicle_type: vehicle.name || '',
      passengers: trip.passengers || 1,
      customer_name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
      customer_email: customer.email,
      customer_phone: customer.phone || '',
      is_return: trip.type === 'round-trip',
      return_datetime: trip.returnDate || null,
      extra_items: extras.join(','),
      payment_method: 'card', // Since this is Stripe checkout
      notes: ''
    };

    // If there's no user_id provided but we have an email, try to find a matching user
    if (!tripData.user_id && tripData.customer_email) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', tripData.customer_email)
        .single();
      
      if (existingUser?.id) {
        console.log('Found existing user with matching email:', existingUser.id);
        tripData.user_id = existingUser.id;
      }
    }

    // Insert the trip record when Stripe session is created
    // This will be updated later when payment completes via webhook
    const { data, error } = await supabase
      .from('trips')
      .insert([tripData]);

    if (error) {
      console.error('Error creating trip record:', error);
      // Continue with checkout even if trip record fails - we'll handle this via webhook
    }

    // Return the session URL
    return new Response(
      JSON.stringify({ sessionUrl: session.url }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});