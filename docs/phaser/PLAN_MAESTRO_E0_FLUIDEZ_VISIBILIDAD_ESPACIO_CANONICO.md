# PLAN MAESTRO — E0 FLUIDEZ TEMPORAL, VISIBILIDAD Y ESPACIO CANÓNICO

**Proyecto:** Dark Moon  
**Hito:** E0 previo al Plan Maestro de Mazmorras Expandidas e Interfaz Fullscreen  
**Idioma obligatorio:** Español para código nuevo, nombres técnicos nuevos, comentarios, documentación y configuraciones nuevas.  
**Fuente de verdad de implementación:** el repositorio real entregado al iniciar cada etapa/subetapa.  
**Estado:** Plan maestro rector. Antes de modificar código debe realizarse análisis del repositorio real, propuesta técnica concreta y aprobación explícita del usuario.

---

## 1. Propósito del hito

Este hito existe para resolver y preparar cuatro necesidades antes de aumentar el tamaño de los mapas, la cantidad de enemigos y la complejidad visual de Dark Moon:

1. eliminar la acumulación incontrolada de órdenes del jugador mientras el juego todavía está representando acciones anteriores;
2. reducir cálculos innecesarios de IA y percepción sin cambiar las reglas reales del juego;
3. crear una infraestructura espacial y de línea de visión única, canónica y extensible para terreno, entidades y zonas dinámicas;
4. incorporar campo de visión y descubrimiento del mapa de forma que el motor siga simulando el mundo completo, pero Phaser solo represente aquello que el jugador puede percibir o que sea visualmente relevante.

El objetivo no es hacer que todos los enemigos actúen visualmente al mismo tiempo. Dark Moon debe conservar la lectura de juego por turnos.

El principio visual del hito es:

> **Las acciones visibles mantienen su orden y se representan secuencialmente. Las acciones que el jugador no puede ver continúan ocurriendo en la lógica canónica, pero no deben generar animaciones ni esperas visuales innecesarias.**

---

# 2. Relación con el Plan Maestro de Mazmorras e Interfaz

E0 debe completarse **antes** de iniciar el Plan Maestro de Mazmorras Expandidas e Interfaz Fullscreen.

E0 no reemplaza ese plan. Lo prepara.

Las reglas arquitectónicas, visuales y metodológicas definidas para el Plan Maestro de Mazmorras e Interfaz también son obligatorias aquí.

E0 debe dejar una base que pueda soportar posteriormente:

- mapas mucho mayores;
- 30, 40 o más enemigos distribuidos por el mapa;
- puertas;
- cofres;
- barriles;
- objetos decorativos con colisión;
- humo, nubes tóxicas y otras zonas que alteren visión;
- IA con movimiento aleatorio;
- patrullaje;
- seguimiento de entidades;
- persecución;
- futuras profesiones que modifiquen Percepción;
- futuras pasivas, auras, objetos y estados que modifiquen Percepción o visión.

**No se implementarán anticipadamente esas mecánicas salvo las necesarias para validar los contratos de E0.**

---

# 3. Principios arquitectónicos obligatorios

Durante todo el hito debe mantenerse, siempre que sea posible:

- una sola lógica canónica;
- un solo estado real;
- un solo cálculo de movimiento;
- un solo cálculo de combate;
- una sola resolución de muerte;
- una sola entrega de experiencia;
- una sola entrega de botín;
- una sola persistencia;
- datos configurables;
- integración genérica;
- ausencia de excepciones por nombre visible.

Debe evitarse expresamente:

- duplicar motores dentro de Phaser;
- usar la duración de una animación como regla real;
- crear reglas de combate en escenas;
- crear reglas de IA en sprites;
- leer o escribir DOM desde múltiples lugares sin contrato;
- identificar habilidades, enemigos, mapas o entidades por su nombre mostrado;
- crear configuraciones paralelas;
- acoplar recursos a rutas dispersas;
- migrar inventario o paneles solamente para decir que están en Phaser;
- modificar contratos fundamentales sin explicar la necesidad;
- usar visibilidad gráfica de Phaser como autoridad para decidir si una entidad existe, actúa, se mueve o puede ser detectada;
- detener la simulación de un enemigo solamente porque no se está dibujando;
- introducir casos especiales del tipo `si es Puerta`, `si es Barril`, `si es Humo` dentro de los cálculos generales cuando la propiedad pueda expresarse mediante un contrato genérico.

### Flujo canónico obligatorio

```text
Entrada
  ↓
Lógica canónica
  ↓
Resultado canónico
  ↓
Evento o estado visual
  ↓
Phaser o HTML representa el resultado
```

Phaser y HTML son capas de representación. No son la autoridad de las reglas del juego.

---

# 4. Decisiones de diseño ya cerradas

## 4.1 Las acciones visibles NO se agrupan

No se implementará como solución general que varios enemigos visibles caminen o actúen simultáneamente.

Si el orden canónico es:

```text
Enemigo A se mueve
Enemigo B se mueve
Enemigo C ataca
Jugador vuelve a actuar
```

la presentación visible debe conservar esa lectura temporal.

El rendimiento se buscará principalmente mediante:

- eliminación de cálculos innecesarios;
- eliminación de animaciones invisibles;
- eliminación de esperas visuales invisibles;
- filtrado de representación;
- medición real antes de introducir optimizaciones más profundas.

## 4.2 El mundo completo sigue simulándose

Un enemigo fuera del campo de visión puede, en el futuro:

- esperar;
- moverse aleatoriamente;
- patrullar;
- seguir a otra entidad;
- perseguir;
- huir;
- ejecutar otro comportamiento definido por IA.

La falta de representación visual **no debe congelar su estado real**.

## 4.3 Percepción del jugador

El jugador tendrá una estadística canónica de **Percepción**.

Reglas cerradas:

- valor base inicial: **10**;
- no aumenta automáticamente al subir de nivel;
- no depende de Fuerza;
- no depende de Destreza;
- no depende de Constitución;
- no depende de Inteligencia;
- no depende de Sabiduría;
- no depende de Carisma;
- no se recalcula como consecuencia indirecta de aumentar esos atributos.

Percepción podrá modificarse en el futuro mediante fuentes explícitas, por ejemplo:

- pasivas;
- auras;
- objetos equipados;
- efectos o estados;
- profesiones y sus bonificaciones.

La implementación debe permitir modificadores genéricos sin introducir excepciones por profesión, objeto o nombre visible.

Conceptualmente:

```text
Percepción actual
=
Percepción base (10)
+
modificadores canónicos aplicables
```

El alcance visual del jugador debe derivarse de la Percepción mediante **un único cálculo canónico**. La fórmula exacta deberá confirmarse al analizar el repositorio y proponerse explícitamente antes de implementar. No debe existir un radio de visión duplicado dentro de Phaser o `Mapas.json`.

---

# 5. Configuración canónica de visibilidad por mapa

`Mapas.json` continúa siendo el canon para definir el comportamiento del mapa.

El mapa **no define cuánto ve el jugador**.

El mapa define qué mecanismos de visibilidad utiliza.

Conceptualmente debe poder expresar al menos:

```json
"visibilidad": {
  "descubrimiento": true,
  "campoVisible": true
}
```

Los nombres finales se confirmarán al revisar el esquema real de `Mapas.json`.

## 5.1 Campo visible

Cuando `campoVisible` está activo:

- se calcula qué casillas están visibles actualmente desde el jugador;
- las entidades no visibles no deben mostrarse normalmente;
- las acciones completamente fuera de la percepción visual del jugador no deben introducir espera visual;
- paredes y obstrucciones dinámicas deben cortar la visión según el sistema espacial canónico.

Cuando está desactivado:

- el mapa no aplica restricción por campo visual;
- no debe existir un radio artificial definido por el mapa.

## 5.2 Descubrimiento

Cuando `descubrimiento` está activo:

- debe mantenerse un estado canónico de casillas descubiertas;
- una casilla descubierta permanece conocida aunque deje de estar actualmente visible;
- la representación puede mostrarla oscurecida, pero no debe revelar entidades dinámicas que ya no sean visibles.

Cuando está desactivado:

- no se conserva una memoria de exploración mediante este sistema.

## 5.3 Ejemplo de uso

Mazmorra:

```text
descubrimiento = sí
campoVisible = sí
```

Ciudad abierta:

```text
descubrimiento = no
campoVisible = no
```

Las combinaciones deben ser tratadas mediante configuración y contratos, nunca mediante comparaciones con el nombre visible del mapa.

---

# 6. Sistema espacial canónico

E0 debe introducir o consolidar **una única autoridad para consultar propiedades espaciales**.

El nombre definitivo debe decidirse después de analizar el repositorio real. Conceptualmente puede corresponder a algo como `SistemaEspacial`, `ConsultaEspacial` o equivalente en español.

Su responsabilidad no es mover entidades ni resolver combate. Su responsabilidad es responder preguntas espaciales comunes de manera canónica.

Como mínimo debe permitir responder:

```text
¿La posición bloquea movimiento?
¿La posición bloquea visión?
```

Estas dos propiedades son independientes.

## 6.1 Combinaciones obligatorias

| Ejemplo | Bloquea movimiento | Bloquea visión |
|---|---:|---:|
| Suelo normal | No | No |
| Pared | Sí | Sí |
| Puerta cerrada | Sí | Sí |
| Puerta abierta | No | No |
| Barril | Sí | No |
| Cofre | Sí | No |
| Decoración sólida | Sí | No |
| Nube tóxica densa | No | Sí |
| Humo | No | Sí |

El sistema debe admitir las cuatro combinaciones sin identificar el tipo por nombre.

## 6.2 Fuentes de obstrucción

Una casilla puede contener simultáneamente información proveniente de:

```text
Terreno
+
Entidades
+
Zonas o efectos espaciales
```

Ejemplo:

```text
Suelo        → no bloquea movimiento / no bloquea visión
Barril       → bloquea movimiento / no bloquea visión
Humo         → no bloquea movimiento / bloquea visión
```

Resultado canónico de la casilla:

```text
bloqueaMovimiento = sí
bloqueaVision = sí
```

La combinación debe depender de propiedades, no del nombre del objeto.

## 6.3 Propiedades dinámicas

El contrato debe admitir propiedades que cambian durante la partida.

Ejemplo futuro de puerta:

```text
CERRADA
bloqueaMovimiento = sí
bloqueaVision = sí

ABIERTA
bloqueaMovimiento = no
bloqueaVision = no
```

Los consumidores no deberían necesitar saber que la entidad es una puerta. Deben consultar el estado espacial actual.

## 6.4 Extensibilidad

No se agregarán propiedades futuras sin necesidad real, pero el contrato no debe impedir ampliar en el futuro consultas ortogonales como bloqueo de proyectiles, sonido u otras si el diseño lo requiere.

---

# 7. Línea de visión canónica

Dark Moon ya posee lógica de línea de visión. E0 debe evitar crear una segunda implementación.

La línea de visión deberá evolucionar para consultar el sistema espacial canónico en vez de depender únicamente de una representación rígida del terreno.

Conceptualmente:

```text
Evaluar línea de visión
        ↓
Consultar obstrucción visual canónica
        ↓
Terreno + entidades + zonas
```

La misma autoridad geométrica deberá ser reutilizable por:

- percepción enemiga;
- campo de visión del jugador;
- selección de objetivos cuando una habilidad exija visión;
- ataques que dependan de visión;
- futuros sistemas que requieran la misma pregunta geométrica.

No deben existir versiones distintas de línea de visión para jugador, enemigo y Phaser.

**Importante:** línea de visión y trayectoria física de un proyectil no se asumirán idénticas para siempre. Si en el futuro aparece una necesidad distinta, deberá incorporarse como contrato explícito y no como excepción oculta.

---

# 8. Optimización de percepción e IA

## 8.1 Optimización inmediata aprobada

Antes de ejecutar un cálculo de línea de visión para detectar al jugador, la IA deberá descartar primero los casos donde la distancia ya hace imposible la detección.

Flujo deseado:

```text
Calcular comprobación barata de distancia/rango
        ↓
¿Puede estar dentro del alcance de percepción?
        ├─ No → terminar detección
        └─ Sí → evaluar línea de visión
```

Debe preservarse exactamente el resultado jugable actual. Es una optimización, no una nueva regla de IA.

## 8.2 Preparación para comportamientos futuros

E0 no debe diseñar la IA suponiendo que solamente existen dos estados: quieto y persecución.

Los contratos deben poder admitir a mediano plazo comportamientos como:

- movimiento aleatorio;
- patrullaje;
- seguimiento de otra entidad;
- persecución;
- espera;
- huida;
- otras conductas futuras.

La visibilidad del jugador no debe decidir si la IA actúa.

La IA produce un resultado canónico. Después se decide si ese resultado tiene representación visual para el jugador.

## 8.3 Pathfinding

No se reemplazará anticipadamente el algoritmo de pathfinding únicamente por el crecimiento futuro esperado.

E0 deberá medir el coste real con escenarios de estrés.

Si después de las optimizaciones aprobadas el pathfinding se convierte en un cuello de botella demostrable, deberá presentarse una propuesta separada antes de modificar su contrato o algoritmo.

---

# 9. Control canónico de entrada del jugador

## 9.1 Problema a resolver

Actualmente pueden acumularse comandos mientras la lógica ya ha resuelto acciones, pero Phaser todavía está reproduciendo su representación.

Eso produce una cola de órdenes que el jugador ya no puede controlar.

## 9.2 Regla obligatoria

Cuando el juego acepta una acción temporal del jugador:

```text
Aceptar UNA acción
        ↓
Bloquear nuevas entradas jugables
        ↓
Resolver lógica canónica
        ↓
Representar eventos visualmente relevantes
        ↓
Alcanzar punto seguro de sincronización
        ↓
Habilitar entrada jugable
```

Las entradas recibidas durante el bloqueo:

- se ignoran;
- no se almacenan;
- no se ejecutan posteriormente;
- no forman una cola futura.

## 9.3 Autoridad del bloqueo

El bloqueo debe estar en un punto central de la aplicación y proteger cualquier entrada jugable equivalente:

- teclado;
- clic sobre mundo;
- habilidades;
- futuros controles.

No debe resolverse solamente desactivando un listener de teclado concreto si eso deja otras rutas de entrada abiertas.

El control de entrada puede esperar a la presentación visual, pero **la animación no cambia la lógica ni el orden temporal real**.

---

# 10. Sistema de visibilidad del jugador

E0 debe incorporar una autoridad canónica de visibilidad, conceptualmente `SistemaVisibilidadJugador` o equivalente en español.

Debe conocer:

- posición canónica del jugador;
- Percepción actual del jugador;
- configuración de visibilidad del mapa;
- obstrucciones visuales proporcionadas por el sistema espacial canónico.

Debe producir, como mínimo:

```text
casillas visibles actualmente
casillas descubiertas históricamente
```

Phaser recibe el resultado. Phaser no lo calcula.

## 10.1 Recalculo

La visibilidad debe actualizarse cuando una modificación canónica pueda cambiar el resultado, por ejemplo:

- movimiento del jugador;
- apertura/cierre futuro de una puerta;
- aparición/desaparición futura de humo;
- cambio de Percepción;
- cambio de mapa;
- cualquier otro cambio espacial relevante.

No debe depender del `update()` gráfico como fuente de verdad.

## 10.2 Estado descubierto

`casillasDescubiertas` es estado real del sistema de exploración cuando el mapa usa descubrimiento.

Debe existir una única fuente de verdad y una estrategia explícita para persistencia si corresponde al modelo actual de partida. No debe crearse una segunda memoria de descubrimiento dentro de Phaser.

---

# 11. Simulación completa y representación filtrada

## 11.1 Regla central

El motor puede contener 30 o 40 enemigos.

Todos continúan formando parte del estado real y del sistema temporal según las reglas canónicas.

Phaser no necesita mostrar ni animar a todos.

```text
Motor completo
   ↓
Visibilidad / relevancia visual canónica
   ↓
Representación necesaria
```

## 11.2 Enemigo fuera de visión

Un enemigo fuera de visión puede cambiar de posición o estado en el motor.

Si la acción es completamente invisible y no tiene una consecuencia visual perceptible para el jugador:

- no debe reproducirse una animación;
- no debe introducir una espera artificial de presentación;
- no debe obligar a Phaser a simular visualmente el movimiento oculto.

## 11.3 Enemigo visible

Si la acción es visible:

- se representa;
- conserva el orden canónico;
- no se agrupa automáticamente con otros enemigos;
- combate y movimiento visible siguen siendo legibles como acciones por turnos.

## 11.4 Entrada y salida del campo visual

La implementación debe definir correctamente los casos:

- enemigo visible → se mueve y continúa visible;
- enemigo visible → sale del campo visual;
- enemigo oculto → entra al campo visual;
- enemigo oculto → continúa oculto;
- una obstrucción aparece o desaparece y cambia la visibilidad sin movimiento.

La relevancia visual no debe calcularse solamente contra el estado final del lote completo. Debe conservar suficiente información canónica para representar correctamente las transiciones que el jugador realmente debería percibir.

## 11.5 Acciones ocultas con consecuencias visibles

No se debe asumir que `actor invisible = evento irrelevante`.

Si en el futuro una acción originada fuera de visión produce una consecuencia perceptible sobre el jugador o una casilla visible, el sistema deberá poder generar la retroalimentación adecuada sin revelar necesariamente al actor.

E0 debe dejar el contrato preparado para esta distinción aunque no implemente todos los casos futuros.

---

# 12. Presentación de niebla y campo visual

Toda representación debe respetar:

`docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`

Dirección vigente:

> Fantasía medieval 2D ilustrada, estilizada y luminosa, con vista superior o tres cuartos y lectura táctica por casillas.

Prioridades:

1. comprensión;
2. lectura de casillas;
3. claridad del personaje y enemigos;
4. respuesta de acciones;
5. atmósfera;
6. detalle decorativo.

Conceptualmente se necesitan tres estados visuales cuando ambos mecanismos están activos:

```text
NO DESCUBIERTO
→ oculto / negro

DESCUBIERTO PERO NO VISIBLE
→ terreno conocido, claramente oscurecido
→ sin revelar entidades dinámicas actuales

VISIBLE AHORA
→ representación normal
```

El tratamiento gráfico exacto deberá validarse dentro del juego. No se aprobará únicamente mediante captura estática.

---

# 13. Subetapas del hito E0

El hito se divide en **cuatro subetapas**, manteniendo un alcance pequeño y verificable.

## E0.1 — Control de entrada y medición base

### Objetivo

Eliminar la cola incontrolable de órdenes y establecer una línea base de rendimiento antes de cambiar percepción o visibilidad.

### Incluye

- identificar todas las rutas reales de entrada jugable;
- implementar bloqueo central durante resolución/presentación pendiente;
- descartar entradas recibidas durante el bloqueo;
- comprobar que mantener una tecla no genera órdenes posteriores fuera de control;
- instrumentación temporal mínima o mecanismo de diagnóstico para separar coste lógico y coste visual;
- registrar una línea base reproducible con el mapa y enemigos actuales.

### No incluye

- FOV;
- niebla;
- nueva IA;
- agrupación de movimientos.

### Cierre

Debe demostrarse que el jugador recupera control exactamente cuando corresponde y que no queda una cola residual de comandos.

---

## E0.2 — Espacio canónico, obstrucciones y línea de visión

### Objetivo

Crear una sola fuente de verdad para `bloqueaMovimiento` y `bloqueaVision`, y hacer que la línea de visión canónica pueda considerar terreno, entidades y zonas.

### Incluye

- analizar cómo se resuelve hoy la colisión/movimiento;
- diseñar el contrato espacial sin duplicar movimiento;
- introducir las dos propiedades independientes;
- adaptar la línea de visión existente para consultar el contrato canónico;
- optimizar detección enemiga comprobando primero el rango barato;
- validar las cuatro combinaciones de bloqueo mediante fixtures/pruebas representativas aunque todavía no existan todos los objetos finales del Master Plan.

### Restricción crítica

No crear un segundo cálculo de movimiento. Si el movimiento actual ya posee una autoridad válida, el nuevo sistema deberá integrarse con ella o extraer una consulta común, no competir con ella.

---

## E0.3 — Percepción, FOV y descubrimiento

### Objetivo

Introducir Percepción base 10 y un sistema canónico de visibilidad del jugador configurable por mapa.

### Incluye

- Percepción base 10 en el modelo canónico adecuado;
- modificadores genéricos preparados, sin depender de atributos principales;
- único cálculo de alcance visual;
- configuración `descubrimiento` / `campoVisible` en `Mapas.json` o extensión coherente del esquema real;
- `SistemaVisibilidadJugador` o equivalente;
- casillas visibles;
- casillas descubiertas;
- reacción ante cambios de posición y obstrucción;
- integración visual de no descubierto / descubierto no visible / visible;
- enemigos no visibles no representados como información actual.

### Restricción crítica

El radio de visión no se configura en el mapa ni en Phaser.

---

## E0.4 — Filtrado visual, escala y regresión

### Objetivo

Evitar que acciones invisibles generen coste visual, conservar la secuencia de acciones visibles y comprobar que la arquitectura escala antes de iniciar las mazmorras grandes.

### Incluye

- clasificar eventos según relevancia visual sin cambiar el resultado canónico;
- no animar ni esperar movimientos completamente invisibles;
- mantener movimiento y combate visibles en orden secuencial;
- verificar entrada/salida de enemigos del FOV;
- pruebas con cantidades crecientes de enemigos, incluyendo escenarios objetivo de 30–40 entidades;
- medir por separado lógica, IA/pathfinding y presentación;
- regresión completa de movimiento, combate, efectos, habilidades y turnos;
- decidir únicamente con mediciones si queda un cuello de botella que justifique un trabajo posterior.

### No incluye por defecto

- reemplazar pathfinding;
- IA de patrulla;
- IA aleatoria;
- seguimiento;
- puertas funcionales;
- humo funcional final;
- nuevas entidades de mazmorra.

---

# 14. Criterios de validación funcional

E0 no puede cerrarse si no se comprueba como mínimo:

- una acción del jugador no puede generar una cola involuntaria de acciones futuras;
- las teclas pulsadas durante el bloqueo se descartan;
- el orden temporal canónico no cambia por las animaciones;
- los enemigos visibles actúan visualmente en el orden correcto;
- los enemigos invisibles siguen actuando en el motor cuando sus reglas lo indican;
- los movimientos invisibles no producen esperas visuales innecesarias;
- una pared bloquea movimiento y visión;
- un obstáculo sólido transparente puede bloquear movimiento sin bloquear visión;
- una obstrucción visual no sólida puede bloquear visión sin bloquear movimiento;
- una entidad/estado dinámico puede cambiar esas propiedades sin casos especiales por nombre;
- la detección enemiga mantiene el mismo comportamiento observable tras la optimización de rango;
- Percepción del jugador comienza en 10;
- Percepción no cambia al aumentar Fuerza, Destreza, Constitución, Inteligencia, Sabiduría o Carisma;
- los modificadores de Percepción pueden incorporarse mediante una vía genérica;
- un mapa con FOV/descubrimiento activo funciona correctamente;
- un mapa con ambos desactivados no aplica niebla artificial;
- una entidad fuera de visión no se revela mediante la capa gráfica;
- el terreno descubierto pero no visible no revela el estado dinámico actual de enemigos;
- entrada y salida del campo visual se representan correctamente.

---

# 15. Criterios de validación de rendimiento

No se fijará un umbral arbitrario sin medir el entorno real, pero el cierre debe incluir comparación antes/después.

Como mínimo deben medirse escenarios equivalentes con:

- población actual;
- aproximadamente 15 enemigos;
- aproximadamente 30 enemigos;
- aproximadamente 40 enemigos cuando el mapa de prueba lo permita.

Separar, cuando sea posible:

```text
tiempo de lógica canónica
tiempo de percepción/IA
tiempo de pathfinding
tiempo de generación de eventos
tiempo de presentación visual
```

El objetivo de E0 no es que 40 enemigos visibles simultáneamente sean instantáneos.

El objetivo es que **tener 40 enemigos distribuidos por un mapa no obligue al jugador a esperar animaciones de entidades que no puede ver y no dispare cálculos innecesarios evitables**.

---

# 16. Validación gráfica obligatoria

Ningún cambio visual se considera terminado solamente porque se vea bien en una captura.

Debe comprobarse:

- dentro del juego;
- en movimiento;
- con selección;
- con paneles;
- con zoom;
- con redimensionamiento;
- con varios enemigos;
- con efectos superpuestos;
- con transiciones visible/no visible;
- con terreno descubierto y no visible;
- en la versión web;
- en Electron cuando corresponda al estado del proyecto.

---

# 17. Metodología obligatoria de trabajo

Cada subetapa debe seguir este flujo:

```text
1. Recibir repositorio real actualizado
2. Verificar estado Git / SHA / rama si están disponibles
3. Analizar implementación existente
4. Explicar qué se encontró de forma comprensible
5. Presentar propuesta concreta
6. Detallar archivos afectados
7. Detallar contratos que se reutilizan
8. Explicar cualquier cambio de contrato fundamental
9. Indicar riesgos y qué NO se tocará
10. Esperar aprobación explícita del usuario
11. Implementar solamente lo aprobado
12. Validar técnicamente
13. Entregar instrucciones de prueba manual
14. Esperar validación del usuario cuando corresponda
15. Preparar commit message detallado
16. Dejar enganche claro a la siguiente subetapa
```

**No implementar antes de la aprobación explícita.**

Si durante la implementación aparece una necesidad que cambia el alcance o un contrato fundamental, detenerse, explicarla y pedir aprobación.

---

# 18. Documentación

Durante E0 debe mantenerse coherencia con:

- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`;
- el documento funcional vigente del proyecto;
- el Plan Maestro de Mazmorras Expandidas e Interfaz Fullscreen, que comenzará después de E0.

Al cerrar E0 deberá actualizarse la documentación visual/funcional pertinente para dejar asentado el comportamiento de:

- Percepción;
- campo visible;
- descubrimiento;
- obstrucciones de visión;
- separación entre simulación canónica y representación visible.

No crear documentación histórica redundante si el repositorio mantiene una política de documentos canónicos únicos.

---

# 19. Fuera de alcance de E0

Salvo necesidad técnica demostrada y aprobada, E0 no implementará:

- generador nuevo de mazmorras;
- aumento definitivo de tamaño de mapas;
- población procedural;
- puertas jugables completas;
- cofres;
- barriles finales;
- humo o nube tóxica como contenido terminado;
- patrullaje;
- movimiento aleatorio;
- seguimiento;
- profesiones;
- balance de Percepción mediante profesiones;
- minimapa;
- iluminación avanzada;
- stealth completo;
- sonido como sistema de percepción;
- sustitución de inventario/paneles por Phaser;
- nuevo pathfinding sin evidencia de necesidad.

Fixtures o entidades mínimas de prueba podrán utilizarse únicamente si son necesarias para demostrar los contratos espaciales.

---

# 20. Definición de terminado del hito

E0 queda terminado únicamente cuando:

1. la cola de entrada incontrolable está eliminada;
2. la entrada se gobierna desde una autoridad central y genérica;
3. existe una consulta espacial canónica para movimiento y visión sin duplicar motores;
4. la línea de visión utiliza esa autoridad y no depende solo de paredes rígidas;
5. la percepción enemiga evita cálculos de LOS cuando el rango ya descarta la detección;
6. el jugador posee Percepción base 10 independiente de los atributos principales;
7. existe una única forma canónica de calcular el alcance visual;
8. `Mapas.json` puede activar/desactivar descubrimiento y campo visible sin definir el radio del jugador;
9. existe estado canónico de visible/descubierto cuando corresponde;
10. Phaser representa el resultado, pero no decide visibilidad ni IA;
11. los enemigos invisibles pueden seguir simulándose sin obligar a animar sus acciones;
12. las acciones visibles conservan el orden de turnos;
13. las pruebas de escala permiten conocer el cuello de botella real restante;
14. no se han duplicado movimiento, combate, muerte, XP, botín, persistencia o IA;
15. la documentación canónica queda actualizada;
16. web funciona correctamente y Electron se valida cuando corresponda.

Una vez cumplido esto, puede comenzar formalmente el **Plan Maestro de Mazmorras Expandidas e Interfaz Fullscreen**.

---

# 21. Resultado arquitectónico esperado

Al finalizar E0, la arquitectura conceptual debe parecerse a:

```text
                           ESTADO CANÓNICO DEL JUEGO
                                      │
                 ┌────────────────────┼────────────────────┐
                 │                    │                    │
                 ▼                    ▼                    ▼
          SistemaTiempo        SistemaEspacial         IA canónica
                                     │                    │
                        ┌────────────┴────────────┐       │
                        │                         │       │
                        ▼                         ▼       │
               bloqueaMovimiento         bloqueaVision   │
                        │                         │       │
                        ▼                         ▼       ▼
                movimiento/path          línea de visión / percepción
                                                  │
                                    ┌─────────────┴─────────────┐
                                    ▼                           ▼
                            percepción enemiga         visibilidad jugador
                                                                │
                                                    visible / descubierto
                                                                │
                                             eventos visualmente relevantes
                                                                │
                                                                ▼
                                                              Phaser
```

La regla final continúa siendo:

> **El motor decide. La capa visual representa. Lo que no se ve puede seguir ocurriendo, pero no debe convertirse en tiempo visual inútil.**
