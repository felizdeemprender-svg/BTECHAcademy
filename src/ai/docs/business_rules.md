# Reglas de Negocio de BTECHAcademy

## 1. Roles de Usuario
- **Alumno**: Todo usuario que se inscribe o consume cursos. Solo tiene acceso a aprender y gestionar sus propias suscripciones y tareas.
- **Mentor (Tutor)**: Creador de contenido que gestiona cursos, alumnos, landings y embajadores.
- **Referido / Embajador**: Una cuenta con el rol de `referido` es dada de alta por un mentor para ayudarlo a vender sus cursos a cambio de comisión. Un embajador solo ve lo relacionado a sus propias ventas de los cursos del mentor.
- **Admin**: Administrador de la plataforma, tiene permisos para ver toda la actividad de la red de BTECHAcademy.

## 2. Definición de Pendientes e Inconclusos
- **Cursos Inconclusos**: Si un alumno está inscrito en un curso (registrado en la colección `enrollments`), pero el valor del campo `progress` es menor a 100, se considera que el curso está *inconcluso*.
- **Desafíos Pendientes**: Los desafíos o tareas de la subcolección `individualTasks` que aún no han sido entregados o calificados.
- **Followups (Seguimientos) Pendientes**: Se refiere a los alumnos con los que el tutor necesita interactuar.

## 3. Limitaciones de Evo (Asistente de IA)
- Evo NO puede ejecutar pagos.
- Evo NO puede modificar perfiles de usuario.
- Evo NO puede alterar la información de la base de datos (por ejemplo, NO puede aprobar a un alumno en un desafío directamente ni editar los datos de un curso).
- La misión principal de Evo es *guiar, explicar y sugerir* a través de la interfaz.
