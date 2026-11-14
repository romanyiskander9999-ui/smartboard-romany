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
Run `npm run test:smoke` to verify the 11 subject workspaces, core board controls, advanced tool entry points, and Windows packaging configuration.

A GitHub Actions workflow also builds the Windows installer and portable executable on pushes affecting the application or when manually dispatched. Download generated artifacts from the workflow run's **Artifacts** section.

## Implemented foundation
- Canvas pen, highlighter, eraser, line, rectangle, circle, triangle, and text.
- Multiple pages, duplicate/delete, undo, local persistence.
- Image and text import, PNG/SVG export, print-to-PDF workflow.
- Eleven subject workspaces with insertable lesson outlines and templates.
- Timer and fullscreen mode.
- Offline lesson planner, arithmetic calculator, physics formula calculator, searchable starter element reference, geographic distance calculator, and quiz template builder.

## Not yet implemented
AI-generated lesson content, full periodic table with detailed properties, real-time maps, advanced interactive simulations, 3D anatomy, multi-layer object editor, cloud synchronization, user accounts, collaboration, and full curriculum alignment. The lesson planner and quiz builder are local templates, not generative AI.
