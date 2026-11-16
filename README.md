# xinport.com

The website of Xinport LLC. Plain static HTML: no JavaScript, cookies, analytics or outside
requests.

```bash
node build.mjs                      # build dist/ and run every check; exit 1 = do not publish
HOME_ADDRESS="..." node build.mjs   # also fail if that street line appears anywhere
```

- `identity.json`: the legal name, address and email. It is the only place those values live.
- `build.mjs`: the pages, the only other strings allowed on them (`TEXT`), and the checks.
  - Every visible line must be one of those strings.
  - The build fails on an office, location, store-availability, date or user-count claim.
  - Each page carries its Content Security Policy as a `<meta>` tag, because GitHub Pages cannot
    send headers.
- `.github/workflows/pages.yml`: on every push to `main`, it runs `node build.mjs` and publishes
  `dist/` to GitHub Pages. A failed check stops the publish.
- `fonts/`: Instrument Serif, SIL Open Font License 1.1 (see `fonts/LICENSE.md`).
