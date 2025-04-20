import Stripe from "npm:stripe@12.0.0";

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
    const stripeSecretKey = "sk_test_51PoZUCBf2yTNcRUo1QV8kTiBasytVelePrLdEchzzQJp1odHA4FmL9RA0Aq24OM9CLT8k2CdrrQirwAphQsEgXe600U7I5pYg1";
    
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key is missing from environment variables.");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Parse the request body
    const { trip, vehicle, customer, extras, amount, discountCode } = await req.json();

    // Validate required fields
    if (!trip || !vehicle || !customer || !customer.email) {
      throw new Error("Missing required booking information");
    }

    // Validate email format - this is critical for Stripe
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.email)) {
      throw new Error("Invalid email address format");
    }

    console.log("Creating checkout session with data:", { 
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
      success_url: `${req.headers.get("origin")}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/booking-cancelled`,
      customer_email: customer.email,
      metadata: {
        trip_from: trip.from,
        trip_to: trip.to,
        trip_type: trip.type,
        trip_date: new Date(trip.date).toISOString(),
        trip_return_date: trip.returnDate ? new Date(trip.returnDate).toISOString() : "",
        trip_passengers: trip.passengers.toString(),
        vehicle_id: vehicle.id,
        vehicle_name: vehicle.name,
        customer_name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
        customer_phone: customer.phone || "",
        extras: extras.join(","),
        discount_code: discountCode || "",
      },
    });

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