import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, stateSlug, source } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const KIT_API_KEY = process.env.KIT_API_KEY;
    const KIT_FORM_ID = process.env.KIT_FORM_ID;

    if (!KIT_API_KEY || !KIT_FORM_ID) {
      // If Kit is not configured, log and return success for development
      console.log("Kit not configured. Subscriber:", {
        email,
        stateSlug,
        source,
      });
      return NextResponse.json({ success: true });
    }

    // Build tags array
    const tags: string[] = [];
    if (stateSlug) tags.push(`state-${stateSlug}`);
    if (source) tags.push(`source-${source}`);

    // Subscribe via Kit API v4
    const res = await fetch(
      `https://api.convertkit.com/v4/forms/${KIT_FORM_ID}/subscribers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${KIT_API_KEY}`,
        },
        body: JSON.stringify({
          email_address: email,
          tags,
        }),
      }
    );

    if (!res.ok) {
      const errorData = await res.text();
      console.error("Kit API error:", errorData);
      return NextResponse.json(
        { error: "Failed to subscribe" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
