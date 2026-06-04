# Publish the npm CLI package

This fork publishes the CLI package from `cli/` as:

```bash
@itshare4u/9router
```

The installed command stays:

```bash
9router
```

## Publish from your machine

1. Log in to npm:

```bash
npm login
npm whoami
```

2. Install dependencies:

```bash
npm install
npm install --prefix cli
```

3. Build and inspect the package:

```bash
npm run pack:cli
```

This creates a tarball in the repository root. You can inspect it with:

```bash
tar -tf itshare4u-9router-*.tgz | head -80
```

4. Publish:

```bash
npm run publish:cli
```

The first publish of a scoped package must be public. `cli/package.json` already sets:

```json
{
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

## Publish with GitHub Actions

1. Create an npm access token at:

```text
https://www.npmjs.com/settings/<your-npm-username>/tokens
```

Use an automation token or a granular token that can publish `@itshare4u/9router`.

2. Add it to the GitHub repo:

```text
Settings -> Secrets and variables -> Actions -> New repository secret
Name: NPM_TOKEN
Value: <your npm token>
```

3. Run the workflow manually:

```text
Actions -> Publish npm package -> Run workflow
```

Or push a version tag:

```bash
git tag v0.4.66
git push origin v0.4.66
```

## Bump version

Update the CLI package version before each publish:

```bash
cd cli
npm version patch
cd ..
```

`cli/scripts/build-cli.js` syncs the CLI version into the root app package during build.
