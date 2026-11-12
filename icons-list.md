# Mars Horizon Junior Astronaut Mission Trainer - Icon/Emoji Inventory

This file lists every pictogram in the game and the drawing in `Assets/icons/`
that stands for it. The set was supplied as 56 SVG files; they are read at
build time and drawn by `src/ui/icons.ts` (D-083).

One picture per thing: a store looks the same on every screen, so `RESOURCE_ICON`,
`RANK_ICON` and `MODULE_ICON` in `src/ui/icons.ts` are the only maps from a
thing to its drawing.

| id | use case | file name |
|---|---|---|
| habitat | habitat module (outpost) | habitat-module.svg |
| life-support | life-support module | life-support-module.svg |
| solar-array | solar-array module | solar-array-module.svg |
| batteries | batteries module | batteries-module.svg |
| greenhouse | greenhouse module | greenhouse-module.svg |
| ice-miner | ice-miner module | ice-miner-module.svg |
| regolith-shield | regolith-shield module | regolith-shield-module.svg |
| nuclear-unit | nuclear-unit module | nuclear-unit-module.svg |
| alert | General warning alert | alert.svg |
| bolt | General power mark | bolt.svg |
| book | Guide/encyclopedia icon | book.svg |
| box | Container/storage icon | box.svg |
| bulb | Idea/suggestion icon | bulb.svg |
| chart | Science points icon | chart.svg |
| check | Success/completion icon | check.svg |
| chevron | Navigation/direction icon | chevron.svg |
| close | The X on the guide, the sheet and the training dialog | (drawn by hand: no supplied file) |
| clipboard | Fallback/unknown icon | clipboard.svg |
| cloud-sun | Weather conditions icon | cloud-sun.svg |
| dish | General "ask Mission Control" icon | dish.svg |
| droplet | General water mark | droplet.svg |
| explorer | First science rank icon (RANK_ICON mapping) | explorer.svg |
| field-scientist | Second science rank icon (RANK_ICON mapping) | field-scientist.svg |
| flask | Field scientist rank icon | flask.svg |
| food | Food resource (RESOURCE_ICON mapping) | food.svg |
| helmet | Astronaut protection icon | helmet.svg |
| history | Mission history icon | history.svg |
| home | Base location icon | home.svg |
| leaf | General food mark | leaf.svg |
| letter | Communication icon | letter.svg |
| lock | Security/protection icon | lock.svg |
| map | Mars landing/navigation icon | map.svg |
| moon | Night watch / patch icon | moon.svg |
| mountain | Terrain/landscape icon | mountain.svg |
| night-watch | Night watch patch icon (PATCH_ICON mapping) | night-watch.svg |
| no-skip | No-skip patch icon (PATCH_ICON mapping) | no-skip.svg |
| oxygen | Oxygen resource (RESOURCE_ICON mapping) | oxygen.svg |
| pick | Ice mining tool icon | pick.svg |
| power | Power resource (RESOURCE_ICON mapping) | power.svg |
| question | Help/question icon | question.svg |
| recycle | Recycling/environment icon | recycle.svg |
| research-lead | Third science rank icon (RANK_ICON mapping) | research-lead.svg |
| rest | Rest/down time activity order icon (ORDER_ICON mapping) | rest.svg |
| rock | Regolith/soil icon | rock.svg |
| rocket | Launch/rocket icon | rocket.svg |
| rover | Rover exploration icon | rover.svg |
| senior-scientist | Fourth science rank icon (RANK_ICON mapping) | senior-scientist.svg |
| chief-scientist | Fifth science rank icon (RANK_ICON mapping) | chief-scientist.svg |
| shield | General shielding mark | shield.svg |
| shielding | Shielding resource (RESOURCE_ICON mapping) | shielding.svg |
| sparkle | Science points / build points mark | sparkle.svg |
| star | Chief scientist rank icon | star.svg |
| storm | Weather storm icon | storm.svg |
| sun | Sun/resource icon | sun.svg |
| survey | Rover exploration order icon (ORDER_ICON mapping) | survey.svg |
| tray | General storage icon | tray.svg |
| water | Water resource (RESOURCE_ICON mapping) | water.svg |

Two drawings are kept for a general mark and are **not** the store's picture:
`bolt` (power in general), `droplet` (water in general), `leaf` (food in
general) and `shield` (protection in general). The five stores wear
`power`, `water`, `food`, `shielding` and `oxygen` wherever they are shown.
