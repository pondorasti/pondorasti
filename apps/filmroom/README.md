# Filmroom

A small DICOM image viewer with a macOS-inspired interface, automatic light and dark appearance, and local file import. Open a study, adjust each image, compare projections, and export a full-resolution PNG or the original DICOM files.

The app starts empty. No patient images, study metadata, accounts, analytics, or upload service are included. Files are read and decoded in the browser, with JPEG 2000 decoding in a worker. Closing the study or reloading the page clears the loaded study; it is not saved in browser storage.

## Run locally

From the repository root, using Bun 1.4 or newer:

```sh
bun install --frozen-lockfile
bun run --cwd apps/filmroom dev
```

Open the loopback URL printed by Vite. Choose **Files** for a ZIP or individual DICOM files, or **Folder** for an extracted study. ZIPs and files can also be dropped onto the page. Open one study at a time.

```sh
bun run --cwd apps/filmroom test
bun run --cwd apps/filmroom build
bun run --cwd apps/filmroom preview
```

The production build is in `apps/filmroom/dist`. Serve that directory with a static HTTP server; it is not a standalone HTML file. Relative asset URLs support hosting under a subpath. The decoder and WebAssembly binary are bundled locally, so no CDN is needed. Development and preview servers bind to `127.0.0.1` by default.

## Deploy to Hunk

[Open Filmroom in Hunk](https://app.hunk.851.sh/domain-851-sh/filmroom). The deployment is visible to the `851.sh` workspace.

Install the [Hunk CLI](https://www.npmjs.com/package/@851-labs/hunk) and run `hunk login` with an account in that workspace. Then, from the repository root:

```sh
bun run --cwd apps/filmroom deploy
```

The checked-in `.hunk/config.json` contains the stable Hunk ID, with no credentials. The deploy command rebuilds the app, copies that link into the build directory, and pushes only `dist` to the existing hunk. Hunk excludes `.hunk` from uploaded assets. Keep the source configuration in place: Vite replaces the build directory on each build.

## Controls

| Action | Control |
| --- | --- |
| Select image | Sidebar, `1`–`9`, or left/right arrows |
| Pan | Drag with the Pan tool (`V`) |
| Window level / width | Inspector sliders, or vertical/horizontal drag with Window (`W`) |
| Zoom | Scroll, pinch, or `+` / `−` |
| Fit | Double-click or `F` |
| Reset selected image | `R` |
| Invert | `I` |
| Compare | `C`; up to four consecutive images per page |
| Rotate / flip | Toolbar |

Each image keeps its own window, zoom, and orientation. In comparison mode, select a viewport before adjusting it; the sidebar and arrow keys can move to another group of four.

**Export PNG** saves the full image with its current window, inversion, rotation, and flip. Zoom and pan do not crop the export. **Save DICOM originals** creates a new ZIP containing the original DICOM bytes and relative paths, including DICOMDIR when present. It does not include the bundled viewer software or other non-DICOM files from the input archive. The source metadata remains in those originals; export does not anonymize them.

## Supported images

- DICOM Part 10 files with a `DICM` prefix, with `.dcm`, `.dicom`, or extensionless filenames.
- Single-frame, single-channel `MONOCHROME1` and `MONOCHROME2` images.
- Aligned 8-bit or 16-bit allocation, signed or unsigned stored values, positive rescale slopes, and LINEAR windowing.
- Implicit VR Little Endian, Explicit VR Little Endian, Explicit VR Big Endian, and JPEG 2000 transfer syntaxes `.90` and `.91`.
- Source window presets, with a min/max fallback and a separate 1st–99th percentile auto-contrast option that excludes padding.

Color, multi-frame images, other compressed transfer syntaxes, modality/VOI/presentation LUT sequences, and non-LINEAR windowing are rejected with an explanation. Unsupported DICOM files remain available in the originals export when other images in the selection load successfully. Display supports a limited subset of DICOM and is not a validated diagnostic workstation.

Import limits are 256 MiB of selected files, 256 MiB of expanded candidate files, 64 MiB per candidate file, 96 images, 16 million pixels per image, and 48 million pixels per study. The importer ignores common non-image archive contents such as the original Windows viewer. Encrypted ZIPs are not supported.

## Tests and dependencies

Tests exercise windowing boundaries, signed pixels, rescale, grayscale polarity, ZIP handling, unsupported formats, and the actual WebAssembly JPEG 2000 decoder. All fixtures are synthetic. `test/fixtures/gradient.j2k` is a lossless 16 × 16 grayscale ramp whose samples are `index * 257`, encoded as a raw codestream with Pillow; it contains no medical data.

The app uses [dicom-parser](https://github.com/cornerstonejs/dicomParser), [Cornerstone's OpenJPEG codec](https://github.com/cornerstonejs/codecs), and [fflate](https://github.com/101arrowz/fflate), bundled with Vite. Tests use Bun's built-in runner.
