import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Art Blocks Collection";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const HASURA_ENDPOINT = "https://data.artblocks.io/v1/graphql";

async function fetchPreviewTokens(address: string): Promise<string[]> {
  const query = `
    query WalletPreview($owner: String!) {
      tokens_metadata(
        where: { owner_address: { _eq: $owner } }
        order_by: { project_name: asc }
        limit: 6
      ) {
        preview_asset_url
        media_url
      }
    }
  `;

  try {
    const response = await fetch(HASURA_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: { owner: address.toLowerCase() },
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const tokens = data.data?.tokens_metadata || [];
    return tokens.map((t: { media_url: string; preview_asset_url: string }) =>
      t.media_url || t.preview_asset_url
    ).filter(Boolean);
  } catch {
    return [];
  }
}

async function resolveENS(ensName: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.ensideas.com/ens/resolve/${ensName}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.address || null;
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  const decodedAddress = decodeURIComponent(address);

  // Resolve ENS if needed
  let resolvedAddress = decodedAddress;
  if (decodedAddress.endsWith(".eth")) {
    const resolved = await resolveENS(decodedAddress);
    if (resolved) resolvedAddress = resolved;
  }

  const images = await fetchPreviewTokens(resolvedAddress);
  const displayName = decodedAddress.endsWith(".eth")
    ? decodedAddress
    : `${decodedAddress.slice(0, 6)}...${decodedAddress.slice(-4)}`;

  // If no images, show simple branded card
  if (images.length === 0) {
    return new ImageResponse(
      (
        <div
          style={{
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <p style={{ fontSize: 48, color: "#ffffff", marginBottom: 16 }}>
            {displayName}
          </p>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span style={{ fontSize: 32, color: "#ffffff" }}>onview</span>
            <span style={{ fontSize: 32, color: "#6366f1" }}>.art</span>
          </div>
        </div>
      ),
      { ...size }
    );
  }

  // Grid layout with overlapping images
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Image grid - offset overlapping style */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            position: "absolute",
            top: 40,
            left: 40,
            width: 800,
            height: 550,
            gap: 0,
          }}
        >
          {images.slice(0, 6).map((src, i) => (
            <div
              key={i}
              style={{
                width: 280,
                height: 280,
                position: "absolute",
                left: (i % 3) * 240,
                top: Math.floor(i / 3) * 240,
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                border: "2px solid rgba(255,255,255,0.1)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          ))}
        </div>

        {/* Branding overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 40,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          <p
            style={{
              fontSize: 36,
              color: "#ffffff",
              marginBottom: 8,
              textShadow: "0 2px 12px rgba(0,0,0,0.8)",
            }}
          >
            {displayName}
          </p>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span
              style={{
                fontSize: 24,
                color: "#ffffff",
                textShadow: "0 2px 12px rgba(0,0,0,0.8)",
              }}
            >
              onview
            </span>
            <span
              style={{
                fontSize: 24,
                color: "#6366f1",
                textShadow: "0 2px 12px rgba(0,0,0,0.8)",
              }}
            >
              .art
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
