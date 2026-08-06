import { defineConfig, type Options } from "tsup";

const shared: Options = {
  format: ["esm"],
  target: "node18",
  platform: "node",
  outDir: "dist",
  sourcemap: true,
  minify: false,
  splitting: false,
  shims: false,
};

export default defineConfig([
  {
    ...shared,
    entry: ["src/index.ts"],
    clean: true,
    dts: false,
    // Preserve the #!/usr/bin/env node shebang on the bin entry.
    banner: { js: "#!/usr/bin/env node" },
  },
  {
    // Library entry (package.json#exports ".") for hosts embedding the server —
    // no shebang, ships type declarations. `clean` only on the first config so
    // this build doesn't wipe the bin output.
    ...shared,
    entry: ["src/lib.ts"],
    clean: false,
    dts: true,
  },
]);
