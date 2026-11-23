# Prestige Builders Ltd.

Run `npm start` and open http://127.0.0.1:4173. The local preview includes Three.js, its addons, model textures and lighting assets.

## Scroll-driven woodland construction scene

Page scroll selects a position on a ten-second construction timeline. On desktop, a stationary 3200 × 1801 landscape sits behind the transparent worksite layers. On iPhone and iPad, five photographs follow the construction from the ground plan to the finished house. During a fast swipe, one still remains visible. As the gesture slows, a short dissolve reveals the current stage in either scroll direction. On other phones, the same sequence is pre-rendered in portrait and landscape, in H.264 and VP8. The browser seeks one muted, paused video as the visitor scrolls. If decoding is unavailable, the same milestones are shown as stills. Reduced motion shows the completed house without loading a film.

The built-in ImageGen tool created the woodland detail tiles, construction phases and architectural concept. The crane rig and wall panel are separately matted photographic elements. WebGL composites them at the current scroll position, with a Canvas 2D fallback. The production images and [art direction](assets/woodland/art-direction.md) are in `assets/woodland`. The earlier [NIST construction timelapse](https://www.nist.gov/video/net-zero-house-construction-timelapse) supplied the architectural reference.

The finish-selection illustration was generated with the built-in imagegen tool. The production prompt is included in `assets/finish-selection-prompt.txt`.

## Earlier 3D study

The Three.js construction and homecoming scenes remain available to the offline roof renderer and model tests. The renderer uses its dedicated template at `scripts/roof-render.html`.

## Verification and credits

`npm run check` checks the application modules. `npm test` covers reversible seeking, finite transforms, site cleanup, persistent installed pieces, tool-to-fastener contact and the handover through the seated family pose.

Three.js and its addons use the MIT license in `vendor/LICENSE`. `scripts/vendor-addons.cjs` reproduces the local addon bundle from the installed three package. The evening HDR environment is [Venice Sunset by Greg Zaal](https://polyhaven.com/a/venice_sunset), released through Poly Haven under CC0.

The head, neck, exposed arms and articulated hand shapes derive from [MakeHuman hm08](https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/3dobjs/base.obj). The creators released the mesh under [CC0](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md). The original OBJ credits Data Collection AB, Joel Palmius and Jonas Hauquier. `scripts/prepare-anatomy.mjs` rebuilds the compact local geometry from that OBJ.

The overalls, everyday clothing, shoes and hairstyles use six models from the [CC0 MakeHuman system asset pack](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html). The scene uses the original clothing UVs and resized diffuse maps. Hair maps retain their alpha channels. Running `node scripts/prepare-wardrobe.mjs base.obj extracted-model-folder` rebuilds `assets/tailoring.js` from the original OBJ and MHClO files in a single directory. The original model names are listed in the script.

The family walk uses fixed shoe prints, two-bone leg poses and a separate pelvis and chest. The parents' hands settle on the children's shoulder joints. The workers share the same hand geometry with leather palm panels and a finger-curl blend shape. All poses are evaluated from the timeline position.

The built-in ImageGen tool generated the four fabric samples in `assets/wardrobe-weave.jpg` with the following prompt.

> Create one square, perfectly aligned 2 by 2 atlas of four photographic textile samples for physically based 3D clothing materials, equal square quadrants, edge to edge with no gaps, edges, text, objects or labels. View perfectly perpendicular to surfaces in neutral broad, cross-polarized light. Each square shows about 16 cm of material. Top left: worn dark indigo cotton twill trousers, fine diagonal weave, small areas of faded threads and subtle carpentry dust. Top right: real muted saffron-orange hi-vis woven work vest fabric, utilitarian tightly woven synthetic textile with occasional darker fine fibres, gently worn. Bottom left: natural ivory soft chunky knit sweater swatch with clearly defined small columns of stitches, subtle yarn variations. Bottom right: natural warm grey loopback cotton sweatshirt brushed jersey, very fine heathered fibres with tiny soft irregularities. Each quadrant is exclusively raw cloth and evenly filled to the very corners; swatches are uncut and unbounded. No graphic stripes, seam lines, hard shadows or folds. Realistic documentary photography, physical scale consistent, high resolution.

The three fictional crew portraits in `assets/crew-faces.jpg` were generated using the following prompt and registered to the head mesh.

> A precisely aligned horizontal casting contact sheet of THREE different adult Canadian residential construction workers, three equal square portraits side by side, one portrait per cell. The image is three times as wide as high. Real documentary close-up photography, dry matte bare skin with fine pores, open alert eyes looking directly into lens, neutral mouths, relaxed concentration, identical broad overcast frontal fill light, no harsh shadows, no watermarks, no glasses, no helmets, no text. Left: a Black man in his late thirties with dark close-cropped hair, short neatly trimmed beard. Centre: a light-skinned man about 48 with weathered cheeks, pale brown eyebrows and sparse ginger-grey stubble. Right: an East Asian man about 40 with dark brows, black short hair and clean-shaven cheeks. All three face straight forward, no tilt or perspective. Show the whole crown, both temples and chin in each cell. In each square cell the eyes lie at 46 percent of height and chin at 87 percent, face width edge to edge at the cheekbones is 58 percent of cell width; neutral plain warm-grey background. These are fictional adults, for facial textures on 3D characters. The image should look like three real colleagues in a lighting reference studio.

The built-in ImageGen tool generated `assets/osb.jpg`, `assets/mineral-wool.jpg`, `assets/cast-concrete.jpg` and `assets/fleet-enamel.jpg` as a single material atlas using this prompt.

> A square 2 by 2 production albedo texture atlas for a photorealistic real-time Canadian residential construction site. Perfect orthographic macro photography, flat cross polarized neutral lighting, edge to edge material in each precise square quadrant, no borders, no seams between quadrants other than change of material, no text, no hands, no tools, no perspective or cast shadows. TOP LEFT new undyed pale honey OSB sheathing, many slender compressed irregular birch and spruce flakes in mixed orientations, at true scale representing a 60 by 60 cm piece. TOP RIGHT natural buff olive mineral wool batt, highly irregular tangled fine soft fibres like dense fibrous felt, photographed straight on, 35 cm view. BOTTOM LEFT grey finely trowelled cast concrete floor, true smooth cement, subtle mottling and faint float marks, fine tiny pores, no exposed stones or giant gravel, 80 cm patch. BOTTOM RIGHT offwhite dusty enamel on construction machinery, extremely subtle grey wear and narrow construction dust streaks, neutral white oxidized enamel paint, no rust pits. The atlas must be divided exactly evenly into four usable texture maps for 3D surfaces.
