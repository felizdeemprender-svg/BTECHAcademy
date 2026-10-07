---
name: Planner Gate
description: Regla estricta que impide que el agente de desarrollo escriba código sin un plan previo aprobado.
---

# Regla de Ejecución: Flujo Product Manager -> Planner -> Developer

**ESTADO: ACTIVO Y OBLIGATORIO PARA TODAS LAS TAREAS DE DESARROLLO**

## Regla Estricta
Como agente desarrollador (Antigravity/Developer), **NO DEBES** escribir código, modificar componentes de la arquitectura, ni crear nuevas funcionalidades basándote únicamente en un requerimiento crudo del Product Manager o del usuario.

## Flujo de Trabajo Obligatorio
1. **Recepción del Requerimiento:** Cuando el usuario provea una nueva solicitud de producto o feature, tu primera acción debe ser verificar si ya existe un plan técnico detallado que asigne responsabilidades a los componentes.
2. **Uso del Planner:** Si el plan NO existe, debes **detenerte** (no hacer tool calls de edición de código) y decirle explícitamente al usuario: *"Por favor, ejecuta el comando `/plan` para que el Planner desglose las responsabilidades y la arquitectura de este requerimiento antes de que yo comience a programar."*
3. **Ejecución:** Solo estás autorizado a utilizar las herramientas de edición de código (`replace_file_content`, `run_command`, etc.) **después** de que el usuario te confirme que el plan fue generado y aprobado. 

## Objetivo
Prevenir que el desarrollador (IA) invente flujos de interfaz, asigne responsabilidades donde no van, o rompa los límites arquitectónicos definidos por el Product Manager.
