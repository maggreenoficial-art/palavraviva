const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const defaultResolveRequest = config.resolver.resolveRequest;

/**
 * No web, não embute MP3 no bundle público (anti-clonagem).
 * O player usa streaming assinado via /api/media/*.
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    typeof moduleName === 'string' &&
    /\.mp3(\?.*)?$/i.test(moduleName)
  ) {
    return {
      type: 'empty',
    };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Garante que assetExts ainda lista mp3 para nativo
config.resolver.assetExts = Array.from(
  new Set([...(config.resolver.assetExts || []), 'mp3']),
);

module.exports = config;
