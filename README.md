# Handwriting

**English** · [Русский](README.RU.md)

Draw your handwriting letter by letter and turn any text into a handwritten page, a PDF or an installable font.

**Open the app:** https://fakeman2332.github.io/Handwriting/

## How it works

1. **Create a handwriting.** Give it a name and pick the character sets you need: Latin, Cyrillic, digits and punctuation.
2. **Draw the letters.** A faint sample letter and guide lines help you keep the size consistent. Press "Next" to jump straight to the next empty letter. Every stroke is saved automatically.
3. **Write your text.** Open the converter, type or paste text, and it appears on a sheet in your handwriting.
4. **Export.** Download the result as PNG or PDF, print it, or save your handwriting as an OTF font.

You don't have to finish the whole alphabet first: the converter works from the very first letter. Letters you haven't drawn yet are highlighted on the sheet, and a click opens them for drawing. After you save, you return to the converter with your text intact.

## Features

- **Even letters.** Letters drawn at different sizes or heights snap to the guide lines in your text: lowercase to lowercase height, capitals to capital height, descenders below the line. Your drawing itself stays unchanged, and you can turn this off in the converter.
- **Progress by example.** While you draw, "The quick brown fox jumps over the lazy dog" (or its Russian counterpart) is shown next to the canvas in your handwriting and updates after every stroke. The current letter is underlined, letters you haven't drawn yet are highlighted, and a click on one opens it for drawing.
- **Natural variety.** Each drawn letter gets three automatic variations, so the same letter never looks identical twice in a row. You can delete any variation or add more of your own.
- **Mouse, finger or stylus.** Stylus pressure and tilt are recorded, and accidental palm touches are ignored while you draw with a pen.
- **Paper and ink.** Blank, lined or grid paper in A4 or A5. Blue, black or any ink colour you like, with adjustable pen width and text size.
- **Regenerate.** One button gives the same text a fresh look. The exported file always matches the preview.
- **Writing animation.** Watch your page being written stroke by stroke.
- **Long texts.** Up to about 20 A4 pages, split into pages automatically.
- **Two languages.** The interface is available in English and Russian.

## Export formats

| Format | What you get |
| --- | --- |
| PNG | 300 dpi images, one per page (a zip archive for several pages) |
| PDF | A vector document that stays sharp at any zoom; also used for printing |
| OTF | A font for Windows, macOS and Linux that works in Word, LibreOffice and graphics editors |

When exporting, you choose the font name and its version. Raise the version each time you update the font, so your system replaces the installed copy; the app suggests the next version and keeps a list of previous exports.

The OTF font contains the first drawn version of each letter. A system font can't reproduce the variety of the generator, so identical letters look identical. Google Docs doesn't accept custom fonts.

## Your data stays with you

There are no accounts and no servers: your handwritings are stored only in your browser on this device. To keep them safe or move them to another device, use **Backup** on the handwritings list. It saves a `.hwfont.json` file that you can restore later with **Import backup**.

On iPhone and iPad, Safari may delete site data after 7 days without visits. Add the app to your Home Screen (Share → Add to Home Screen) and make backups regularly.

## Install and work offline

The app can be installed like a regular application from the browser menu ("Install app" or "Add to Home Screen"). Once opened, it keeps working without an internet connection. When a new version comes out, the app shows a notice and updates only when you choose to reload.

## Limitations

- Letters are printed separately: joined cursive handwriting isn't generated.
- Exporting the writing animation as a video isn't supported yet.

## Feedback and support

Found a bug or have an idea? See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
