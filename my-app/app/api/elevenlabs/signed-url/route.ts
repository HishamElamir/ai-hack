import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!agentId || !apiKey) {
    return NextResponse.json(
      { error: "ElevenLabs not configured" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        headers: { "xi-api-key": apiKey },
      },
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("ElevenLabs signed URL error:", response.status, text);
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status}` },
        { status: 502 },
      );
    }

    const data = await response.json();
    return NextResponse.json({ signed_url: data.signed_url });
  } catch (error) {
    console.error("Failed to get signed URL:", error);
    return NextResponse.json(
      { error: "Failed to contact ElevenLabs" },
      { status: 502 },
    );
  }
}
