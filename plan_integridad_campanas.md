# Plan de Integridad de Campañas ADN

**Objetivo:** Eliminar la opción de borrar campañas/videos y de configurar campañas como "Automáticas" por defecto (o en su totalidad, según corresponda), ya que la automatización y el borrado rompen la integridad del embudo (funnel) planificado por la IA.

## Fases del Plan

### Fase 1: Prevención de Borrado en el Productor de Campañas ADN (`/marketing/pages`)
- **Problema:** Actualmente el usuario puede eliminar una "Sales Page" (que funciona como la base de la campaña generada) desde la lista del Productor de Campañas. Si elimina la página/campaña o borra un video generado, el plan de coordinación queda huérfano y los cronjobs fallarán al no encontrar los recursos multimedia.
- **Acción:**
  - Ocultar o eliminar por completo el botón de "Eliminar" (ícono de papelera) en la vista de lista de Productor de Campañas (`src/app/marketing/pages/page.tsx`).
  - (Opcional) Bloquear desde el backend `DELETE /api/sales-pages/[id]` si la página ya tiene una campaña asociada.

### Fase 2: Prevención de Borrado en Coordinación (`/marketing`)
- **Problema:** En el Centro de Mando / Coordinación, existe un dropdown con la opción de "Eliminar campaña".
- **Acción:**
  - Eliminar el `DropdownMenuItem` que invoca `handleDeleteCampaign` en `src/app/marketing/page.tsx`.
  - (Opcional) Desactivar el endpoint `DELETE /api/campaigns/[id]` en el backend o restringirlo.

### Fase 3: Desactivación del concepto "Campaña Automática"
- **Problema:** El Product Owner ha definido que "ya no tiene sentido tener campaña automática". El ciclo de vida ahora requiere siempre aprobación manual (sellar pieza) y la ejecución se rige por ese estado.
- **Acción:**
  - Retirar o deshabilitar el switch de "Piloto Automático" que se encuentra en el Centro de Mando (`src/app/marketing/page.tsx`).
  - Asegurar que el sistema no intente "ejecutar automáticamente" nada basándose en esa flag, sino basándose estrictamente en si la campaña está en `productionStatus: 'ready_to_publish'` y llegó la fecha correspondiente.

## Próximos pasos
Si estás de acuerdo con estas 3 fases, procederé a implementarlas en el código. Por favor aprueba el plan.
