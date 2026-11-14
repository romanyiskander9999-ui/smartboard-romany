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
Run `npm run test:smoke` to verify the 11 subject workspaces, core board controls, advanced tool entry points, independent layers, and Windows packaging configuration.

The GitHub Actions workflow builds the Windows installer and portable executable on pushes affecting the app or when manually dispatched. Download generated artifacts from the workflow run's Artifacts section.

## Implemented
- Pen, highlighter, eraser, line, rectangle, circle, triangle, and text tools.
- Multiple pages, duplicate/delete, undo, and local persistence.
- Image and text import, PNG/SVG export, and print-to-PDF workflow.
- Eleven subject workspaces with insertable lesson outlines and templates.
- Independent transparent drawing layers per page, with layer selection, visibility, opacity, and layer eraser.
- Offline lesson planner, arithmetic and physics calculators, searchable starter element reference, geographic distance calculator, and quiz template builder.
- Lesson timer and fullscreen mode.

## Not yet implemented
AI-generated lesson content, full periodic table with detailed properties, real-time maps, advanced interactive simulations, 3D anatomy, object selection/movement on the base canvas, cloud synchronization, user accounts, collaboration, and full curriculum alignment. The lesson planner and quiz builder are local templates, not generative AI.
