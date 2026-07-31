# Felizdeemprender — Guide for AI agents

## Rutina de mantenimiento de archivos de diseño

Los archivos de diseño viven en el workspace de Open Design:
`C:\open-design\.od\projects\612c1409-6977-4a59-ab4a-c532936aba60`

Archivos a mantener sincronizados con el código:

| Archivo | Contenido |
|---|---|
| `DESIGN.md` | Design system spec (dirección editorial-plano) + sección 0 "Sistema de tokens DTCG/W3C" |
| `plan-unificacion-modales.md` | Log de trabajo: fases completadas, decisiones, próximos pasos |
| `fastoria-brand-spec.md` | Brand spec (paleta OKLch, usos) |
| `tokens.css`, `fastoria-brand-tokens*.json`, `fastoria-brand-kit.html` | Tokens DTCG y brand kit (importables por `/admin/brand`) |

**Regla:** tras cada cambio significativo que afecte el sistema visual o la arquitectura de brands (nuevos tokens, cambios en `resolveStyleBrand`/`resolveProfileBrand`/`resolveCoursePrimaryColor`, cambios de herencia de brand, restyling, decisión de producto sobre estética), actualizar `DESIGN.md` y/o `plan-unificacion-modales.md` en el mismo turno:

1. **`plan-unificacion-modales.md`:** añadir la fase o el hito nuevo, actualizar la línea de estado/fecha, y ajustar "Próximos pasos potenciales".
2. **`DESIGN.md`:** actualizar la sección 0 (DTCG) si cambió la arquitectura de brands, resolvers o shape canónico; el resto del spec solo si cambia la dirección visual.

## Estado de referencia

- Dev server: `http://localhost:9002`
- `tsc --noEmit`: baseline 50 errores preexistentes; los cambios deben aportar 0 errores nuevos.
- Landings v1: el render monolítico en `v/[id]/page.tsx` está **congelado**, no tocar literales hardcodeados; los tutores reharán con v2. La v2 tiene infra DTCG ✅ (builder `v2-build`, renderer `atomic-renderer.tsx`, editor `v2-edit`) y restyling estético a editorial-plano ✅ (31 Jul 2026).
- Shell del dashboard: **editorial-plano** decidido (31 Jul 2026) — `--card-radius: 0.75rem`, `--card-shadow: none`, `--card-border: 1px solid var(--border)`; sin `rounded-[2rem+]`, sin `shadow-3xl/2xl/xl`, sin `border-none` en Cards. No reintroducir estética redondeada.
- Shape canónico de `branding`: `{ primaryColor, logoUrl }`.
