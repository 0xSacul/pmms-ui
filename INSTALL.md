# Install PMMS UI

This download replaces the interface of an existing [PMMS](https://github.com/kibook/pmms) resource. Install PMMS and its dependencies first.

1. Back up your PMMS resource's `ui/` folder.
2. Copy the four files from this download's `ui/` folder into PMMS's existing `ui/` folder: `index.html`, `script.js`, `style.css` and `locale.json`.
3. Keep the original `mediaelement.min.js`, `wave.js`, `loading.svg`, `chineserocks.ttf` and all other resource files. This download does not include PMMS's libraries or Lua scripts.
4. Add `"ui/locale.json"` to the existing `files` block in `fxmanifest.lua`, preserving its other entries. Keep `ui_page "ui/index.html"`.
5. Restart PMMS and open it with `/pmms` or your configured command.

English is selected by default. To use French, copy this download's `locales/fr.json` over the installed resource's `ui/locale.json`. Preserve your chosen translation when updating the interface.

Do not start this download as a separate FiveM resource. Commands, permissions, media playback and scaleforms are supplied by PMMS.

Original UI contributions are MIT-licensed. Read `LICENSE` and `THIRD_PARTY_NOTICES.md` for the scope of that grant and inherited code provenance.
