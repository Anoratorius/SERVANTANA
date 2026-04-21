import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { UserEventType, EventCategory } from "@prisma/client";
import { headers } from "next/headers";

// Track a single event
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const headersList = await headers();
    const body = await request.json();

    // Get IP and user agent from headers
    const forwardedFor = headersList.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || headersList.get("x-real-ip") || "unknown";
    const userAgent = headersList.get("user-agent") || undefined;

    const {
      eventType,
      eventCategory,
      eventAction,
      eventLabel,
      eventValue,
      pageUrl,
      pageTitle,
      pagePath,
      referrerUrl,
      componentId,
      targetId,
      targetType,
      searchQuery,
      searchFilters,
      sessionId,
      deviceType,
      deviceModel,
      browser,
      browserVersion,
      os,
      osVersion,
      screenWidth,
      screenHeight,
      timezone,
      language,
      timeOnPage,
      scrollDepth,
      funnelId,
      funnelStep,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
    } = body;

    // Validate event type
    if (!eventType || !Object.values(UserEventType).includes(eventType)) {
      return NextResponse.json(
        { error: "Invalid event type" },
        { status: 400 }
      );
    }

    // Validate category
    if (!eventCategory || !Object.values(EventCategory).includes(eventCategory)) {
      return NextResponse.json(
        { error: "Invalid event category" },
        { status: 400 }
      );
    }

    // Look up IP geolocation (async, don't wait for response)
    let ipData: { city?: string; region?: string; country?: string; isp?: string; type?: string } = {};
    try {
      // Use ip-api.com for geolocation (free tier)
      const geoResponse = await fetch(`http://ip-api.com/json/${ip}?fields=city,regionName,country,isp,mobile,proxy,hosting`);
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        ipData = {
          city: geoData.city,
          region: geoData.regionName,
          country: geoData.country,
          isp: geoData.isp,
          type: geoData.proxy ? "proxy" : geoData.hosting ? "datacenter" : "residential",
        };
      }
    } catch {
      // Ignore geolocation errors
    }

    // Create the event
    const event = await prisma.userEvent.create({
      data: {
        userId: session?.user?.id || null,
        sessionId: sessionId || null,
        eventType,
        eventCategory,
        eventAction: eventAction || eventType,
        eventLabel,
        eventValue,
        pageUrl,
        pageTitle,
        pagePath,
        referrerUrl,
        componentId,
        targetId,
        targetType,
        searchQuery,
        searchFilters: searchFilters ? JSON.parse(JSON.stringify(searchFilters)) : null,
        ipAddress: ip,
        ipCity: ipData.city,
        ipRegion: ipData.region,
        ipCountry: ipData.country,
        ipIsp: ipData.isp,
        ipType: ipData.type,
        userAgent,
        deviceType,
        deviceModel,
        browser,
        browserVersion,
        os,
        osVersion,
        screenWidth,
        screenHeight,
        timezone,
        language,
        timeOnPage,
        scrollDepth,
        funnelId,
        funnelStep,
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
      },
    });

    return NextResponse.json({ success: true, eventId: event.id });
  } catch (error) {
    console.error("Error tracking event:", error);
    return NextResponse.json(
      { error: "Failed to track event" },
      { status: 500 }
    );
  }
}

// Batch track multiple events
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    const headersList = await headers();
    const body = await request.json();

    const forwardedFor = headersList.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || headersList.get("x-real-ip") || "unknown";
    const userAgent = headersList.get("user-agent") || undefined;

    const { events } = body;

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "Events array is required" },
        { status: 400 }
      );
    }

    // Limit batch size
    if (events.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 events per batch" },
        { status: 400 }
      );
    }

    // Create all events
    const createdEvents = await prisma.userEvent.createMany({
      data: events.map((event: Record<string, unknown>) => ({
        userId: session?.user?.id || null,
        sessionId: (event.sessionId as string) || null,
        eventType: event.eventType as UserEventType,
        eventCategory: event.eventCategory as EventCategory,
        eventAction: (event.eventAction as string) || (event.eventType as string),
        eventLabel: event.eventLabel as string | undefined,
        eventValue: event.eventValue as number | undefined,
        pageUrl: event.pageUrl as string | undefined,
        pageTitle: event.pageTitle as string | undefined,
        pagePath: event.pagePath as string | undefined,
        referrerUrl: event.referrerUrl as string | undefined,
        componentId: event.componentId as string | undefined,
        targetId: event.targetId as string | undefined,
        targetType: event.targetType as string | undefined,
        searchQuery: event.searchQuery as string | undefined,
        searchFilters: event.searchFilters ? JSON.parse(JSON.stringify(event.searchFilters)) : null,
        ipAddress: ip,
        userAgent,
        deviceType: event.deviceType as string | undefined,
        browser: event.browser as string | undefined,
        os: event.os as string | undefined,
        screenWidth: event.screenWidth as number | undefined,
        screenHeight: event.screenHeight as number | undefined,
        timezone: event.timezone as string | undefined,
        language: event.language as string | undefined,
        timeOnPage: event.timeOnPage as number | undefined,
        scrollDepth: event.scrollDepth as number | undefined,
        utmSource: event.utmSource as string | undefined,
        utmMedium: event.utmMedium as string | undefined,
        utmCampaign: event.utmCampaign as string | undefined,
      })),
    });

    return NextResponse.json({
      success: true,
      count: createdEvents.count
    });
  } catch (error) {
    console.error("Error batch tracking events:", error);
    return NextResponse.json(
      { error: "Failed to track events" },
      { status: 500 }
    );
  }
}
