# Changesets

This directory tracks user-facing changes to `@datadive/mcp` between releases.

When you make a change that should appear in the changelog (any change to tool
behavior, error messages, install instructions, dependencies, or backwards
compatibility), add a changeset:

```sh
npx changeset
```

Pick the bump level:

- **patch** — bug fix, dependency bump, doc tweak
- **minor** — adding a new tool, adding optional input field, broadening a description
- **major** — removing/renaming a tool, narrowing required inputs, breaking a tool's response shape

Commit the generated `.changeset/*.md` file with your PR. On merge to `main`,
GitHub Actions opens a "Version Packages" PR that bumps the version and updates
`CHANGELOG.md`. Merging that PR triggers `npm publish`.
