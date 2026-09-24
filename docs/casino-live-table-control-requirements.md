# Sistema de Control de Mesas Vivas — Requerimientos

## Casino Portable & Multiplataforma

**Documento:** Requerimientos Funcionales y No Funcionales  
**Versión:** 1.0  
**Fecha:** 11 Septiembre 2026  
**Clasificación:** Confidencial — Uso Interno  

---

## 0. Documento de Visión

### 0.1 Propósito
Definir los requerimientos completos para un sistema de control de mesas vivas (Live Table Control System) destinado a un casino, construido con tecnología portable y multiplataforma, siguiendo las mejores prácticas de seguridad, circuitos administrativos y cumplimiento regulatorio de la industria del juego.

### 0.2 Alcance
El sistema debe cubrir toda la operación de mesas vivas: gestión de jugadores en mesa, control de fichas/chips, administración de crupieres, monitoreo en tiempo real, reportes financieros, circuitos administrativos de cierre apertura, y cumplimiento con regulaciones de gaming (GLI-GSF, VGCCC, GLI-13, GLI-4).

### 0.3 Plataforma Objetivo
- **Portable:** Tablets industriales, dispositivos móviles robustos para crupieres y supervisores de piso.
- **Multiplataforma:** iOS, Android, Web (PWA) para administración remota; escritorio Windows/macOS para gerencia.
- **Backend:** Servidor central en instalaciones seguras del casino (on-premise o VPS dedicado).

---

## 1. Referencias Normativas y Estándares

| Estándar | Aplicación |
|----------|-----------|
| **GLI-GSF-4** (Gaming Information Security) | Seguridad lógica y física del ecosistema |
| **GLI-GSF-13** (MCS — Monitoring & Control System) | Protocolos de comunicación, metering, eventos significativos |
| **GLI-13 v2.1** | Requerimientos de sistemas de monitoreo en línea |
| **VGCCC TRD** | Requerimientos técnicos para equipos de juego |
| **PCI-DSS 4.0** | Protección de datos de tarjetas de pago |
| **ISO/IEC 27001:2022** | Sistema de Gestión de Seguridad de la Información |
| **CIS Controls v8** | Controles de seguridad fundamentales |
| **FIPS 140-2 / ISO/IEC 19790** | Módulos criptográficos |
| **SOX / Responsabilidad Financiera** | Circuitos administrativos y auditoría financiera |

---

## 2. Requerimientos Funcionales (FR)

### 2.1 Gestión de Jugadores en Mesa

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| FR-001 | El sistema debe permitir el registro de jugadores en mesa (check-in) mediante escaneo de tarjeta de jugador, NFC, o búsqueda manual. | **Must** |
| FR-002 | Debe soportar buy-in digital con saldo cargado desde cuenta del jugador o compra de fichas con efectivo/tarjeta. | **Must** |
| FR-003 | El sistema debe rastrear tiempo de juego, apuestas promedio, y nivel de consumo por jugador en mesa. | **Must** |
| FR-004 | Debe permitir el registro de salida (check-out) con cálculo automático de ganancias/pérdidas. | **Must** |
| FR-005 | Soporte para pre-compromiso de límites de pérdida (responsible gaming integrado). | **Must** |
| FR-006 | Debe permitir la asignación de jugadores a crupieres específicos y seguimiento de rotación. | **Should** |

### 2.2 Control de Fichas y Economía de Mesa

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| FR-010 | El sistema debe mantener un inventario en tiempo real de fichas por denominación por mesa. | **Must** |
| FR-011 | Debe soportar la emisión de fichas con trazabilidad completa (origen, monto, jugador, timestamp). | **Must** |
| FR-012 | Debe registrar cada transacción de fichas: compra, canje, transferencia entre mesas, devolución. | **Must** |
| FR-013 | Debe permitir la conciliación automática de fichas al cierre de mesa (hard count vs. sistema). | **Must** |
| FR-014 | Soporte para buy-in sin efectivo (cashless) mediante billetera digital vinculada al jugador. | **Should** |
| FR-015 | El sistema debe detectar anomalías en la circulación de fichas (conteo negativo, transferencias sospechosas). | **Must** |

### 2.3 Gestión de Crupieres y Personal de Piso

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| FR-020 | Registro digital del crupier asignado a cada mesa con autenticación (badge/RFID/biometría). | **Must** |
| FR-021 | Registro de horarios de entrada/salida del crupier con timestamp y firma digital. | **Must** |
| FR-022 | Soporte para rotación de crupieres durante turno con registro de transición. | **Should** |
| FR-023 | El sistema debe registrar quién abrió/cerró cada mesa y cuándo. | **Must** |
| FR-024 | Gestión de permisos jerárquicos para supervisores, gerentes de piso, y administradores. | **Must** |
| FR-025 | Registro de comps, markers y créditos otorgados por personal de piso con autorización. | **Must** |

### 2.4 Circuitos Administrativos de Cierre y Apertura

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| FR-030 | **Circuito de Apertura:** Validación de fondo de caja, inventario de fichas inicial, conteo de efectivo de caja. | **Must** |
| FR-031 | **Circuito de Cierre:** Cierre de caja, conciliación de fichas, comparativa de efectivo vs. sistema, generación de reporte de cierre. | **Must** |
| FR-032 | El sistema debe generar un "Cash Drop" (retiro de caja) con registro de monto, responsable, y testigo. | **Must** |
| FR-033 | Soporte para múltiples rondas de cash drop durante el turno. | **Should** |
| FR-034 | Generación automática de formularios de cierre con firma digital de crupier, supervisor, y gerente. | **Must** |
| FR-035 | Bloqueo automático de mesa después de cierre sin autorización administrativa. | **Must** |
| FR-036 | Reconciliación automática GGR (Gross Gaming Revenue) por mesa, por turno, por juego. | **Must** |

### 2.5 Monitoreo y Alertas en Tiempo Real

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| FR-040 | Dashboard en tiempo real de estado de todas las mesas (abierta, cerrada, en mantenimiento, fuera de servicio). | **Must** |
| FR-041 | Alertas automáticas por: tiempo de juego excesivo, pérdida crítica del jugador, comportamiento sospechoso, discrepancia de conteo. | **Must** |
| FR-042 | Monitoreo de velocidad de juego (hands per hour) y comparativa contra promedio histórico. | **Should** |
| FR-043 | Notificaciones push/SMS/email para eventos críticos (alerta de seguridad, caída de comunicación). | **Must** |
| FR-044 | Vista consolidada del piso del casino con estado de todas las mesas en un solo dashboard. | **Must** |

### 2.6 Eventos Significativos y Logging

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| FR-050 | Registro de todos los eventos significativos con mínimo 99% de exactitud en comunicación (GLI-13 §3.1). | **Must** |
| FR-051 | Eventos significativos incluyen: buy-in, check-out, ganancia/perdida mayor a umbral, cambio de crupier, apertura/cierre de caja, transferencia de fichas, alerta de seguridad. | **Must** |
| FR-052 | Los logs de eventos deben ser inmutables — no permitir modificación directa de registros en base de datos. | **Must** |
| FR-053 | Buffer local de datos ante pérdida de comunicación con servidor central (información preservada hasta reconexión). | **Must** |
| FR-054 | Retención de logs por mínimo 7 años (requerimiento regulatorio estándar). | **Must** |
| FR-055 | Capacidad de búsqueda y filtrado de eventos significativos con interfaz de auditoría. | **Must** |

### 2.7 Reportes y Análisis

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| FR-060 | Reportes de ingresos por mesa, por juego, por turno, por crupier. | **Must** |
| FR-061 | Reporte de GGR (Gross Gaming Revenue) con desglose por período. | **Must** |
| FR-062 | Reportes de cumplimiento de responsible gaming (tiempo jugado, pérdidas acumuladas, self-exclusion). | **Must** |
| FR-063 | Reportes financieros para auditoría externa con formatos estándar (PDF, CSV, XLSX). | **Must** |
| FR-064 | Dashboards ejecutivos con KPIs: ocupación de mesas, promedio de buy-in, tiempo promedio de juego, win rate por mesa. | **Should** |
| FR-065 | Reporte de anomalías y fraudes detectados con detalle completo. | **Must** |

---

## 3. Requerimientos No Funcionales (NFR)

### 3.1 Seguridad

| ID | Requerimiento | Estándar |
|----|---------------|----------|
| NFR-001 | **Autenticación Multifactor (MFA)** para todo acceso administrativo y de supervisor. | GLI-GSF-4, CIS 5 |
| NFR-002 | **RBAC (Role-Based Access Control)** con principio de mínimo privilegio. Roles: crupier, supervisor de piso, gerente, administrador, auditor. | GLI-GSF-4 §6.1 |
| NFR-003 | Cierre automático de sesión tras **15 minutos de inactividad** en dispositivos portátiles (configurable por rol). | CIS 4.3 |
| NFR-004 | **Cifrado de datos en tránsito** mediante TLS 1.3 para todas las comunicaciones. | PCI-DSS, GLI-13 §3.1 |
| NFR-005 | **Cifrado de datos en reposo** usando AES-256 para bases de datos y almacenamiento local. | FIPS 140-2 |
| NFR-006 | Segmentación de red: la red de gaming debe estar **lógicamente y/o físicamente separada** de redes corporativas, invitados, y WiFi público. | GLI-GSF-4 §8.3 |
| NFR-007 | Firewall con política **implicit-deny** para todo tráfico entre segmentos de red. | GLI-GSF-4 §8.3 |
| NFR-008 | Detección de dispositivos no autorizados en la red de gaming (scan semanal automatizado). | CIS 1.2 |
| NFR-009 | **Logging de acceso** a todos los sistemas con registro de intentos fallidos, bloqueo tras intentos excesivos. | GLI-13 §3.5.1 |
| NFR-010 | **Integridad de software:** verificación criptográfica de que el software del sistema no ha sido alterado. | GLI-13 §3.6.5, GLI-GSF-4 |
| NFR-011 | Protección contra manipulación física de dispositivos portátiles (tamper-evident, cajas selladas). | VGCCC TRD §3 |
| NFR-012 | **Protección de datos de jugadores (PII):** cumplimiento con regulaciones de privacidad aplicables. | ISO 27001, regulación local |
| NFR-013 | Gestión de claves criptográficas con rotación periódica y almacenamiento seguro (HSM o equivalente). | GLI-GSF-4 |
| NFR-014 | Acceso remoto al sistema solo con MFA, supervisión y monitoreo continuo. | GLI-GSF-4 §7 |

### 3.2 Disponibilidad y Confiabilidad

| ID | Requerimiento | Valor |
|----|---------------|-------|
| NFR-020 | **Disponibilidad mínima:** 99.9% uptime operativo durante horarios de operación del casino. | SL-A |
| NFR-021 | **Tiempo de recuperación (RTO):** < 5 minutos ante fallo de componente no catastrófico. | SL-A |
| NFR-022 | **Punto de recuperación (RPO):** < 30 segundos de pérdida de datos máximo ante fallo catastrófico. | SL-A |
| NFR-023 | **Redundancia:** Componentes redundantes en servidor central (base de datos, servidor de aplicaciones, comunicación). | GLI-13 §3.7 |
| NFR-024 | **Failover automático** entre servidor primario y secundario sin interrupción del servicio de mesa. | SL-A |
| NFR-025 | **Buffering local** en dispositivos portátiles: operación continua ante pérdida de conectividad, sincronización al restablecerse. | GLI-13 §2.1.4 |
| NFR-026 | Batería de respaldo en dispositivos portátiles con autonomía mínima de 8 horas. | SL-B |

### 3.3 Rendimiento

| ID | Requerimiento | Valor |
|----|---------------|-------|
| NFR-030 | **Latencia de respuesta:** < 500ms para operaciones CRUD en interfaz de mesa. | SL-A |
| NFR-031 | **Tiempo de carga de dashboard:** < 3 segundos para vista completa del piso. | SL-B |
| NFR-032 | **Concurrent users:** Soporte para mínimo 500 sesiones simultáneas (50 mesas × 10 roles). | SL-B |
| NFR-033 | **Throughput:** Mínimo 100 transacciones por segundo en el pico de operación. | SL-B |

### 3.4 Usabilidad

| ID | Requerimiento | Valor |
|----|---------------|-------|
| NFR-040 | Interfaz de usuario **intuitiva** para crupieres con mínimo 1 hora de entrenamiento. | SL-A |
| NFR-041 | Diseño **responsive** que funcione en tablets (7"-13"), smartphones, y monitores de escritorio. | SL-A |
| NFR-042 | **Modo offline** funcional para operaciones críticas (registro de jugadores, buy-in, cierre). | SL-A |
| NFR-043 | Soporte multilingüe (mínimo español e inglés, con capacidad de añadir idiomas). | SL-B |
| NFR-044 | Accesibilidad conforme con WCAG 2.1 AA. | SL-C |

### 3.5 Mantenibilidad y Escalabilidad

| ID | Requerimiento | Valor |
|----|---------------|-------|
| NFR-050 | Arquitectura **modular** que permita añadir nuevas mesas, juegos, o módulos sin rediseño. | SL-A |
| NFR-051 | **CI/CD pipeline** con testing automatizado (unit, integration, E2E) y despliegue sin downtime. | SL-B |
| NFR-052 | **Actualizaciones OTA (Over-The-Air)** para dispositivos portátiles con rollback automático. | SL-B |
| NFR-053 | Capacidad de escalar horizontalmente para soportar casino de 200+ mesas. | SL-B |
| NFR-054 | Documentación técnica completa con arquitectura, APIs, y procedimientos de operación. | SL-B |

---

## 4. Arquitectura del Sistema

### 4.1 Diagrama de Componentes (Descripción)

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐ │
│  │App Table │  │Admin Web │  │  PWA     │  │  Desktop App   │ │
│  │(Tablet)  │  │(Gerencia)│  │(Móvil)   │  │  (Escritorio)  │ │
│  │Android/iOS│ │React/TS  │ │React Native│ │  Electron/TS   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬────────┘ │
└───────┼──────────────┼─────────────┼─────────────────┼──────────┘
        │              │             │                  │
        ▼              ▼             ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CAPA DE SEGURIDAD                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────────┐ │
│  │  MFA     │  │  RBAC    │  │  Cifrado (TLS 1.3 / AES-256) │ │
│  │  Engine  │  │  Manager │  │  Key Management (HSM)        │ │
│  └──────────┘  └──────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CAPA DE APLICACIÓN (API Gateway)              │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────────────┐│
│  │  Mesa Service │  │  Player       │  │  Admin & Reporting   ││
│  │  (CRUD mesas, │  │  Service      │  │  Service             ││
│  │  eventos)     │  │  (registro,   │  │  (KPIs, reportes,    ││
│  │               │  │   fichas)     │  │   circuitos admin)   ││
│  └───────────────┘  └───────────────┘  └──────────────────────┘│
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────────────┐│
│  │  Alert        │  │  Auth Service │  │  Sync Service        ││
│  │  & Notification│  │  (MFA, JWT)   │  │  (Offline ↔ Online)  ││
│  └───────────────┘  └───────────────┘  └──────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CAPA DE DATOS                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────────────┐│
│  │  PostgreSQL   │  │  Redis        │  │  Event Store         ││
│  │  (Datos       │  │  (Cache,      │  │  (Event Sourcing     ││
│  │   principales)│  │   sesiones,   │  │   inmutable)         ││
│  │               │  │   locks)      │  │                      ││
│  └───────────────┘  └───────────────┘  └──────────────────────┘│
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Backup & Recovery (Replica + WAL Archiving + Cloud)       │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Stack Tecnológico Propuesto

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| **Frontend Tableta** | React Native / Flutter | Multiplataforma iOS/Android, performance nativa, hot reload |
| **Frontend Admin Web** | Next.js / React + TypeScript | SSR, SEO, tipado seguro |
| **Frontend PWA Móvil** | React Native Web | Misma base de código que tableta |
| **Frontend Escritorio** | Electron + React | Cross-platform desktop |
| **API Gateway** | Kong / Nginx + Express.js | Rate limiting, auth, routing |
| **Backend Services** | Node.js / NestJS | TypeScript full-stack, microservicios, escalabilidad |
| **Base de Datos** | PostgreSQL 16 + pgvector | ACID, JSON, extensiones espaciales |
| **Cache / Sesiones** | Redis 7 | Low-latency, pub/sub, sesiones |
| **Event Store** | Apache Kafka / EventStoreDB | Event sourcing, inmutabilidad de logs |
| **Cifrado** | libsodium / AWS KMS / Azure Key Vault | FIPS 140-2 compliant |
| **Autenticación** | Keycloak / Auth0 | OIDC, MFA, RBAC, SSO |
| **Notificaciones** | Firebase Cloud Messaging + WebSocket | Push real-time |
| **CI/CD** | GitHub Actions / GitLab CI | Pipeline automatizado |
| **Contenedores** | Docker + Kubernetes | Escalabilidad, orquestación |
| **Monitoreo** | Prometheus + Grafana + ELK | Observabilidad completa |

---

## 5. Requerimientos de Seguridad Detallados

### 5.1 Circuito Administrativo de Seguridad (GLI-GSF-4 Compliance)

#### 5.1.1 Control de Acceso Físico
- Los dispositivos portátiles deben estar alojados en **cajas cerradas con llave** cuando no están en uso (VGCCC TRD §3).
- Los dispositivos deben tener **sensores de apertura de puerta** que notifiquen al sistema cuando se abre la carcasa (tamper detection).
- El acceso a los servidores centrales debe estar restringido a **servidores seguros** dentro de las instalaciones del casino (GLI-GSF-4 §4).
- **Cobertura de CCTV** sobre servidor y áreas de almacenamiento de dispositivos.

#### 5.1.2 Circuito Administrativo de Cierre (End-of-Day)
1. **Pre-cierre:** Superviso verifica que todas las mesas están listas para cierre.
2. **Cierre de mesa:** Cada mesa genera su reporte de cierre (fichas, efectivo, transacciones).
3. **Conciliación:** Sistema compara conteo físico vs. digital. Discrepancias generan alerta.
4. **Cash Drop:** Retiro de efectivo de caja con registro de monto, responsable, testigo.
5. **Formulario digital:** Firma de crupier, supervisor, gerente.
6. **Generación de reporte GGR:** Automático, inmutable, almacenado en event store.
7. **Bloqueo de mesa:** Mesa se bloquea hasta apertura autorizada del siguiente turno.
8. **Backup de datos:** Sincronización completa al servidor central + almacenamiento externo.

#### 5.1.3 Circuito Administrativo de Apertura (Start-of-Day)
1. **Autenticación de supervisor** con MFA.
2. **Validación de fondo de caja:** Conteo de efectivo inicial ingresado al sistema.
3. **Inventario de fichas inicial:** Registro de fichas por denominación.
4. **Verificación de integridad del sistema:** Check de software no alterado (hash verification).
5. **Activación de mesas:** Habilitación progresiva según disponibilidad.
6. **Registro de apertura:** Timestamp, supervisor responsable, configuración del día.

### 5.2 Protección contra Fraude

| Tipo de Fraude | Control |
|----------------|---------|
| Falsificación de fichas | Trazabilidad digital de cada ficha emitida |
| Conteo manipulado | Conciliación automática hard count vs. sistema |
| Acceso no autorizado a datos | RBAC + MFA + logging completo |
| Modificación de logs inmutables | Event store append-only con hash chaining |
| Colusión entre jugador y crupier | Monitoreo de patrones de juego sospechosos |
| Uso de dispositivos electrónicos prohibidos en mesa | Detección de señal WiFi/BT en área de mesa |
| Robo de datos de jugadores | Cifrado PII + acceso auditado |

---

## 6. Modelo de Datos Esquemático

### 6.1 Entidades Principales

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│     mesa         │    │    jugador        │    │    crupier        │
├──────────────────┤    ├──────────────────┤    ├──────────────────┤
│ id (PK)          │    │ id (PK)          │    │ id (PK)          │
│ numero           │    │ nombre           │    │ nombre           │
│ juego            │    │ dni/tarjeta      │    │ badge_id         │
│ estado           │    │ saldo            │    │ pin_hash         │
│ turno_actual     │    │ tier             │    │ rol              │
│ fecha_apertura   │    │ fecha_registro   │    │ fecha_ingreso    │
│ fecha_cierre     │    │ auto_excluded    │    │ activo           │
│ fondo_caja       │    │ limite_perdida   │    │                  │
│ total_fichas     │    │                  │    │                  │
└────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  transaccion     │    │  evento_significativo│   │  circuito_admin  │
├──────────────────┤    ├──────────────────┤    ├──────────────────┤
│ id (PK)          │    │ id (PK)          │    │ id (PK)          │
│ mesa_id (FK)     │    │ mesa_id (FK)     │    │ mesa_id (FK)     │
│ jugador_id (FK)  │    │ tipo             │    │ tipo (apertura/  │
│ tipo             │    │ descripcion      │    │  cierre/cashdrop)│
│ monto            │    │ timestamp        │    │ fondo_inicial    │
│ fichas_cantidad  │    │ metadata JSON    │    │ fondo_final      │
│ timestamp        │    │ hash_inmutable   │    │ efectivo_caja    │
│ crupier_id (FK)  │    │                  │    │ crupier_id (FK)  │
│ estado           │    │                  │    │ supervisor_id    │
│ verificado       │    │                  │    │ timestamp        │
└──────────────────┘    └──────────────────┘    │ firma_digital    │
                                                │ estado           │
                                                └──────────────────┘
```

---

## 7. Requerimientos de Integración

### 7.1 Sistemas Externos

| Sistema | Protocolo | Propósito |
|---------|-----------|-----------|
| **CMS del Casino** | API REST / WebSocket | Integración con sistema de gestión central del casino |
| **Sistema de Pagos** (Stripe/MercadoPago/GetNet) | API HTTPS | Buy-in cashless, procesamiento de pagos |
| **Sistema de Lealtad** | API REST | Lectura de tier, puntos, promociones |
| **Cámara de Seguridad** | ONVIF / RTSP | Integración con CCTV para auditoría visual |
| **Sistema de Tickets/Vouchers** | API dedicada (GLI-13 §4.5) | Validación de tickets |
| **Regulatory Body Interface** | API segura | Reportes automáticos al organismo regulador |
| **Sistema de Comunicación Interna** | WebSocket | Alertas a supervisores y gerente de piso |

### 7.2 Protocolos de Comunicación (GLI-13 §3.1)
- **Protocolo base:** HTTPS con TLS 1.3
- **Error detection:** CRC-32 para comunicación crítica (99% accuracy)
- **Encryption:** Variable keys para datos sensibles
- **Acknowledgment:** Cada mensaje crítico requiere confirmación de recepción
- **Buffering:** Almacenamiento local ante pérdida de conexión con reacalización automática

---

## 8. Requerimientos de Pruebas y Calidad

### 8.1 Estrategia de Testing

| Nivel | Herramienta | Cobertura | Descripción |
|-------|-------------|-----------|-------------|
| **Unit** | Jest / Vitest | 80%+ | Cada función, servicio, utilidad |
| **Integration** | Supertest / Playwright | 70%+ | APIs, base de datos, servicios |
| **E2E** | Playwright | Flujos críticos | Check-in → juego → checkout → cierre |
| **Security** | OWASP ZAP / Burp Suite | Todas las APIs | Penetration testing mensual |
| **Load** | k6 / Artillery | 1000 concurrentes | Performance bajo pico |
| **Compliance** | GLI-GSF Checklist | 100% | Verificación contra estándares |

### 8.2 Criterios de Aceptación
- Todas las pruebas unitarias pasan (80%+ cobertura)
- Todas las pruebas de integración pasan
- Flujos E2E críticos 100% funcionales
- Sin vulnerabilidades críticas o de alta severidad en escaneo de seguridad
- Cumplimiento 100% con GLI-GSF-4 checklist items aplicables
- Performance: < 500ms respuesta en operaciones críticas
- 99.9% uptime en periodo de pruebas de carga

---

## 9. Plan de Despliegue

### Fase 1 — MVP (Mesas Pilotas) — 4-6 semanas
- [ ] Configuración de infraestructura base (servidor, base de datos, API)
- [ ] App de mesa para tablet (check-in, buy-in, cierre)
- [ ] Dashboard básico de monitoreo
- [ ] Autenticación MFA + RBAC
- [ ] Circuito de cierre de mesa funcional
- [ ] Event logging básico
- [ ] Despliegue en 5 mesas piloto

### Fase 2 — Producción Parcial — 4 semanas
- [ ] App completa con control de fichas
- [ ] Sistema de alertas en tiempo real
- [ ] Reportes de ingresos y GGR
- [ ] Integración con CMS del casino
- [ ] Escalado a 20-30 mesas
- [ ] Testing de seguridad completo
- [ ] Documentación y entrenamiento de personal

### Fase 3 — Producción Completa — 4 semanas
- [ ] Escalado a totalidad de mesas del casino
- [ ] Integración con sistema de pagos (cashless)
- [ ] Integración con sistema de lealtad
- [ ] Integración con CCTV
- [ ] Dashboard ejecutivo avanzado
- [ ] Reportes regulatorios automáticos
- [ ] Monitoreo y soporte 24/7
- [ ] Auditoría de seguridad externa (GLI)

### Fase 4 — Optimización Continua
- [ ] Análisis de patrones y machine learning para detección de fraude
- [ ] Optimización de rendimiento basada en datos reales
- [ ] Nuevas funcionalidades según feedback del personal
- [ ] Actualizaciones de seguridad periódicas
- [ ] Expansión a otros casinos/ubicaciones

---

## 10. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Incumplimiento regulatorio | Media | Crítico | Auditoría GLI-GSF antes de despliegue, consultoría legal |
| Caída de servidor central | Baja | Crítico | Redundancia activa, failover, buffer local en dispositivos |
| Brecha de seguridad | Media | Crítico | MFA, RBAC, segmentación de red, pentesting mensual |
| Resistencia del personal | Media | Alto | Entrenamiento intensivo, interfaz intuitiva, soporte en sitio |
| Problemas de conectividad | Alta | Medio | Offline mode, sincronización diferida, buffering local |
| Integración con CMS fallida | Media | Alto | API contract-first, mock server para testing, plan B |
| Costos de licencias excedidos | Baja | Medio | Uso de software open-source donde sea posible, evaluación de costos |
| Datos corruptos | Baja | Crítico | Backups automáticos, WAL archiving, replicación |

---

## 11. Métricas de Éxito (KPIs)

| KPI | Objetivo | Medición |
|-----|----------|----------|
| Disponibilidad del sistema | ≥ 99.9% | Monitoreo continuo |
| Tiempo de respuesta | < 500ms | Latencia promedio ponderada |
| Precisión de conciliación | 100% | Diferencia cero entre sistema y conteo físico |
| Tiempo de entrenamiento de crupieres | < 2 horas | Evaluación post-entrenamiento |
| Incidencias de seguridad | 0 críticas | Registro de incidentes |
| Satisfacción del personal | ≥ 4.0/5.0 | Encuesta mensual |
| Reducción de tiempo de cierre | ≥ 30% vs. método manual | Comparativa pre/post |
| Cumplimiento regulatorio | 100% | Auditoría externa |

---

## 12. Glossario

| Término | Definición |
|---------|-----------|
| **CMS** | Central Monitoring System — Sistema de monitoreo central del casino |
| **MCS** | Monitoring & Control System — Sistema de monitoreo y control (GLI-13) |
| **GGR** | Gross Gaming Revenue — Ingreso bruto de juego |
| **TITO** | Ticket-In, Ticket-Out — Sistema de boletos electrónicos |
| **Buy-in** | Proceso de registro y compra de fichas del jugador en mesa |
| **Cash Drop** | Retiro de efectivo de la caja de la mesa |
| **Hard Count** | Conteo físico de fichas y efectivo |
| **Comp** | Comodidad/premio otorgado al jugador (comidas, alojamiento) |
| **Marker** | Cheque de crédito extendido al jugador |
| **RBAC** | Role-Based Access Control — Control de acceso basado en roles |
| **MFA** | Multi-Factor Authentication — Autenticación multifactor |
| **FEP** | Front End Processor — Procesador frontal del sistema |
| **RTO** | Recovery Time Objective — Tiempo objetivo de recuperación |
| **RPO** | Recovery Point Objective — Punto objetivo de recuperación |
| **NAC** | Network Admission Control — Control de admisión de red |
| **VLAN** | Virtual Local Area Network — Red local virtual |
| **HSM** | Hardware Security Module — Módulo de seguridad hardware |
| **OI** | Open Interface — Interfaz abierta de comunicación |
| **GISMS** | Gaming Information Security Management System |

---

## Apéndice A: Checklist de Cumplimiento GLI-GSF-4

- [ ] LGIS-1: Inventario de activos (semestral)
- [ ] LGIS-2: Detección de dispositivos no autorizados
- [ ] LGIS-3: Control de acceso lógico (RBAC, MFA, sesión automática)
- [ ] LGIS-4: Servidor seguro en área cerrada con CCTV
- [ ] LGIS-5: Control de acceso físico (tarjetas, logs)
- [ ] LGIS-6: Identificación automática de equipos
- [ ] LGIS-7: Acceso remoto controlado con MFA
- [ ] LGIS-8: Segmentación de red, VLANs, firewalls implicit-deny
- [ ] LGIS-9: Configuración segura de dispositivos
- [ ] LGIS-10: Gestión de vulnerabilidades y parches
- [ ] LGIS-11: Hardening de sistemas
- [ ] LGIS-12: Cierre automático de sesión
- [ ] LGIS-13: Monitoreo de eventos de seguridad
- [ ] LGIS-14: Plan de respuesta a incidentes
- [ ] LGIS-15: Comunicaciones seguras entre componentes

## Apéndice B: Checklist de Cumplimiento GLI-13

- [ ] §2.1: Interface element con comunicación a Data Collector
- [ ] §2.1.3: Batería de respaldo para retención de datos
- [ ] §2.1.4: Buffering de información ante pérdida de comunicación
- [ ] §2.2.1: FEP con datos buffered/logging
- [ ] §2.3.4: Base de datos sin posibilidad de modificación directa
- [ ] §2.4.4: Programa de interrogación de logs de eventos
- [ ] §3.1.1: Protocolo de comunicación con CRC y encryption
- [ ] §3.2.2: Eventos significativos completos
- [ ] §3.2.3: Eventos de prioridad con notificación oportuna
- [ ] §3.3.3: Sin mecanismo de borrado no autorizado de metros
- [ ] §3.5.1: Control de acceso jerárquico con lockout
- [ ] §3.5.2: No alteración de logs sin controles supervisados
- [ ] §3.6.4: Acceso remoto con contraseñas y MFA
- [ ] §3.6.5: Verificación de integridad de software
- [ ] §3.7.1-3.7.2: Redundancia y recuperación ante fallos
- [ ] §4.2.5: Impresión de tickets durante pérdida de comunicación
- [ ] §4.5.1: Seguridad de base de datos de validación

---

*Este documento es propiedad de Felizdeemprender. Cualquier reproducción o distribución debe contar con autorización expresa.*

*Referencias normativas consultadas: GLI-GSF-4, GLI-GSF-13, GLI-13 v2.1, VGCCC Technical Requirements Document, PCI-DSS 4.0, ISO/IEC 27001:2022.*
