/** @type {import("next").NextConfig} */
const nextConfig = {
  // Required for ffmpeg-static binary to be included in build
  experimental: {
    serverComponentsExternalPackages: ["ffmpeg-static", "youtube-dl-exec"],
  },
};

module.exports = nextConfig;
