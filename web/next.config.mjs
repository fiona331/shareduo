/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["postgres", "bcryptjs"],
  },
};

export default nextConfig;
