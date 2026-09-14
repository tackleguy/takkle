import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  async redirects() {
    return [
      { source: "/nil-rules", destination: "/college", permanent: true },
      { source: "/nil-rules/:state", destination: "/guides", permanent: true },
      {
        source: "/guides/how-to-get-nil-deals-high-school",
        destination: "/guides/how-to-get-nil-deals-college",
        permanent: true,
      },
      {
        source: "/guides/nil-taxes-for-minors",
        destination: "/guides/nil-taxes-for-college-athletes",
        permanent: true,
      },
      {
        source: "/guides/best-nutrition-supplements-high-school-athletes",
        destination: "/guides/best-nutrition-supplements-college-athletes",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
