# Third-party material

The MIT grant in `LICENSE` covers original contributions by 0xSacul. It does not relicense inherited code or assets.

## PMMS-derived media engine

- Source: https://github.com/kibook/pmms
- Upstream author: kibukj / kibook.
- Material retained here: media engine code/behavior adapted in `src/lib/engine.js` and included in the compiled JavaScript.
- Status checked on 2026-10-09: GitHub declares no repository license and the upstream repository root contains no license file. The applicable permission/license for distributing the inherited portions must be clarified before public distribution of this repository or its compiled UI.

The old PMMS interface files and copies of PMMS's runtime assets are not included in this new repository or its release ZIP. This cleanup does not resolve the licensing of the inherited media engine.

## Runtime libraries supplied by PMMS

The installed PMMS resource supplies MediaElement.js, Wave.js, `loading.svg` and `chineserocks.ttf`. They are not vendored here and are not included in the generated UI download. The HTML references MediaElement.js and Wave.js using the installed resource's relative paths; their upstream licenses remain separate from this project's MIT grant.

Sources:

- MediaElement.js: https://github.com/mediaelement/mediaelement
- Wave.js: https://github.com/foobar404/Wave.js

## Build dependencies and remote assets

Svelte, Vite, fflate and the other npm packages retain their licenses in their installed packages. fflate runs only during packaging and is not included in the UI. Svelte's MIT-licensed runtime is bundled into the generated JavaScript; its full license notice is appended to that file by the build.

The HTML loads Lato from Google Fonts and Font Awesome 6.6.0 from cdnjs. Their font, icon and code licenses apply separately. They are loaded remotely rather than vendored into this repository.

## README images

The project owner supplied the three images in `docs/images/` from the former Tebex listing. They document the interface, contain game imagery and are excluded from the installable UI ZIP. The project's MIT grant does not claim rights to third-party game imagery.
