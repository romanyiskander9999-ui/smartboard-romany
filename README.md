# SchoolVerse SuperBoard

Arabic-first interactive classroom whiteboard for Windows, built with Electron.

## Run locally
1. Install Node.js 22 LTS.
2. Run `npm install`.
3. Run `npm start`.

## Windows packaging
- NSIS installer: `npm run dist:win:nsis`
- Portable executable: `npm run dist:win:portable`
- Both packages: `npm run dist:win`

## Automated checks
Run `npm run test:smoke` to check the subject workspaces, core controls, advanced tools, layer-aware exports, Electron PDF bridge, and JavaScript syntax.
The GitHub Actions workflow builds the Windows installer and portable executable on relevant pushes or manual dispatch. Download packages from the workflow run's Artifacts section.

## Implemented in this release
- Canvas selection/move, pen, highlighter, eraser, line, rectangle, circle, triangle, and text.
- Multiple pages, duplicate/delete, undo, and local persistence.
- Image and text import, PNG/SVG export, and desktop-native PDF export; image exports include visible drawing layers.
- Eleven subject workspaces with insertable lesson outlines and templates.
- Independent transparent drawing layers per page, with layer selection, visibility, opacity, and layer eraser.
- Offline lesson planner, arithmetic and physics calculators, searchable starter element reference, and geographic distance calculator.
- Ideal projectile-motion simulation, labeled plant/animal cell schematic, and JavaScript practice sandbox running in a separate worker with a time limit.
- Editable quiz template builder and JSON backup/restore for board pages and layers.
- Lesson timer and fullscreen mode.

## Not yet implemented
AI-generated lesson content, a complete 118-element reference with detailed properties, real-time maps, advanced scientific simulations, 3D anatomy, cloud synchronization, user accounts, collaboration, and full Egyptian curriculum alignment. The lesson planner and quiz builder are local templates, not generative AI. The chemistry element lookup is a starter subset, not a complete periodic table.