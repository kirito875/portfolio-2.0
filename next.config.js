/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Defensive. The resume route currently prerenders at build time, so the PDF
    // is already baked into the build output. This rule keeps the file traced
    // if that route ever becomes dynamic, where Next cannot follow a path that
    // is only assembled at runtime.
    outputFileTracingIncludes: {
      "/api/resumedownload": ["./secure_files/**"],
    },
  },
};

module.exports = nextConfig;
