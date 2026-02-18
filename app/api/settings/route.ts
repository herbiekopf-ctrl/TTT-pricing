import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    keysConfigured: {
      google: Boolean(process.env.GOOGLE_PLACES_API_KEY),
      yelp: Boolean(process.env.YELP_API_KEY)
    },
    toggles: {
      enableGoogle: process.env.ENABLE_GOOGLE ?? "false",
      enableYelp: process.env.ENABLE_YELP ?? "false",
      enableScraping: process.env.ENABLE_SCRAPING ?? "false",
      enableDelivery: process.env.ENABLE_DELIVERY ?? "false"
    }
  });
}
