# Supply Chain & Logistics — Implementation Guide v3

> Saved from user's design document. See the full guide for implementation phases.
> This file is a placeholder — the full content was provided in conversation.

## Status: Ready for Implementation

### Phase Summary
1. BOM Generator (3-4 hrs) — connects R&D + Factory → material needs
2. Factory → Supply Chain handoff (2-3 hrs) — auto-BOM, summary banner
3. Redesigned Supply Chain page (4-6 hrs) — vendor cards, cart, submit
4. Production response (2-3 hrs) — constraints, arrivals, forecasts
5. Decision store + converter + wiring (1-2 hrs)
6. Engine integration (3-4 hrs) — cost wiring, constraints
7. Smart defaults & QoL (2-3 hrs) — quick order, auto-fill, reorder
8. Supplier rebalancing — competitive economics with trade-offs

### Key Design Change
Factory PUSHES requirements to supply chain (auto-generated BOM), not the other way around. Players never manually calculate material needs.
