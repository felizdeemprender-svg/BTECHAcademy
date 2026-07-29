---
name: Crear Estilos de Landing Page
description: Arquitectura, reglas y pasos para crear nuevos estilos visuales de landing pages (como Classic, Story Lead, Minimal) en FelizdeEmprender.
---

# Arquitectura de Landing Pages en FelizdeEmprender

El sistema de renderizado de landings (`src/app/v/[id]`) utiliza un patrón de **Orquestador -> Renderizadores (Renderers)** para mantener el código atómico, limpio y fácil de escalar.

## Reglas de Oro

1. **`page.tsx` es SOLO un Orquestador:** 
   NUNCA debes escribir HTML de presentación o estilos de UI dentro de `src/app/v/[id]/page.tsx`. Su única responsabilidad es:
   - Cargar datos de Firestore (página, mentor, módulos).
   - Manejar el estado y lógica de pagos (MercadoPago, transferencia).
   - Inferir el `styleId`.
   - Delegar la vista al renderizador correcto pasándole el objeto `RendererProps`.

2. **Aislamiento de Estilos (Atomicidad):**
   Cada estilo debe tener su propio archivo en `src/app/v/[id]/renderers/` (ej. `classic-renderer.tsx`, `story-lead-renderer.tsx`). NO debes compartir o reutilizar HTML entre estilos si eso implica llenarlos de condicionales visuales; es preferible repetir un poco de código UI a acoplar lógicas de estilos diferentes.

3. **Fallback de Tokens de Diseño:**
   Las variantes generadas por IA pueden no tener `designTokens` a nivel individual si se usaron los tokens generales de la colección. Todo renderizador y mockup debe hacer el siguiente fallback:
   `const tokens = content.designTokens || page.designTokens || {};`

4. **Componentes Compartidos de Lógica:**
   Cosas como el diálogo de compra (`PurchaseDialog`) o formateadores de video (`secure-video-url.ts`) van en `src/app/v/[id]/shared/` para ser consumidos por el orquestador o los renderers sin ensuciarlos.

## Pasos para agregar un NUEVO ESTILO (ej. "Minimal")

Si el usuario pide un nuevo estilo de landing, sigue exactamente estos pasos:

1. **Crear el Renderer:**
   Crea `src/app/v/[id]/renderers/minimal-renderer.tsx`. Asegúrate de que implemente la interfaz `RendererProps` (ubicada en `types.ts`).

2. **Registrar en el Orquestador:**
   Abre `src/app/v/[id]/page.tsx`, importa tu nuevo renderer y agrégalo al `switch` o condicional final basado en `styleId === 'minimal'`.

3. **Configurar el Blueprint (Editor AI):**
   Abre `src/app/mentoria/marketing/templates/components/template-viewer-production.tsx`. En la sección de "Secciones Visibles", usa lógica condicional `(editingVariant?.styleId === 'minimal')` para mostrar exactamente qué bloques son configurables para ese estilo específico.

4. **Crear el Mockup de Previsualización:**
   - Añade el archivo de mockup en `src/app/mentoria/marketing/templates/styles/minimal-style.tsx`.
   - Configura datos falsos ("lorem ipsum") coherentes para que se previsualice bien si la IA no generó los datos aún.
   - Enlaza el mockup en `template-mockups.tsx` agregando la condición para llamar a `<MinimalMockup />`.

5. **Ajuste de Video Placeholder:**
   Si el Blueprint permite "Video en Hero", pero la variante no tiene `content.videoUrl` aún, debes mostrar un div de reserva (Placeholder) con el ícono `Video` de lucide-react para que el usuario sepa que ahí irá el video, pero sin romper la estética.

Aplicar esta receta evita código espagueti en `page.tsx` y facilita que los estilos coexistan sin interferirse.
