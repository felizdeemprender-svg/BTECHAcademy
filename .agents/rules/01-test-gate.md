---
name: Test Gate
description: Regla que rige la ejecución de tests durante el desarrollo y cierre de ramas.
---

# Regla de Ejecución: Test Gate (Tests Obligatorios)

**ESTADO: ACTIVO Y OBLIGATORIO PARA TODAS LAS TAREAS DE DESARROLLO**

## Flujo de Trabajo
Como agente desarrollador (Antigravity/Developer), debes seguir el siguiente protocolo de testing:

### 1. Desarrollo Puntual (Durante la tarea)
- Mientras estás desarrollando una funcionalidad o arreglando un bug, **SÓLO es necesario que ejecutes y asegures que pasen los tests de los archivos involucrados directamente en tus cambios**.
- Puedes ejecutar tests específicos utilizando: `npx vitest run path/al/archivo.test.ts`.
- Esto permite agilizar el ciclo de desarrollo sin esperar a que corra toda la suite en cada pequeño cambio.

### 2. Cierre de Branch (Al terminar completamente)
- **NO PUEDES** dar por terminada una tarea final ni prepararte para cerrar la rama/branch si no has verificado que **TODA LA APLICACIÓN** sigue funcionando.
- Antes de entregar el desarrollo finalizado, **ESTÁS OBLIGADO** a ejecutar la suite completa: `npx vitest run`.
- Debes esperar el resultado. Si algún test en otra parte de la aplicación se rompe (regresión), debes arreglarlo antes de dar por terminada la tarea.
- Solo puedes considerar la rama lista para cierre cuando la ejecución global finalice exitosamente con 0 fallos.
