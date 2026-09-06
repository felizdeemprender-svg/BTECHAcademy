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

---

## Ecosistema WhatsApp Bot & Live Chat (Fastoria)

### 1. Infraestructura VPS & Docker
- **Host VPS:** `166.1.85.188` (`host-8af258.ns.truo.co`), Ubuntu 24.
- **Reverse Proxy SSL:** Nginx sobre `https://bilon.pagarqr.ar` con header de seguridad `x-internal-proxy-token: fastoria_proxy_token_98374fa21bc894de01`.
  - Evolution API: `https://bilon.pagarqr.ar/fastoria-evolution/` (puerto local `18081`).
  - Worker Fastify: `https://bilon.pagarqr.ar/fastoria-worker/` (puerto local `13002`).
- **Base de Datos & Vector Search:** PostgreSQL 16 con extensión `pgvector` (`fastoria-postgres`) + Redis 7 (`fastoria-redis`).
- **Línea Oficial Conectada:** `+54 9 11 7641-1666` (`5491176411666`).
- **Instancia Baileys:** `fastoria` (Evolution API v2.3.6).

### 2. Claves y Tokens de Autenticación
- **Evolution API Key:** `fastoria_evo_key_8f92a10b45cd2e1a87` (header `apikey`).
- **Worker Secret API Key:** `fastoria_secret_api_key_2026` (header `x-api-key`).
- **OpenRouter LLM:** `sk-or-v1-879c...` (Modelo principal: `deepseek/deepseek-chat-v3.1`).

### 3. Grupos de Derivación (Handoff)
- **Ventas Fastoria:** `120363412233530296@g.us`
- **Fastoria Soporte:** `120363413305659507@g.us`
- **Mecanismo de respuesta bidireccional:**
  - Cuando un asesor responde en el grupo (citando o directamente), el worker reenvía el mensaje al WhatsApp privado del cliente.
  - Al recibir una intervención humana, la conversación pasa automáticamente a `mode: 'HUMAN'` para pausar las respuestas de la IA.

### 4. Reglas de Normalización & Anti-Loop en Webhooks
- **Prevención de bucles:** Descartar mensajes salientes (`direction: 'outbound'` / `fromMe: true`) en chats privados, pero **procesar siempre con prioridad** los mensajes de grupos (`isGroup: true`) para permitir el reenvío de respuestas del equipo.
- **Identificadores WhatsApp LID:** En multi-dispositivo, WhatsApp envía JIDs `@lid`. Si no viene `remoteJidAlt` / `participantPn`, conservar el JID `@lid` para que Evolution API lo despache vía Baileys sin forzar validación de número inexistente.

### 5. Panel de Control y Live Chat
- **Ruta Admin:** `/admin/whatsapp-bot` (restringido a rol `admin`).
- **Pestañas:**
  1. *Live Chat & Mensajes:* Bandeja en tiempo real, visor de historial, alternador de modo (Bot vs Humano) y composer de respuestas manuales.
  2. *Conexión & QR:* Estado de conexión de Evolution API y código QR / código de emparejamiento.
  3. *Comportamiento & IA:* Prompt del sistema, tono, temperatura y JIDs de grupos.
  4. *Base RAG:* Documentos indexados y botón "Sincronizar Catálogo" (lee de Firestore `subscriptionPlans`).
- **Proxy Endpoint:** `/api/admin/whatsapp-bot` en Next.js.
- **Widget Web:** `<WhatsAppFloatingButton />` en `src/components/ui/whatsapp-floating-button.tsx` apuntando a `5491176411666`.

---

## Estado de referencia

- Dev server: `http://localhost:9002`
- `tsc --noEmit`: baseline 50 errores preexistentes; los cambios deben aportar 0 errores nuevos.
- Variables de entorno para motores de video en `/api/video/generate`: `GOOGLE_GENAI_API_KEY` (Omni/Gemini) y `AIVIDEO_API_KEY` (Video Largo, AI Video API `long-video` 4–180s). Sin `AIVIDEO_API_KEY`, el branch F falla con "No se ha configurado AIVIDEO_API_KEY".
- Landings v1: el render monolítico en `v/[id]/page.tsx` está **congelado**, no tocar literales hardcodeados; los tutores reharán con v2. La v2 tiene infra DTCG ✅ (builder `v2-build`, renderer `atomic-renderer.tsx`, editor `v2-edit`) y restyling estético a editorial-plano ✅ (31 Jul 2026).
- Shell del dashboard: **editorial-plano** decidido (31 Jul 2026) — `--card-radius: 0.75rem`, `--card-shadow: none`, `--card-border: 1px solid var(--border)`; sin `rounded-[2rem+]`, sin `shadow-3xl/2xl/xl`, sin `border-none` en Cards. No reintroducir estética redondeada.
- Shape canónico de `branding`: `{ primaryColor, logoUrl }`.
