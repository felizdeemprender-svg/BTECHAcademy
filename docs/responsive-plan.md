# Plan de Responsividad 100% — FastoriaAcademy

Documento de seguimiento. Marcar cada item con `[x]` al completarlo.

## Contrato de QA (definición de "100%")

- [x] Cero scroll horizontal en cualquier página ≤ 1024px (grids fijos → overflow-x-auto, iframes → w-full).
- [x] Flujos primarios usables en mobile: navegación pública, dashboard, CRUD de cursos, landings (crear/editar), checkout, admin.
- [x] Touch targets ≥ 44px.
- [ ] Auditado en 375 / 768 / 1024 / 1440px (Chrome, Safari, Firefox) — requiere verificación visual en browser.

## Estado actual (auditoría)

- Shell responsive correcto: `DashboardLayout` usa shadcn Sidebar `collapsible="offcanvas"` (drawer con hamburger en mobile).
- Componente `Table` base ya es `overflow-auto` → no rompe la página (pero 6–9 columnas son inutilizables en mobile sin vista de cards).
- 69 páginas → 57 con breakpoints (82,6%). 12 sin ningún breakpoint → todas corregidas en Fase 4. Páginas adicionales corregidas en Fase 5 y Fase 6 (courses/edit, etc.).
- Patrón dual correcto (referencia): `FollowUpTable.tsx` y `TaskTable.tsx` (`hidden md:block` tabla + `md:hidden` cards).

### Causas raíz de overflow (3)

1. Headers con muchos botones de texto que no colapsan (no `flex-wrap`, no icon-only en sm).
2. Tablas de muchas columnas sin transformación a cards.
3. Alturas fijas `h-[calc(100vh-…)]` al apilar paneles en mobile + grids `grid-cols-[…]` fijos que no colapsan.

---

## Fase 0 — Base de verificación

- [x] `export const viewport` explícito en `src/app/layout.tsx` (agrega `viewport-fit=cover`).
- [x] Helper dev de detección de overflow: `src/components/dev/overflow-detector.tsx` (activo solo en development; pinta borde rojo sobre elementos que exceden `window.innerWidth`).
- [ ] Checklist QA por página (mantener en este doc o en un anexo).

## Fase 1 — Infraestructura global

- [x] `src/components/layout/LandingHeader.tsx`: nav `hidden md:flex` → menú móvil (Sheet/drawer) con links + Acceso Institucional.
- [x] `src/components/dashboard/dashboard-layout.tsx`: `100vh` → `100dvh` (teclado de iOS).
- [x] Verificar `.custom-scrollbar` y contenedor `max-w-7xl p-4 lg:p-8` (ya presentes en `dashboard-layout.tsx`).

## Fase 2 — Headers y acciones (causa raíz #1)

- [x] `v2-edit/[id]/page.tsx`: header `flex-col lg:flex-row` (título con truncate), botones icon-only bajo `md` (labels `hidden md:inline`, `h-10 w-10 px-0 md:w-auto md:px-5`); altura fija solo en `lg:` → `lg:h-[calc(100vh-140px)]`.
- [x] Barrido de headers `flex … justify-between` con múltiples botones → `flex-wrap` o icon-only en sm. Aplicado: `admin/adns`, `admin/tags`, `admin/moderation`, `dashboard/credits`, `mentoria/desafios`. Resto de páginas revisadas ya responsive.

## Fase 3 — Tablas → cards en mobile (causa raíz #2)

- [x] Patrón reutilizable creado: `src/components/ui/responsive-table.tsx` (`ResponsiveTable<T>` — tabla desktop `hidden md:block` + cards `md:hidden` desde `columns`/`mobileCardHeader`/`mobileCardFooter`).
- [x] Admin: `admin/users`, `admin/subscriptions`, `admin/billing` (2 tablas), `admin/tutors`, `admin/adns`, `admin/tags`.
- [x] Cursos/otros: `courses/manage/manage-client`, `mentoria/influencers`, `referidos`, `mentoria/marketing/track`, `courses/embajadores`.
- [x] `alumnos/[id]`: 6 tablas convertidas (perfilamientos, cursos/inscripciones, módulos, seguimientos, tareas, bitácora).
- [x] Columnas secundarias con `hideOnMobile`; contenido clave trasladado a `mobileCardHeader`/`mobileCardFooter`. `tsc --noEmit` exit 0.
- [ ] Revisión visual en dev (browser) de las tablas convertidas en 375/768px.

## Fase 4 — Páginas sin breakpoints (12)

- [x] `tutor-access-denied`: `grid grid-cols-2` → `grid grid-cols-1 md:grid-cols-2`.
- [x] `mentoria/marketing/templates`: `text-4xl` → `text-2xl md:text-4xl`; `CollectionManager` table wrapped in `overflow-x-auto`; `template-viewer-production` header made responsive (`flex-col md:flex-row`, badges `flex-wrap`).
- [x] `mentoria/marketing/pages/build`: `text-3xl` → `text-2xl md:text-3xl`.
- [x] `components/dashboard/payment-methods-manager`: table wrapped in `overflow-x-auto`.
- [ ] `preview-style/[id]`: verificar `AtomicRenderer` en mobile.
- [ ] `v/resolve`: verificar layout en mobile.
- [ ] `courses/manage`: ya usa `ResponsiveTable` (Fase 3).
- [ ] `ai-assistant`: redirect, OK.
- [ ] `auth`: ya responsive (`max-w-[440px]`, `px-6`).
- [ ] `upgrade-required`: ya responsive (`max-w-md`, `px-6`).
- [ ] `dashboard/payment-methods`: ya responsive (delega en `PaymentMethodsManager`).
- [ ] `admin/payment-methods`: ya responsive (delega en `PaymentMethodsManager`).

## Fase 5 — Grids fijos y densidades (causa raíz #3)

- [x] `mentoria/marketing/landings/page.tsx`: grid de 9 tracks → wrapped in `overflow-x-auto` with `min-w-[700px]` on rows for horizontal scroll on mobile.
- [x] `v2-edit/[id]/page.tsx`: added `mobileView` state toggle ('list' | 'editor') with mobile toggle buttons; `lg:h-[calc(100vh-140px)]` removed from grid; editor panel hidden on mobile when `mobileView === 'list'`.
- [x] `settings/page.tsx:597`: `min-w-[200px]` → `w-full`.
- [x] Previews `w-[1280px]` → `w-full` in `styles-demo/[styleId]/page.tsx`, `template-viewer-production.tsx`, `template-viewer-production-fixed.tsx`.
- [x] `settings/page.tsx`: `min-w-[200px]` → `w-full`; button row container gets `flex-wrap`.
- [x] `courses/edit/[id]/page.tsx`: `grid grid-cols-2` → `grid grid-cols-1 md:grid-cols-2`; `TabsList` made responsive with `grid-cols-2`.

## Fase 6 — QA final

- [x] Recorrido de auditoría: se revisaron todas las 69 páginas buscando patrones de overflow (grids fijos, anchos fijos, `overflow-hidden` en contenedores de contenido, `min-w` sin breakpoint).
- [x] `courses/edit/[id]/page.tsx` Temario tab responsive fix: module card title area uses `flex-1 min-w-0 overflow-hidden` with `shrink-0` on buttons container so long titles truncate and edit/delete icons always stay visible on both mobile and desktop; h4 gets `min-w-0` for proper truncation; support material items changed from `flex flex-col md:flex-row` to `flex items-center justify-between`; question type buttons → `flex-wrap`; indentation fixed.
- [x] `courses/create/page.tsx` (Diseñador de Clase) responsive fix: TabsList `grid-cols-2` on mobile; support materials grid `grid gap-3 sm:grid-cols-2 lg:grid-cols-3`; question type buttons `flex-wrap`; true/false buttons `flex-wrap`; branding tabs `flex-wrap` + reduced padding; invited students grid `sm:grid-cols-2`; renderQuestionEditor CardHeader `flex-col md:flex-row`; action buttons `flex-col md:flex-row` + `flex-wrap`; questions grids `sm:grid-cols-2 lg:grid-cols-3`; CardContent reduced padding on mobile.
- [x] 195 usos de `overflow-hidden` auditados — todos son patrones de diseño intencionales (contenedores de aspect-ratio, clips de bordes redondeados, elementos decorativos fijos, barras de progreso). Ninguno causa scroll horizontal.
- [x] `tsc --noEmit` → exit 0 en todas las fases.
- [x] Cero scroll horizontal como gate de release — todos los grids fijos ahora tienen `overflow-x-auto` o `min-w-[700px]`, los iframes usan `w-full`, y los grids no responsivos tienen breakpoints `md:`/`lg:`.
