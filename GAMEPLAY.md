# Junk Racers: Paint Territory

## Round Flow

1. Choose one of the ten existing animal characters in the main menu.
2. Collect parts on foot for 15 seconds. Every runner owns a separate head stack.
3. Collisions and dash attacks knock real parts into the world. Dropped parts can be reclaimed.
4. At the deadline, final stacks are frozen. Only the player's own stack becomes their inventory.
5. Collected parts fly into the car during assembly. Missing body parts are not replaced with a default can.
6. After a three-second countdown, play a 90-second paint territory battle.
7. Final owned surface area determines the winner. There are no laps or finish-line triggers.

## Territory Scoring

The visible paint texture and scores use the same 384 by 384 ownership buffer.
Each valid texel has one owner, or is unpainted. Obstacle footprints and the outside
of the arena are excluded. Sloped surfaces are weighted by their surface area.

Painting an opponent's texel subtracts that texel from their area and adds it to yours.
Repainting your own texels does not increase the score. Percentages use the entire
paintable surface, including unpainted ground, as the denominator. The round freezes
before any movement or paint simulation at the 90-second deadline.

## Controls

- Single player: WASD or arrows for movement / acceleration / braking / steering.
- Collection: Shift or F for a short dash attack.
- Battle: Space for drift, left Shift for boost, E for an item.
- Touch: left stick steers and accelerates/brakes/reverses; drift, boost, and item buttons sit in the lower-right.
- No forward stick/accelerator input means no powered acceleration, including with a turbo active.

## Parts, Speed, and Brushes

- Barefoot / carrying junk has a top speed of about 3.6-4.4 world units per second and no boost.
- Vehicles start above 8.5; more wheels and filled core slots improve speed. Every equipped part adds a grade bonus (common 0.25, rare 0.7, epic 1.3, legend 2.2).
- Brush parts spawn during the scramble and mount downward behind the car. Ballpen, crayon, thin brush, marker, wide brush, roller and legendary paint bucket widen the actual paint radius from x0.72 to x2.30. With no brush the width is x0.55.
- The parts catalog, garage and assembly list show the actual rotating 3D model, not a flat item image.

## Local Multiplayer

The multiplayer menu configures two to four players sharing one PC and keyboard.
Room codes save and restore those local settings in the current browser. They are
not an online matchmaking service or a connection between different devices.

- P1: WASD, Space, left Shift, E. Collection dash: F.
- P2: arrows, Enter, right Shift, M. Collection dash: slash.
- P3: IJKL, U, O, P. Collection dash: H.
- P4: keypad 8/5/4/6, 0, 9, 7. Collection dash: keypad decimal.

Human participants keep their own collected parts and auto-assembled cars.
Unused seats are filled by AI. Click a live standings row to inspect a participant's camera.

## Main Modules

- `src/game/battleMap.ts`: arena layout, surfaces and AI navigation.
- `src/game/paint.ts`: territory ownership, scoring and paint texture.
- `src/three/BattleWorld.tsx`: timed battle, vehicles, items and territory-seeking AI.
- `src/three/ScrambleWorld.tsx`: collection, collisions and independent inventories.
- `src/three/AssemblyStage.tsx`: collected-part assembly presentation.
- `src/three/MenuShowroom.tsx`: separate standing character and driverless car display.
- `src/ui/MainMenu.tsx`: menu, character selection, customization and local setup.

## Manual Verification Checklist

- Leave all driving keys untouched after the countdown: the human vehicle must remain stationary.
- Hold the accelerator, release it, then brake: verify acceleration, coasting and stopping.
- Repaint an owned area: verify that the final area is not double counted.
- Overpaint an opponent: verify that their area decreases as yours increases.
- At zero seconds: verify that movement, item attacks and paint ownership stop changing.
- Collect and lose a part: verify that it leaves the head stack and remains available on the ground.
- Finish collection: verify that player inventory excludes AI-held parts.
- Remove the body in customization: verify that no replacement can appears.
- Select each animal: verify the original model and independent showroom placement.
- Check portrait and landscape touch controls and low-end WebGL performance on physical devices.