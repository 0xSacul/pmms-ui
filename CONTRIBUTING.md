# Contributing

Use Node.js 24 and install dependencies with `npm ci`.

Before submitting a change, run:

```sh
npm test
npm run package
```

Packaging builds the UI and verifies the download contents. Keep generated `dist/`, `artifacts/` and `node_modules/` files out of commits. UI changes should preserve PMMS's NUI endpoints and message shapes. Update both locale files when adding visible labels or tooltip text.

For changes to UI visibility or tooltip behavior, also verify:

1. Hover a control, wait for its tooltip, then close using the close button and Escape.
2. Close using the PMMS `hideUi` message while a tooltip is visible.
3. Close before the 300 ms hover delay elapses, then immediately reopen.
4. Switch between the basic and advanced panels while hovering a control.
5. Remove an active player while hovering its controls.
6. Confirm new tooltips still work after reopening.

Run relevant checks in FiveM/RedM when a change touches media, resource callbacks or scaleforms. Include what you tested in the pull request, along with reproduction steps for bug fixes.

README screenshots belong in `docs/images/`; they must not be added to the installation ZIP. Add installable files explicitly in the packaging script and update the archive verifier when a required runtime file changes.

Preserve attribution and third-party notices. Original contributions should be offered under the project's MIT grant; inherited material retains its own licensing status.
