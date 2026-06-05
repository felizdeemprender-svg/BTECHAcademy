# **App Name**: Evolución Académica AI

## Core Features:

- Gestión de Usuarios y Roles: Permite el registro de usuarios a través de Google Sign-In y la asignación de roles específicos (alumno, mentor, administrador), controlando el acceso a funcionalidades y secciones de la plataforma.
- Creación y Gestión de Cursos: Mentores y administradores pueden crear, configurar y organizar cursos, definiendo sus propiedades, requisitos, módulos y metadatos relevantes.
- Consumo de Contenido Educativo: Los alumnos pueden acceder a los cursos asignados, visualizar módulos con contenido diverso (videos incrustados, textos), y el sistema rastrea y marca automáticamente su progreso.
- Evaluaciones y Quizzes: Proporciona quizzes interactivos para cada módulo, permitiendo a los alumnos responder preguntas, recibir corrección automática y seguimiento de su desempeño.
- Generación Inteligente de Preguntas (Tool): Un tool impulsado por Gemini 2.5 Pro que automáticamente genera preguntas de evaluación de diversos formatos (opción múltiple, verdadero/falso) a partir del contenido de videos (mediante transcripción Speech-to-Text) y documentos, basándose en el contexto del curso.
- Ingesta y Análisis de Contenido Documental (Tool): Permite a los mentores subir documentos (PDF/Word) para que Document AI procese y extraiga su texto, el cual puede ser utilizado para alimentar módulos del curso o como fuente para la generación de preguntas con IA.
- Paneles de Control por Rol: Ofrece dashboards personalizados y diferenciados para cada tipo de usuario (alumno, mentor, administrador), mostrando información relevante como progreso en cursos, estadísticas de enseñanza, insights y opciones de gestión según su rol.
- Generación de Temas para Cursos: Los mentores/profesores pueden generar automáticamente sugerencias de temas para nuevos cursos, utilizando IA para identificar tendencias o basarse en contenido existente.
- Incorporación de Logos Personalizados: Los mentores/profesores tienen la capacidad de subir y asociar logos personalizados a sus cursos, mejorando la identidad visual y marca de cada oferta educativa.

## Style Guidelines:

- La paleta de colores adopta un esquema claro para fomentar la legibilidad en sesiones de estudio prolongadas. El color primario es un azul violáceo profundo (#3B2D86), que inspira conocimiento e innovación, evitando el azul corporativo convencional. El color de fondo es un lila muy claro y desaturado (#F0EEF6), casi blanco, que armoniza sutilmente con el primario y reduce la fatiga visual. Un azul vibrante (#2680E5) se usa como acento para elementos interactivos y llamadas a la acción, asegurando un contraste claro.
- Para títulos y elementos destacables, se recomienda la tipografía 'Space Grotesk' (sans-serif), que aporta una estética tecnológica y moderna. Para el cuerpo de texto, 'Inter' (sans-serif) ofrece una excelente legibilidad y neutralidad, ideal para el contenido educativo. Si se muestran fragmentos de código, 'Source Code Pro' (monoespaciada) es la elección óptima.
- Se utilizarán íconos de estilo lineal y minimalista para representar conceptos de aprendizaje, herramientas de IA y funcionalidades de gestión. Deberán ser claros y consistentes, manteniendo una sensación moderna y accesible.
- El diseño de la interfaz será limpio, con énfasis en una estructura clara y un espacio en blanco generoso. Los formularios se presentarán de manera guiada en varios pasos para simplificar procesos complejos como la creación de cursos, y los dashboards serán intuitivos y fácilmente escaneables.
- Las animaciones serán sutiles y funcionales, utilizadas para indicar progreso (por ejemplo, al completar un módulo o enviar un quiz) y para transiciones fluidas entre secciones, mejorando la experiencia del usuario sin distraer.