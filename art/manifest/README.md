One JSON file per asset group (`world.json`, `buildings.json`, `peoples.json`, `ui.json`), each `{"assets": [...]}`.
`npm --prefix scripts/assets run assets:gen` merges them into `art/manifest.json` (generated, not committed).
