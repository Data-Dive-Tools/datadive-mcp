import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  dts: false,
  minify: false,
  splitting: false,
  shims: false,
  // Preserve the #!/usr/bin/env node shebang on the bin entry.
  banner: { js: "#!/usr/bin/env node" },
});
