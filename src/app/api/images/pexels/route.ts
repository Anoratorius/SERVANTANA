import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city");

  if (!city) {
    return NextResponse.json({ error: "City required" }, { status: 400 });
  }

  const apiKey = process.env.PEXELS_API_KEY;

  // If no API key, return null (fallback to other sources)
  if (!apiKey) {
    return NextResponse.json({ imageUrl: null });
  }

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(city + " city skyline")}&per_page=5&orientation=landscape`,
      {
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ imageUrl: null });
    }

    const data = await response.json();
    const photos = data.photos || [];

    // Pick a random photo from results
    if (photos.length > 0) {
      const randomIndex = Math.floor(Math.random() * photos.length);
      const photo = photos[randomIndex];
      const imageUrl = photo.src?.large2x || photo.src?.large || photo.src?.original;
      return NextResponse.json({ imageUrl });
    }

    return NextResponse.json({ imageUrl: null });
  } catch {
    return NextResponse.json({ imageUrl: null });
  }
}
