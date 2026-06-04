# Publish the GitHub Packages CLI

This fork publishes the CLI package from `cli/` as:

```bash
@itshare4u/9router
```

The installed command stays:

```bash
9router
```

GitHub Packages for npm uses this registry:

```text
https://npm.pkg.github.com
```

## Client install from GitHub npm package

GitHub Packages generally requires authentication even for public npm packages. Create a GitHub personal access token classic with `read:packages`, then run this on the client machine:

```bash
export GITHUB_TOKEN=ghp_your_token_here
npm config set @itshare4u:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken "$GITHUB_TOKEN"
npm install -g @itshare4u/9router
9router
```

The same setup can be written directly to `~/.npmrc`:

```ini
@itshare4u:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=ghp_your_token_here
```

## Publish from GitHub Actions

The workflow `.github/workflows/npm-publish.yml` publishes on every push to `master` or `main`.

It uses the repository `GITHUB_TOKEN`, so you do not need an npmjs token. The workflow permissions include:

```yaml
contents: read
packages: write
```

Before each publish, the workflow checks whether the current `cli/package.json` version already exists. If it exists, the workflow skips publishing instead of failing.

After the first publish, make the package public if GitHub did not do it automatically:

```text
GitHub -> Profile -> Packages -> @itshare4u/9router -> Package settings -> Change visibility -> Public
```

## Publish from your machine

For manual publishing, create a GitHub personal access token classic with `write:packages`, then authenticate npm:

```bash
export GITHUB_TOKEN=ghp_your_token_here
npm config set @itshare4u:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken "$GITHUB_TOKEN"
npm whoami --registry=https://npm.pkg.github.com
```

Build and publish:

```bash
npm install
npm install --prefix cli
npm run publish:cli:dry-run
npm run publish:cli
```

## Bump version

GitHub Packages cannot overwrite an existing package version. Update the CLI package version before publishing a new release:

```bash
cd cli
npm version patch
cd ..
```

`cli/scripts/build-cli.js` syncs the CLI version into the root app package during build.
