// Reading material for the beginner track. Activities remain in basics.js.
const BASIC_THEORY = [
  {
    title:'Qué hace RAG y por qué lo necesitamos',
    sections:[
      ['El modelo y la información de tu organización','Un modelo de lenguaje aprende patrones durante su entrenamiento y los utiliza para interpretar y redactar texto. Eso no significa que conozca el manual interno de una empresa, una política recién modificada o un informe privado. Tampoco basta con que su respuesta suene convincente: necesitamos saber de dónde sale el dato.'],
      ['Consultar antes de redactar','RAG añade una búsqueda de información a la preparación de la respuesta. La aplicación recibe la pregunta, encuentra material pertinente y entrega esos fragmentos al modelo junto con las instrucciones. El modelo usa ese contexto para redactar. Recuperar información y generar texto son dos funciones distintas, aunque un mismo servicio pueda ofrecer ambas.'],
      ['Un ejemplo concreto','Si preguntas por el plazo para reclamar una factura, el sistema debe encontrar la política que establece ese plazo. En nuestro caso ficticio, C6 indica 30 días. Una respuesta útil expresa el plazo y referencia C6 para que puedas comprobarlo. Si solo encuentra un reporte sobre una reparación, todavía le falta la evidencia necesaria.'],
      ['Qué cambia y qué no','En este flujo los documentos se incorporan al contexto de la consulta; no se reentrena el modelo con cada archivo. RAG puede mejorar el acceso a información específica, pero no garantiza una respuesta correcta. Hay que comprobar que la fuente sea adecuada y vigente, y que el modelo la represente fielmente.']
    ],
    diagram:[['Necesidad','Conocer una política'],['Evidencia','Encontrar el apartado'],['Respuesta','Explicar y citar']],
    caption:'El documento aporta el dato; el modelo ayuda a expresarlo.',
    takeaway:'RAG es un proceso para responder con información recuperada. No es, por sí solo, una garantía de verdad.'
  },
  {
    title:'Cómo llega un documento hasta una respuesta',
    sections:[
      ['1. Preparar las fuentes','Antes de responder preguntas, la aplicación reúne los documentos que puede utilizar, extrae su contenido y conserva datos como el título, la fecha, el identificador y los permisos. La calidad de esta preparación importa: una tabla mal interpretada o una fecha perdida pueden cambiar el significado de una fuente.'],
      ['2. Dividir y organizar','Los documentos largos suelen dividirse en fragmentos. Un fragmento debe ser suficientemente específico para encontrarlo y suficientemente completo para entenderlo. Separar una regla de su excepción puede producir una respuesta engañosa. Después se crea un índice, una estructura que permite buscar esos fragmentos sin leer todo el archivo en cada consulta.'],
      ['3. Buscar al recibir una pregunta','La búsqueda puede comparar palabras, significado o ambos. Para un nombre exacto, las palabras pueden ser especialmente útiles; para una pregunta formulada de otra manera, la similitud de significado puede ayudar. La aplicación selecciona candidatos, respeta el acceso del usuario y decide cuáles incluir en el contexto disponible.'],
      ['4. Redactar y revisar','El modelo recibe la pregunta y los fragmentos seleccionados. La respuesta debe reflejar lo que esos textos permiten afirmar y señalar las fuentes. Si falta un dato, el sistema puede hacer una búsqueda más específica o explicar la limitación. Cuando cambian los documentos, también hay que actualizar su representación en el índice.']
    ],
    diagram:[['Preparación','Documentos → índice'],['Consulta','Pregunta → fragmentos'],['Resultado','Respuesta → revisión']],
    caption:'Preparar la biblioteca y responder preguntas son momentos diferentes del mismo sistema.',
    takeaway:'Un error puede aparecer al preparar los datos, buscar, seleccionar contexto o redactar. Identificar la etapa ayuda a corregirlo.'
  },
  {
    title:'Cómo se conectan las palabras del vocabulario',
    sections:[
      ['Documento, fragmento y metadatos','El documento es la fuente completa. Un chunk es un fragmento de esa fuente. Los metadatos describen su origen o sus condiciones de uso: por ejemplo, el identificador C6, la fecha de vigencia o el grupo de usuarios autorizado. El fragmento no debería perder esa conexión con el documento original.'],
      ['Índice y recuperación','El índice es una estructura para encontrar contenido. Retrieval, o recuperación, es la operación de buscar y seleccionar candidatos en ese índice u otra fuente de datos. No todos los resultados encontrados son respuestas: algunos pueden compartir palabras con la pregunta sin contener el dato solicitado.'],
      ['Embedding y similitud','Un embedding representa aspectos del contenido mediante una lista de números. Permite comparar representaciones y encontrar contenido relacionado, aunque no use exactamente las mismas palabras. Esa proximidad es una señal para buscar, no una prueba de que un pasaje responda correctamente. RAG también puede usar búsqueda por palabras sin embeddings.'],
      ['Contexto, modelo y cita','El contexto es la información disponible para el modelo en esa interacción, incluidos los fragmentos que la aplicación seleccionó. El modelo genera la respuesta. Una cita identifica la fuente de una afirmación y permite revisarla. Que una respuesta muestre [C6] no demuestra que C6 la apoye: hay que comprobar la relación.']
    ],
    diagram:[['Fuente','Documento + metadatos'],['Búsqueda','Índice → fragmentos'],['Modelo','Contexto → respuesta con citas']],
    caption:'Cada término nombra una pieza o una operación; no todos se refieren al modelo.',
    takeaway:'El índice ayuda a encontrar; el contexto contiene lo seleccionado; el modelo redacta; la cita permite verificar.'
  },
  {
    title:'Cómo decidir si la evidencia alcanza',
    sections:[
      ['Empieza por el dato que necesitas','Antes de buscar, expresa qué debe establecer la respuesta. “¿Cuándo reabrió el muelle?” pide una fecha de reapertura. Un documento sobre una pieza de repuesto puede estar relacionado con el incidente, pero no necesariamente contiene esa fecha. Relevancia temática y evidencia suficiente no son lo mismo.'],
      ['Selecciona el texto que realmente responde','En la práctica usarás tres fuentes: C6 contiene la política de facturas, C7 la fecha de reapertura y C4 la entrega de un repuesto. Para responder el plazo de reclamación, C6 basta. Añadir documentos irrelevantes no mejora automáticamente la respuesta y puede distraer del dato importante.'],
      ['Separa encontrar y afirmar','Imagina que seleccionas correctamente C7, pero la respuesta dice que el muelle abrió el día 13. La recuperación encontró el material correcto; falló su uso al redactar. Si C7 nunca llegó al contexto, el problema está antes. Esta distinción permite corregir el sistema sin cambiar componentes que sí funcionaron.'],
      ['Reconoce la información que falta','Ninguno de esos tres documentos indica el costo de la avería. El asistente debe explicar esa ausencia. En un sistema más amplio podría buscar otra fuente autorizada, pero no debería inventar un importe. La práctica te deja cambiar tanto la pregunta como los documentos para observar estos casos.']
    ],
    diagram:[['Pregunta','¿Qué dato hace falta?'],['Fuente','¿Lo establece?'],['Respuesta','Afirmar con apoyo o indicar la falta']],
    caption:'La práctica es una simulación: tú eliges las fuentes y observas una respuesta preparada para cada caso.',
    takeaway:'Un buen resultado no siempre es una respuesta completa. A veces es identificar con precisión qué información falta.'
  },
  {
    title:'Cuándo RAG es una buena opción',
    sections:[
      ['Preguntas sobre documentación','RAG encaja cuando necesitas responder con información de manuales, políticas, reportes o documentación de un producto. Por ejemplo, un asistente de soporte puede recuperar el procedimiento correspondiente a una versión concreta y explicar sus pasos con referencias. La elección de fuentes y su actualización forman parte del trabajo.'],
      ['Tareas que ya tienen todo el contexto','Si pegas un párrafo y pides reescribirlo, el texto necesario ya está en la conversación. No siempre hace falta una búsqueda adicional. Primero identifica la información que la tarea requiere; después decide si hay que recuperarla y desde dónde. Añadir componentes sin esa necesidad puede complicar la solución.'],
      ['Datos operativos y entrenamiento','Para saber el estado actual de un pedido puede convenir consultar una API o una base de datos autorizada. Una copia de documentos indexados podría estar desactualizada. El fine-tuning es otra técnica: ajusta el modelo mediante entrenamiento. Puede combinarse con RAG, pero no es lo mismo que proporcionar fuentes durante una consulta.'],
      ['Las condiciones para confiar','Hay que cuidar la vigencia de las fuentes, los permisos del usuario, la calidad de la búsqueda y el apoyo de cada afirmación. Un documento privado no se vuelve público por estar indexado. Una fuente equivocada tampoco se vuelve correcta porque el modelo la cite. La evaluación debe revisar tanto la evidencia recuperada como la respuesta final.']
    ],
    diagram:[['Tarea','¿Qué necesitas saber?'],['Origen','Documento, dato operativo o texto dado'],['Método','Elegir cómo obtenerlo y responder']],
    caption:'La necesidad de información determina el camino; una sola técnica no resuelve todas las tareas.',
    takeaway:'Empieza por la pregunta y sus fuentes. Usa RAG cuando recuperar información ayude a cumplir esa necesidad.'
  },
  {
    title:'Las ideas que debes llevar al curso completo',
    sections:[
      ['La cadena esencial','Un sistema RAG conecta una pregunta con fuentes y utiliza la información seleccionada para generar una respuesta. Preparar los documentos, recuperarlos y redactar son responsabilidades diferentes. No necesitas conocer todavía todas las herramientas para entender esa cadena.'],
      ['Qué significa estar bien fundamentado','Una afirmación está respaldada cuando la evidencia disponible permite sostenerla. No basta con que parezca razonable o coincida por casualidad con la realidad. Las citas hacen revisable la respuesta; hay que comprobar que correspondan al contenido citado. Cuando una fuente no establece un dato, la respuesta debe reconocerlo.'],
      ['Cómo seguir aprendiendo','El curso completo desarrolla estas ideas con más profundidad. BM25 estudia la búsqueda por palabras; los vectores, la búsqueda por similitud; RRF combina rankings. Después aparecen rutas de búsqueda, conexiones entre documentos, revisión de afirmaciones y recuperación adicional cuando falta evidencia.'],
      ['De la explicación a la construcción','Primero comprende qué aporta cada etapa. Luego utiliza los ejemplos y experimentos para practicar, y las secciones de AWS para estudiar la implementación con Terraform, CloudFormation o CDK en Python. La comprobación de este paso evalúa los conceptos básicos; no exige desplegar servicios ni escribir código.']
    ],
    diagram:[['Comprender','Conceptos y fuentes'],['Practicar','Probar y revisar'],['Construir','Implementar y medir']],
    caption:'Las explicaciones, los ejercicios y la implementación se complementan.',
    takeaway:'Antes de construir algo más complejo, debes poder explicar qué evidencia necesita la respuesta y cómo comprobarla.'
  }
];
