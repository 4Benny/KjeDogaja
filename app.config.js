const appJson = require("./app.json");

const baseConfig = appJson.expo;

function normalizeUrl(value) {
  if (!value || typeof value !== "string") return "";
  return value.trim().replace(/\/+$/, "");
}

module.exports = ({ config }) => {
  const buildProfile = process.env.EAS_BUILD_PROFILE || "";
  const appEnv = process.env.APP_ENV || "";

  const fromEnv = normalizeUrl(process.env.EXPO_PUBLIC_BACKEND_URL);
  const fromJson = normalizeUrl(baseConfig?.extra?.backendUrl);
  const backendUrl = fromEnv || fromJson;

  if (backendUrl) {
    const isHttps = /^https:\/\//i.test(backendUrl);
    const hasPlaceholder = /example\.com/i.test(backendUrl);

    if (!isHttps || hasPlaceholder) {
      throw new Error(
        "Invalid EXPO_PUBLIC_BACKEND_URL: use a real public HTTPS API URL or leave it unset to run in Supabase-only mode."
      );
    }
  }

  return {
    ...baseConfig,
    ...config,
    extra: {
      ...(baseConfig.extra || {}),
      ...(config.extra || {}),
      backendUrl,
      appEnv,
      easBuildProfile: buildProfile,
    },
  };
};
