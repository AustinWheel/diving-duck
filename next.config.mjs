/** @type {import('next').NextConfig} */
const nextConfig = {
  sassOptions: {
    compiler: "modern",
    silenceDeprecations: ["legacy-js-api"],
  },
  images: {
    remotePatterns: [new URL('https://lh3.googleusercontent.com/**')]
  }
};

export default nextConfig;
