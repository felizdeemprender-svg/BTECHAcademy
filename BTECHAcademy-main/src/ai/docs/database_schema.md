# Diccionario de Datos: BTECHAcademy

Este documento describe las colecciones principales de la base de datos Firestore y su propósito.

## Colecciones Principales

1. **`courses` (Cursos)**
   - Contiene la información general de los cursos creados.
   - El propietario del curso se identifica mediante el campo `mentorId`.

2. **`enrollments` (Inscripciones)**
   - Relaciona a un alumno (`studentId`) con un curso (`courseId`).
   - Contiene el campo `progress` (número del 0 al 100).
   - Un curso se considera **"inconcluso"** si el alumno tiene un `progress` menor a 100.

3. **`leads` (Prospectos)**
   - Usuarios o contactos interesados en la plataforma o cursos.
   - Se vinculan al tutor mediante el campo `mentorId`.

4. **`followups` (Seguimientos)**
   - Tareas de seguimiento comercial o académico.
   - Se vinculan al tutor mediante el campo `mentorId` y al alumno mediante `studentId`.

5. **`salesPages` (Landings / Embudos)**
   - Páginas de aterrizaje o embudos de venta creados por un tutor.
   - Vinculados mediante el campo `mentorId`.

6. **`campaigns` (Campañas de Marketing)**
   - Campañas activas creadas por un tutor/marketing.
   - Vinculados mediante `mentorId`.

7. **`mentorInfluencers/{mentorId}/referidos` (Embajadores o Referidos)**
   - Sub-colección que almacena a los embajadores o referidos dados de alta por un tutor.
   - **Nota importante**: No es una colección de primer nivel. Siempre se debe consultar como sub-colección del documento del mentor.

8. **`users/{uid}/individualTasks` (Tareas Individuales)**
   - Sub-colección que almacena las tareas pendientes de un usuario específico.
