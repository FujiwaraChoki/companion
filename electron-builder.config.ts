import type { Configuration } from "electron-builder";

const config: Configuration = {
  appId: "com.companion.app",
  productName: "Companion",
  directories: {
    buildResources: "build",
    output: "release",
  },
  files: [
    "dist-electron/**/*",
    "web/dist/**/*",
    "web/server/**/*",
    "web/bin/**/*",
  ],
  asarUnpack: [
    "web/server/**/*",
    "web/bin/**/*",
  ],
  mac: {
    target: "dmg",
    category: "public.app-category.developer-tools",
  },
  dmg: {
    contents: [
      { x: 130, y: 220 },
      { x: 410, y: 220, type: "link", path: "/Applications" },
    ],
  },
  win: {
    target: "nsis",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
  linux: {
    target: ["AppImage", "deb"],
    category: "Development",
  },
};

export default config;
