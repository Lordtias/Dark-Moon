# PLAN MAESTRO — MAZMORRAS EXPANDIDAS E INTERFAZ FULLSCREEN

**Proyecto:** Dark Moon  
**Idioma obligatorio:** Español para código, comentarios, documentación, configuraciones y nombres técnicos nuevos.  
**Estado:** Plan maestro de trabajo — sujeto a validación técnica sobre el repositorio real antes de cada implementación.  

---

## 1. Propósito del hito

Este hito busca producir un salto estructural y visual en Dark Moon sin duplicar motores ni romper la lógica canónica existente.

Los dos objetivos principales son:

1. **Expandir la exploración** mediante mazmorras mayores, con habitaciones o secciones conectadas por pasillos, más enemigos, objetos interactuables y una estructura de progreso interna reconocible.
2. **Transformar la interfaz de juego** para que el mundo ocupe toda la pantalla y los paneles se abran mediante una interfaz gráfica superpuesta, con apariencia de videojuego y no de página web.

El resultado debe seguir siendo compatible con la arquitectura híbrida actual: Phaser representa el mundo y las respuestas visuales; HTML/CSS puede seguir resolviendo paneles cuando sea conveniente, siempre que exista un contrato claro y una única fuente de verdad.

---

# 2. Principios arquitectónicos obligatorios

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
- identificar habilidades o enemigos por su nombre mostrado;
- crear configuraciones paralelas;
- acoplar recursos a rutas dispersas;
- migrar inventario o paneles solamente para decir que están en Phaser;
- modificar contratos fundamentales sin explicar la necesidad.

### Flujo canónico esperado

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

**Phaser no decide reglas del juego.**  
**HTML no decide reglas del juego.**  
Ambos representan resultados producidos por la lógica canónica.

---

# 3. Fuente de verdad de mapas

`Mapas.json` debe continuar siendo el **canon de definición de cada mapa**.

No debe aparecer una configuración paralela que describa el mismo mapa en otro archivo sin una justificación técnica explícita.

`Mapas.json` debe poder alimentar, de forma directa o mediante contratos de lectura claros:

```text
Mapas.json
   │
   ├── configuración estructural
   │        ↓
   │   GeneradorMazmorra
   │        ↓
   │   PlanoMazmorra
   │
   ├── configuración de población
   │        ↓
   │   PobladorMazmorra
   │
   ├── referencias de enemigos
   │        ↓
   │   datos canónicos de enemigos
   │
   ├── referencias de interactuables
   │        ↓
   │   datos canónicos de interactuables
   │
   └── reglas de recompensa / nivel
            ↓
       sistemas canónicos de objetos y botín
```

Los mapas deben referenciar entidades mediante **identificadores internos estables**, nunca mediante el nombre visible traducible mostrado al jugador.

---

# 4. Dirección visual obligatoria

Toda modificación gráfica debe respetar:

`docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`

Dirección vigente:

> Fantasía medieval 2D ilustrada, estilizada y luminosa, con vista superior o tres cuartos y lectura táctica por casillas.

Prioridades visuales:

1. comprensión;
2. lectura de casillas;
3. claridad del personaje y enemigos;
4. respuesta de acciones;
5. atmósfera;
6. detalle decorativo.

Ningún cambio visual se considerará terminado solamente porque se vea bien en una captura.

Debe comprobarse dentro del juego:

- en movimiento;
- con selección;
- con paneles;
- con zoom;
- con redimensionamiento;
- con varios enemigos;
- con efectos superpuestos;
- en la versión web;
- en Electron cuando corresponda.

---

# 5. Alcance general del hito

El hito se divide en **cuatro etapas reales**.

La Etapa 2 tendrá dos bloques internos para separar responsabilidades, pero seguirá considerándose una sola etapa funcional.

| Etapa | Objetivo principal | Resultado esperado |
|---|---|---|
| **1** | Generación estructural | Mazmorras grandes, parametrizables y conectadas |
| **2** | Entidades y población | Enemigos, puertas, cofres, barriles, portal, zona especial y salida |
| **3** | Interfaz fullscreen | Canvas completo + HUD gráfico + paneles superpuestos |
| **4** | Integración y cierre | Regresión, balance, rendimiento, web y Electron cuando corresponda |

---

# 6. ETAPA 1 — GENERADOR ESTRUCTURAL DE MAZMORRAS

## 6.1 Objetivo

Crear una nueva capacidad de generación estructural capaz de producir mapas de escala roguelike a partir de parámetros definidos en `Mapas.json`, sin introducir lógica de enemigos, botín o combate dentro del generador.

El generador debe responder únicamente a la pregunta:

> **¿Qué forma tiene esta mazmorra y cómo se conectan sus sectores?**

---

## 6.2 Responsabilidades esperadas

La lógica estructural debería quedar separada conceptualmente en componentes equivalentes a:

```text
Mapas.json
   ↓
GeneradorMazmorra
   ↓
PlanoMazmorra
```

Los nombres definitivos se confirmarán después de analizar el repositorio real, pero los nombres nuevos deberán estar en español.

`GeneradorMazmorra` construye.

`PlanoMazmorra` describe el resultado generado y no debe transformarse en un segundo motor de reglas de juego.

---

## 6.3 Capacidades configurables mínimas

`Mapas.json` deberá poder expresar, manteniendo compatibilidad con el formato actual siempre que sea razonable:

### Tamaño general

- ancho y alto objetivo o rango equivalente;
- cantidad o densidad de sectores;
- límites apropiados para cada tipo de mapa.

### Habitaciones / sectores

- cantidad mínima y máxima;
- ancho mínimo y máximo;
- alto mínimo y máximo;
- posibilidad futura de tipos de habitación sin obligar a implementarlos en esta etapa.

### Distancia entre sectores

Debe existir un parámetro o conjunto de parámetros que permita modificar la personalidad estructural del mapa.

Ejemplos conceptuales:

**Casa o castillo**

```text
habitaciones medianas/grandes
separación corta
pasillos cortos
conectividad relativamente alta
```

**Alcantarilla**

```text
habitaciones pequeñas/medianas
separación grande
pasillos largos
conectividad menor
```

No debe ser necesario crear un generador diferente para cada ambientación si la diferencia puede expresarse mediante datos.

### Pasillos

- ancho;
- comportamiento de conexión;
- longitud derivada de la separación;
- posibilidad de recorridos no triviales si la arquitectura existente lo permite.

### Puntos de conexión

El modelo debe reconocer zonas que **no sean habitaciones** pero que tengan valor estructural.

Ejemplos:

```text
cruce de pasillos
nodo de conexión
zona de transición
futuro punto de escalera
futuro acceso a otro nivel
```

Estos puntos deben formar parte del plano generado desde ahora, aunque todavía no tengan una función jugable especial.

---

## 6.4 Estructura conceptual del resultado

El resultado debería ser capaz de representar información equivalente a:

```text
PlanoMazmorra
│
├── habitaciones[]
├── pasillos[]
├── puntosConexion[]
├── conexiones[]
│
├── zonaEntrada
├── zonasCandidatasSalida[]
│
├── casillasTransitables
├── casillasBloqueadas
│
└── zonasCandidatasPoblacion[]
```

No es obligatorio que la implementación final use exactamente estas propiedades. Sí es obligatorio que las responsabilidades estén cubiertas.

---

## 6.5 Entrada del jugador

La estructura debe reservar una zona inicial válida y segura.

La posición del jugador debe continuar resolviéndose mediante la lógica canónica correspondiente, no mediante reglas improvisadas dentro de la escena de Phaser.

---

## 6.6 Criterios de aceptación de la Etapa 1

La etapa no se considera terminada hasta demostrar que:

- `Mapas.json` sigue siendo el canon;
- la misma lógica puede producir mapas con pasillos cortos y largos variando configuración;
- puede variar el tamaño de habitaciones;
- existen puntos de conexión representables;
- todas las áreas obligatorias son alcanzables;
- no existen habitaciones aisladas por errores del generador;
- la entrada es válida;
- las semillas reproducibles siguen funcionando si ya forman parte del contrato actual;
- cámara, límites del mundo y zoom funcionan con mapas mayores;
- no se duplicó movimiento, colisión o pathfinding solamente para soportar el nuevo generador;
- la generación no depende de nombres visibles de mapas o enemigos.

---

# 7. ETAPA 2 — ENTIDADES Y POBLACIÓN PROCEDURAL

## 7.1 Objetivo

Poblar el `PlanoMazmorra` utilizando parámetros definidos por el mapa y sistemas canónicos existentes, separando:

1. **qué es una entidad**;
2. **dónde y por qué se crea dentro de una mazmorra**.

La Etapa 2 tendrá dos bloques internos.

---

# 7.A — INFRAESTRUCTURA DE ENTIDADES

## 7.A.1 Principio

La creación de puertas, cofres, barriles o portales no debe estar mezclada con el algoritmo que decide en qué habitación aparecen.

Debe existir una integración genérica que permita al poblador solicitar entidades mediante identificadores internos y contratos comunes.

---

## 7.A.2 Puertas

Capacidades iniciales mínimas:

- estado abierta/cerrada;
- tránsito permitido o bloqueado;
- interacción;
- impacto coherente sobre línea de visión cuando corresponda;
- representación visual dependiente del estado.

Debe evitarse colocar reglas de apertura, colisión o interacción dentro del sprite.

Quedan fuera de este hito, salvo necesidad técnica descubierta:

- llaves;
- cerraduras complejas;
- puertas mágicas;
- trampas asociadas.

---

## 7.A.3 Barriles

Capacidades iniciales mínimas:

- posición;
- presencia física coherente con la cuadrícula;
- estado;
- representación visual;
- contrato de interacción o destrucción si ya existe una lógica canónica reutilizable.

No debe crearse una segunda lógica de daño para barriles.

Si pueden recibir daño, deberán integrarse al mecanismo canónico correspondiente o introducir un contrato genérico explicado y aprobado.

---

## 7.A.4 Cofres

Debe existir separación entre:

```text
Cofre
   ↓
solicitud de recompensa
   ↓
Sistema canónico de botín
```

El cofre no debe implementar una segunda tabla de loot.

Debe solicitar una categoría, perfil o contexto de recompensa y delegar la resolución concreta al sistema canónico de objetos/botín.

---

## 7.A.5 Portal de entrada

Deseable y previsto dentro de esta etapa.

Al comenzar la mazmorra:

- el jugador aparece junto al portal;
- el portal se encuentra visualmente apagado/inactivo;
- no permite regresar;
- no implementa todavía transición entre niveles;
- sirve como representación ambiental del punto de llegada.

Debe quedar preparado para futuras transiciones sin crear ahora un sistema paralelo de viajes.

---

# 7.B — POBLADOR DE MAZMORRA

## 7.B.1 Responsabilidad

El componente conceptual `PobladorMazmorra` recibe:

```text
Mapas.json
+
PlanoMazmorra
+
catálogos canónicos necesarios
```

y decide:

- qué enemigos aparecen;
- dónde aparecen;
- qué interactuables aparecen;
- qué zonas quedan intencionalmente vacías;
- cuál es la zona especial;
- dónde se ubica la salida;
- qué cofres son moderados o importantes.

No calcula combate, muerte, experiencia ni botín final.

---

## 7.B.2 Configuración de enemigos por mapa

`Mapas.json` debe permitir declarar:

- enemigos normales permitidos;
- pesos/frecuencias/probabilidades relativas;
- densidad o cantidad base;
- enemigos especiales permitidos;
- límites o reglas de aparición necesarias.

Preferencia técnica:

**pesos relativos** antes que porcentajes rígidos, salvo que el análisis del sistema actual muestre una razón para mantener otro modelo.

Ejemplo conceptual:

```text
rata: 50
esqueleto_guerrero: 30
esqueleto_rogue: 15
enemigo_raro: 5
```

Los identificadores utilizados deben ser internos y estables.

Nunca:

```text
"Esqueleto Guerrero"
```

como criterio lógico basado en el nombre visible.

---

## 7.B.3 Configuración de interactuables por mapa

El mapa debe poder definir qué interactuables pueden aparecer y con qué frecuencia o densidad.

Ejemplos:

- puertas;
- cofres;
- barriles;
- portal de entrada;
- futuras entidades compatibles con el mismo contrato.

El poblador no debe contener excepciones del estilo:

```text
si mapa == "Alcantarilla" entonces...
```

cuando el comportamiento pueda definirse mediante datos.

---

## 7.B.4 Zona especial

Cada mazmorra deberá intentar producir **una zona especial**.

El poblador debe analizar el plano generado y elegir una zona apropiada mediante criterios estructurales.

Criterios deseables:

- distancia lógica suficiente respecto de la entrada;
- accesibilidad garantizada;
- tamaño adecuado;
- preferencia por una zona terminal, profunda o estructuralmente relevante;
- espacio suficiente para el encuentro previsto.

La distancia debe calcularse sobre la estructura real del mapa, no únicamente por distancia visual directa si eso produce resultados incoherentes.

Contenido esperado de la zona especial:

```text
Zona especial
│
├── enemigo/s especial/es
├── enemigos normales opcionales
├── cofre de recompensa importante
└── salida de la mazmorra
```

La recompensa importante debe calcularse utilizando el sistema canónico de botín y el nivel/contexto del mapa.

---

## 7.B.5 Zonas normales

Las demás zonas deben poder recibir contenido con probabilidades configurables.

Ejemplo conceptual:

```text
zona normal
│
├── posibilidad de enemigos
├── posibilidad de barriles
├── posibilidad de otros interactuables
└── baja posibilidad de cofre moderado
```

No todas las habitaciones deben quedar llenas. Los espacios vacíos también son parte del ritmo de exploración.

---

## 7.B.6 Escalabilidad de enemigos

El sistema debe dejar de depender de una cantidad global rígida equivalente a “crear 5 o 6 enemigos”.

La cantidad debe poder derivarse de:

- tamaño del mapa;
- cantidad/tamaño de zonas;
- densidad configurada;
- composición del mapa;
- posibles reglas futuras de dificultad.

El objetivo del hito es permitir mapas con muchos más enemigos, pero **no se fijará un número final antes de medir rendimiento y jugabilidad**.

Como orden de magnitud inicial de pruebas se considerará razonable evaluar escenarios de aproximadamente 15–30 enemigos y luego ajustar según resultados reales.

---

## 7.B.7 Criterios de aceptación de la Etapa 2

La etapa no se considera terminada hasta demostrar que:

- el mapa puede definir enemigos normales y especiales mediante datos;
- el poblador utiliza identificadores internos;
- la densidad cambia según configuración;
- puertas, cofres y barriles se crean mediante integración genérica;
- existe una única zona especial válida;
- la zona especial es alcanzable;
- la salida es alcanzable;
- el cofre importante utiliza el sistema canónico de botín;
- los cofres normales pueden otorgar loot moderado mediante el mismo sistema;
- ningún enemigo aparece en una pared, puerta o casilla inválida;
- el jugador no queda bloqueado por la población inicial;
- la entrada queda segura según las reglas aprobadas;
- el portal de entrada aparece apagado si se incluye;
- no se duplicó resolución de muerte, experiencia o loot;
- no se introdujeron reglas de IA dentro de sprites o escenas.

---

# 8. ETAPA 3 — CANVAS FULLSCREEN E INTERFAZ DE VIDEOJUEGO

## 8.1 Objetivo

Transformar la presentación de Dark Moon para que el mapa sea el elemento visual dominante y la interfaz permanente adopte una estética de RPG integrada al mundo.

El objetivo no es “hacer el canvas un poco más grande”.

El objetivo es:

> **que Dark Moon deje de sentirse como una página web que contiene un juego y pase a sentirse como un juego con interfaces superpuestas.**

---

## 8.2 Canvas

El área jugable debe ocupar conceptualmente:

```text
100% del ancho útil
100% del alto útil
```

Los paneles fijos actuales deben dejar de consumir espacio permanente cuando puedan abrirse bajo demanda.

---

## 8.3 HUD gráfico

La interfaz permanente debe diseñarse como una pieza visual de videojuego coherente con Dark Moon.

No se busca una implementación mínima basada únicamente en barras rectangulares simples.

### Vida y Maná

Se prioriza explorar una solución visual equivalente a:

- esferas;
- recipientes circulares/semicirculares;
- elementos ornamentales medievales;
- integración con piedra, metal, runas u otros recursos compatibles con el documento visual maestro.

Debe mantenerse lectura numérica suficiente cuando sea necesaria para la jugabilidad.

La estética nunca puede degradar la comprensión.

---

## 8.4 Botones de menú

Los accesos permanentes deben usar botones gráficos o iconográficos integrados a la barra/HUD.

Funciones esperadas, según los sistemas reales existentes:

- Inventario;
- Personaje / Equipamiento;
- Habilidades / Maestrías;
- Estadísticas;
- opciones adicionales justificadas por el juego.

Los botones deberían contemplar al menos:

- estado normal;
- hover;
- activo/presionado;
- deshabilitado cuando corresponda;
- tooltip con nombre y atajo de teclado cuando exista.

No debe utilizarse el texto visible del botón como identificador lógico interno.

---

## 8.5 Paneles

No se migrarán inventario, equipamiento, habilidades o estadísticas a Phaser solamente para afirmar que “están en Phaser”.

Si HTML/CSS sigue siendo la tecnología más adecuada, deberá reutilizarse.

La transformación principal será de estructura y contrato:

```text
ANTES

panel fijo | canvas | panel fijo
```

```text
DESPUÉS

canvas fullscreen
   +
HUD superpuesto
   +
panel activo superpuesto cuando corresponde
```

---

## 8.6 Gestor único de paneles

Debe evitarse que múltiples componentes manipulen DOM libremente.

Debe existir un contrato centralizado, equivalente conceptualmente a:

```text
GestorPaneles
│
├── abrir(panel)
├── cerrar(panel)
├── alternar(panel)
└── cerrarActual()
```

Los nombres finales dependerán del análisis del código existente.

Comportamiento esperado:

- un panel principal abierto a la vez, salvo excepción funcional justificada;
- `Esc` cierra el panel activo;
- pulsar nuevamente el botón puede cerrarlo;
- abrir otro panel cierra o sustituye al anterior según el contrato definido;
- clics sobre UI no deben filtrarse al canvas;
- entradas de teclado deben respetar el contexto del panel.

---

## 8.7 Separación lógica / presentación

Ejemplo obligatorio de flujo:

```text
Jugador pulsa Inventario
        ↓
Controlador de interfaz
        ↓
GestorPaneles abre Inventario
        ↓
HTML representa el inventario canónico existente
```

No:

```text
Botón
  ↓
crea un segundo inventario dentro de Phaser
```

---

## 8.8 Criterios de aceptación de la Etapa 3

La etapa no se considera terminada hasta validar:

- canvas fullscreen real;
- HUD correctamente superpuesto;
- vida/maná con diseño gráfico aprobado y legible;
- botones de menú gráficos;
- apertura y cierre coherente de paneles;
- inventario sigue usando el estado canónico;
- equipamiento sigue usando el estado canónico;
- habilidades siguen usando el estado canónico;
- estadísticas siguen usando cálculos canónicos;
- no existe duplicación innecesaria dentro de Phaser;
- mouse y teclado funcionan correctamente;
- paneles no envían clics accidentales al mundo;
- resize funciona;
- zoom funciona;
- la UI mantiene lectura con múltiples enemigos y efectos;
- web funciona correctamente;
- Electron se valida cuando corresponda al estado del proyecto.

---

# 9. ETAPA 4 — INTEGRACIÓN, BALANCE, RENDIMIENTO Y REGRESIÓN

## 9.1 Objetivo

Cerrar el hito sin agregar sistemas nuevos, verificando que los cambios estructurales y visuales sean utilizables en condiciones reales de juego.

---

## 9.2 Generación procedural

Se deberán probar múltiples semillas y configuraciones.

Validar:

- habitaciones accesibles;
- conexiones válidas;
- pasillos coherentes;
- puntos de conexión correctos;
- entrada válida;
- zona especial alcanzable;
- salida alcanzable;
- ausencia de bloqueos estructurales;
- repetibilidad de seed cuando corresponda.

---

## 9.3 Población

Validar como mínimo:

- enemigos en casillas válidas;
- puertas correctamente posicionadas;
- cofres accesibles;
- barriles coherentes con colisión;
- portal correctamente colocado;
- zona inicial segura;
- zona especial coherente;
- salida no bloqueada accidentalmente.

Ejemplos de errores que invalidan la etapa:

```text
cofre dentro de pared
enemigo encima de puerta
enemigo especial junto a la entrada
salida encerrada
jugador sin ruta de salida de su casilla inicial
```

---

## 9.4 Rendimiento

Los mapas mayores y el aumento de entidades obligan a medir:

- IA;
- búsqueda de caminos;
- línea de visión;
- sistema temporal;
- efectos temporales;
- renderizado;
- creación y destrucción de entidades;
- actualización de HUD y paneles.

Regla:

> **No optimizar anticipadamente sin evidencia. Medir primero.**

Si la cantidad de enemigos genera problemas reales, se podrá proponer posteriormente una estrategia de actividad reducida, suspensión o simulación simplificada para entidades lejanas, pero deberá preservar el estado canónico y aprobarse explícitamente.

---

## 9.5 Regresión de sistemas canónicos

Debe verificarse que continúen existiendo una sola vez y funcionando correctamente:

- movimiento;
- combate;
- muerte;
- experiencia;
- botín;
- inventario;
- equipamiento;
- habilidades;
- maestrías;
- efectos;
- tiempo/iniciativa;
- persistencia.

---

## 9.6 Validación visual obligatoria

No se aprueba por captura.

Toda modificación gráfica relevante debe probarse:

- dentro del juego;
- en movimiento;
- con selección;
- con paneles abiertos y cerrados;
- con zoom;
- con redimensionamiento;
- con varios enemigos simultáneos;
- con efectos superpuestos;
- en la versión web;
- en Electron cuando corresponda.

---

# 10. Elementos deliberadamente fuera de alcance

Para mantener el hito controlable, quedan fuera salvo que una necesidad técnica obligatoria aparezca durante el análisis:

- múltiples pisos jugables;
- escaleras funcionales entre niveles;
- minimapa;
- habitaciones secretas;
- llaves y cerraduras complejas;
- puzzles;
- trampas avanzadas;
- biomas internos complejos;
- habitaciones de jefe con scripting especial;
- cofres con un segundo sistema de loot;
- puertas con reglas únicas por mapa;
- migración completa de paneles HTML a Phaser;
- reescritura de sistemas canónicos solamente para adaptarlos a la presentación visual.

La arquitectura debe quedar preparada para crecer hacia varios de estos elementos sin implementarlos prematuramente.

---

# 11. Contratos de diseño técnico

## 11.1 Identificadores internos

Enemigos, habilidades, mapas, interactuables y recursos deben identificarse mediante claves internas estables.

Nunca debe depender la lógica de:

- traducción visible;
- nombre mostrado;
- texto de UI.

---

## 11.2 Recursos

Los nuevos recursos gráficos deben tener una ruta canónica y coherente con la organización actual.

Evitar:

```text
ruta de puerta en una escena
ruta de cofre en otro controlador
ruta de HUD escrita directamente en HTML
```

Preferir un mecanismo centralizado compatible con el cargador/catálogo actual.

---

## 11.3 Eventos visuales

Las animaciones o efectos visuales representan resultados.

Ejemplo correcto:

```text
Lógica canónica resuelve ataque
        ↓
resultado: 12 daño + crítico
        ↓
evento visual
        ↓
Phaser reproduce animación y texto
```

Ejemplo incorrecto:

```text
animación termina
        ↓
recién entonces el objetivo recibe 12 daño
```

La duración visual no debe ser la regla real del sistema salvo que exista una decisión de diseño explícita y canónica que lo justifique.

---

# 12. Metodología de trabajo obligatoria para cada etapa

Cada etapa deberá seguir este flujo:

## Paso 1 — Análisis del repositorio real

Antes de modificar código:

- tomar el ZIP/repositorio proporcionado como fuente de verdad;
- revisar estructura actual;
- identificar contratos existentes;
- localizar configuraciones canónicas;
- comprobar si ya existe lógica reutilizable;
- detectar riesgos de duplicación.

## Paso 2 — Propuesta técnica previa

Presentar al usuario:

- qué se analizó;
- cómo funciona hoy;
- qué se propone cambiar;
- qué archivos o módulos se prevé tocar;
- qué elementos nuevos se introducirán;
- qué se reutilizará sin tocar;
- riesgos;
- alternativas si existen;
- criterios de validación.

## Paso 3 — Aprobación explícita

No comenzar implementación hasta recibir aprobación explícita del usuario.

## Paso 4 — Implementación controlada

- cambios acotados a la etapa;
- sin funcionalidad futura innecesaria;
- sin configuraciones paralelas;
- sin duplicar motores;
- código nuevo en español;
- documentación nueva en español.

## Paso 5 — Validación

Ejecutar las pruebas técnicas, funcionales y visuales definidas para la etapa.

No declarar éxito si solamente compila o si solamente se ve bien.

## Paso 6 — Entrega

La entrega debe incluir:

- resumen simple de qué cambió;
- explicación de por qué cambió;
- archivos modificados;
- archivos nuevos;
- riesgos o deuda restante;
- pruebas realizadas;
- resultado de las pruebas;
- instrucciones de validación manual del usuario;
- commit message propuesto.

## Paso 7 — Cierre y enganche

Luego de que el usuario confirme el commit, registrar:

- SHA validado;
- etapa cerrada;
- estado del hito;
- próxima etapa;
- contexto mínimo necesario para continuar en otro chat.

---

# 13. Regla de modificación de contratos fundamentales

Si durante una etapa se descubre que es necesario cambiar un contrato fundamental —por ejemplo movimiento, combate, muerte, experiencia, loot, persistencia o estructura central de entidades— no debe modificarse silenciosamente.

La propuesta debe explicar:

1. cuál es el contrato actual;
2. por qué resulta insuficiente;
3. qué problema real impide continuar;
4. qué cambio mínimo se propone;
5. qué sistemas pueden verse afectados;
6. cómo se evita crear una segunda lógica;
7. cómo se probará la regresión.

El cambio requiere aprobación explícita antes de implementarse.

---

# 14. Resultado esperado al cerrar el hito

Al finalizar, Dark Moon debería ofrecer una experiencia equivalente a:

```text
Entrada apagada
      ↓
Exploración de sectores
      ↓
Habitaciones y cruces
      ↓
Enemigos + puertas + barriles
      ↓
Cofres ocasionales
      ↓
Profundización en la mazmorra
      ↓
Zona especial
      ↓
Enemigo/s especial/es
      ↓
Cofre importante
      ↓
Salida
```

Mientras el mundo ocupa toda la pantalla y la interfaz se presenta como:

```text
Canvas fullscreen
       +
HUD gráfico medieval-fantástico
       +
vida/maná con diseño propio
       +
botones iconográficos
       +
paneles superpuestos bajo demanda
```

Todo ello preservando una única lógica real por sistema.

---

# 15. Definición de éxito del hito

El hito se considerará exitoso si se cumplen simultáneamente estas condiciones:

1. Los mapas pueden ser sustancialmente más grandes que los actuales.
2. `Mapas.json` sigue siendo el canon de cada mapa.
3. Una misma lógica de generación puede producir estilos estructurales diferentes mediante parámetros.
4. Existen habitaciones/secciones, pasillos y puntos de conexión.
5. El mapa puede contener muchos más enemigos sin cambiar la lógica canónica de combate o IA.
6. Existen puertas, cofres y barriles integrados genéricamente.
7. Existe una zona especial con enemigo especial, recompensa importante y salida.
8. Las zonas normales pueden tener cofres moderados con probabilidad menor.
9. El portal de entrada apagado puede representarse sin crear un sistema paralelo de transición.
10. El canvas ocupa toda la pantalla útil.
11. La interfaz permanente se percibe como HUD de videojuego y no como panel web.
12. Vida y maná utilizan una solución gráfica temática, legible y validada dentro del juego.
13. Inventario, equipamiento, habilidades y estadísticas siguen usando sus estados y cálculos canónicos.
14. No se duplicaron motores dentro de Phaser.
15. La validación funciona en web y en Electron cuando corresponda.
16. Los cambios visuales cumplen `DISENO_MAESTRO_VISUAL_DARK_MOON.md` en condiciones reales de juego.

---

# 16. Próximo paso operativo

La primera acción del hito será **analizar el repositorio real para preparar la propuesta técnica de la Etapa 1**.

Ese análisis deberá concentrarse en:

- estructura actual de `Mapas.json`;
- generador de mapas vigente;
- representación actual de suelo, paredes y colisiones;
- cámara, zoom y límites del mundo;
- seeds;
- creación y ubicación actual del jugador;
- creación actual de enemigos;
- contratos de pathfinding y línea de visión;
- recursos gráficos de mapas;
- puntos donde Phaser consume el resultado del mapa.

La implementación de la Etapa 1 comenzará únicamente después de presentar dicho análisis y recibir aprobación explícita.

---

**Fin del Plan Maestro**
