# PIC showcase artifacts

These files are real exported GDS layouts, not browser-generated mock geometry.
The viewer selects the physical design root, excluding KLayout's
`$$$CONTEXT_INFO$$$` metadata catalog. The original downloadable GDS is preserved.
Construction stages are a presentation reconstructed from final GDS hierarchy;
they are not recorded intermediate results of an online AI run.
Each JSON contains flattened polygons, units, bounds, source provenance, SHA-256
of the corresponding GDS, and explicit verification status.

| ID | Origin | What has been checked |
| --- | --- | --- |
| ring | Local circular single-bus ring generated with gdstk; R=10 um, width=0.5 um, gap=0.2 um | GDS generation and parsing; not optical validation |
| mzm | PICasso reference notebook, cell 4; local API-compatible replay | Layout generation, GDS parsing |
| qam | PICasso reference notebook, cell 6; local API-compatible replay | Layout generation, GDS parsing |

The browser replays a presentation sequence; it does not run an LLM or simulate
the device. Custom text can be exported as a pending design request. Full DRC,
LVS, fabrication signoff, and target optical performance are not validated here.

PICasso: https://github.com/ACADLab/PICasso
Paper: *PICasso: An AI-Enabled Design Framework for Autonomous Optimization of
Silicon Photonic Devices*, Vungarala et al.
Copyright (c) 2025 ACADLab. MIT license reproduced in PICasso-LICENSE.txt.
gdsfactory: https://github.com/gdsfactory/gdsfactory (MIT).

Project-group contributions in this module: web integration, interactive geometry
viewer, workflow presentation, artifact export and traceable delivery.
Reference designs are not claimed as original project-group research.

Repair showcase: all 40 archived photonic trials from
SpecPDA-drc-repair/runs/drc-repair-v1-final. 16 are DRC-clean under the
specpda.mock_geometry@1.0.0 test deck, 24 retain violations. This is deterministic
local geometry search, not an LLM execution trace or foundry signoff.
scripts/export_repair_showcase.py only reads the source archive and verifies
input hashes afterward. Copied geometry and redacted records are under repair/.
