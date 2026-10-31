# KChat design canvas (Claude Design)

The live canvas: https://claude.ai/artifact/NDTtBtexGrQxBeW9GZBTRP

This folder is the source of every board on it, kept in git so any Claude Code session, on any
account, can open, change and republish it.

- `project/canvas.json`: board positions, titles and order.
- `project/*.dc.html`: one file per board (inline HTML/CSS; some images are data URIs, some are
  `/_blob/<id>` assets already stored in the live canvas).
- `assets/`, `*.jpg`: art used by older boards.

## Edit and republish (from any session)
1. Change or add a board in `project/` (copy an existing `.dc.html` for the format).
2. Register a new board in `project/canvas.json` (`boards`, `order`).
3. Publish with the Artifact tool, action `publish`:
   - `url`: https://claude.ai/artifact/NDTtBtexGrQxBeW9GZBTRP
   - `root`: this folder (`design/kchat-canvas`)
   - `file_path`: `design/kchat-canvas/project/canvas.json`
   - `files`: `{"project/<Board>.dc.html": "project/<Board>.dc.html"}` for each changed board
   A session that has not read the artifact yet must `read` it first.

## Access from another account
The canvas is private to the account that made it. On the canvas page, open **Share** and add the
other account as an editor. Then sessions on that account can read and publish to the same URL.
If that is not possible, publish this folder as a new canvas from the other account (it is all here).
