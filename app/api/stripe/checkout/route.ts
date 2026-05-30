import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSession } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { User } from "@/lib/db/models";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 }
    );
  }

  await connectDb();
  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user._id.toString() },
    });
    customerId = customer.id;
    user.stripeCustomerId = customerId;
    await user.save();
  }

  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: "Price not configured" }, { status: 503 });
  }

  const checkout = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.AUTH_URL}/settings?upgraded=1`,
    cancel_url: `${process.env.AUTH_URL}/pricing`,
    metadata: { userId: user._id.toString() },
  });

  return NextResponse.json({ url: checkout.url });
}
