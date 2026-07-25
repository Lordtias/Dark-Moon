# ENTREGA ETAPA 4 — Maestrías, experiencia y puntos de habilidad

## Estado de la entrega

- Rama analizada: `main`.
- Commit base verificado: `dd4a66ecaf9650132dea57f3728b985fdbc0696f`.
- Commit base: ETAPA 3A — Estado de combate y regeneración de Vida.
- No se realizó commit.
- No se avanzó a ETAPA 5.

## Objetivo cumplido

La etapa incorpora el dominio de progresión mágica sin habilitar todavía el lanzamiento jugable de hechizos.

Se agregan:

- Fuego, Frío, Rayo y Veneno;
- disponibilidad configurable por profesión;
- nivel, experiencia y puntos específicos por maestría;
- un punto universal inicial;
- un punto universal y un punto de atributo por cada nivel general;
- grados 4/3/3 con requisitos 0/3/6;
- experiencia proporcional al Maná realmente consumido;
- deduplicación por ejecución efectiva;
- persistencia durable de progresión, recursos, oro, inventario y equipo;
- guardado automático en transiciones válidas entre mapas;
- limpieza del guardado al morir o confirmar una nueva partida;
- una fachada de depuración para la consola del navegador.

## Decisiones consolidadas

### Experiencia de maestría

La fórmula inicial es:

```text
experiencia = redondear(manaConsumidoReal × factorExperienciaPorMana)
```

El factor inicial es `1` y vive en `Maestrias.json`.

La recompensa se entrega una vez por ejecución efectiva. No depende de daño final, críticos, resistencias, cantidad de objetivos ni ticks de efectos temporales.

### Profesiones

Las cuatro maestrías permiten actualmente:

```text
guerrero
rogue
mago
```

La lista se declara por maestría en JSON y es validada al iniciar.

### Puntos

- Personaje nuevo: 1 punto universal.
- Cada nivel general: 1 punto de atributo y 1 punto universal.
- Cada nivel de maestría: 1 punto específico de esa maestría.
- Un punto aumenta exactamente un grado.
- Los puntos universales y específicos nunca se mezclan automáticamente.

### Persistencia

El snapshot durable incluye:

- identidad y profesión;
- nivel y experiencia general;
- atributos y puntos pendientes;
- Vida y Maná actuales;
- oro;
- maestrías, experiencia, niveles y puntos;
- grados aprendidos;
- inventario con espacios y cantidades;
- rareza, nivel, afijos y propiedades finales de cada objeto;
- contenido interno de contenedores, incluido el carcaj;
- equipamiento por ranura.

No persiste:

- mapa procedural;
- enemigos;
- botín en suelo;
- agenda temporal;
- estado de combate;
- efectos temporales activos;
- selección o resaltados de interfaz.

## Arquitectura

### Configuración

`src/config/magia/Maestrias.json`

Fuente de maestrías, profesiones permitidas, curva de experiencia, máximo y reglas de puntos.

`src/config/magia/Habilidades.json`

Catálogo de las doce habilidades con escuela, requisito y grado máximo.

### Validación y contexto

`ValidadorConfiguracionProgresoMagico.js`

Comprueba:

- las cuatro maestrías congeladas;
- profesiones válidas y no repetidas;
- curva completa hasta nivel 10;
- referencias de habilidades;
- tres habilidades por escuela;
- distribución 4/3/3 y requisitos 0/3/6.

`ContextoProgresoMagico.js`

Carga ambos JSON antes de crear el primer jugador y mantiene una configuración validada compartida.

### Dominio

`ProgresoMagicoJugador.js`

Es la fuente única de verdad de:

- puntos universales;
- estados de maestría;
- puntos específicos;
- grados de habilidades;
- XP por ejecución;
- deduplicación;
- validación y restauración atómica.

`Player.js`

Conserva la progresión general y delega la progresión mágica. El nivel de maestría no se mezcla con atributos ni estadísticas derivadas.

### Persistencia

`PersistenciaJugador.js`

Crea snapshots versionados, utiliza `localStorage`, reconstruye instancias reales mediante `FabricaObjetos` y rechaza estados incompatibles antes de devolver un nuevo jugador.

`EstadoPartida.js`

Guarda el personaje en cada transición válida entre ciudad y mazmorra.

`ControladorDerrota.js`

Elimina el guardado antes de volver al menú tras la muerte.

`Aplicacion.js`

Carga la configuración mágica y elimina el guardado anterior al confirmar una nueva partida.

`DepuradorEtapa4.js` y `game.js`

Exponen operaciones deterministas mediante `globalThis.darkMoonDebug`.

## Integraciones conservadas

- La muerte de enemigos continúa entregando experiencia general desde el sistema existente.
- El motor de daño elemental y resistencias no se modifica.
- El motor de efectos temporales no se modifica.
- La economía de Maná no se modifica.
- La agenda temporal no recibe acciones por aprender o mejorar habilidades.
- El estado de combate no cambia por progresión.
- La barra de habilidades permanece sin lanzamiento jugable.

## Archivos nuevos

```text
src/config/magia/Maestrias.json
src/config/magia/Habilidades.json
src/juego/maestrias/ValidadorConfiguracionProgresoMagico.js
src/juego/maestrias/ContextoProgresoMagico.js
src/juego/maestrias/ProgresoMagicoJugador.js
src/juego/maestrias/DepuradorEtapa4.js
src/Partida/PersistenciaJugador.js
docs/magia/ENTREGA_ETAPA_4.md
docs/magia/VALIDACION_CONSOLA_ETAPA_4.md
docs/magia/RESULTADOS_VALIDACION_ESTATICA_ETAPA_4.md
docs/magia/Plan_Maestro_Magia_Habilidades_Maestrias_Dark_Moon_v1.5.docx
```

## Archivos modificados

```text
game.js
src/aplicacion/Aplicacion.js
src/controles/ControladorDerrota.js
src/entidad/destructible/combatiente/Player.js
src/juego/progresion/SistemaProgresion.js
src/Partida/EstadoPartida.js
```

## Archivos eliminados

Ninguno.

## Validaciones realizadas en la entrega

Se ejecutaron comprobaciones estáticas sin Node.js:

Se completaron **17 comprobaciones estáticas correctas y 0 fallidas**:

- análisis JSON con la biblioteca estándar de Python;
- comprobación de las cuatro maestrías;
- comprobación de las doce habilidades;
- distribución por escuela 3/3/3/3;
- requisitos 0/3/6;
- grados máximos 4/3/3;
- profesiones permitidas Guerrero, Rogue y Mago;
- auditoría de imports introducidos y dependencias existentes de `main`;
- revisión léxica de delimitadores, cadenas y comentarios de JavaScript;
- comprobación del contrato XP/Maná, deduplicación y puntos por nivel;
- comprobación del snapshot integral del personaje;
- ausencia de `.patch`, `.mjs`, `node:test` y APIs de Node.js;
- validación estructural del DOCX v1.5;
- renderizado del documento maestro en 20 páginas e inspección visual de todas ellas.

El detalle queda en `RESULTADOS_VALIDACION_ESTATICA_ETAPA_4.md`.
Las pruebas reales dentro del navegador quedan documentadas en `VALIDACION_CONSOLA_ETAPA_4.md`. El entorno de entrega no pudo ejecutar el juego completo porque no dispuso de un checkout local del repositorio ni de un navegador asociado al servidor del proyecto.

## Riesgos residuales

1. La curva de experiencia de maestrías es inicial y deberá calibrarse con juego real en ETAPA 12.
2. La restauración durable está implementada a nivel de dominio y consola; todavía no existe un botón visible «Continuar».
3. Los efectos temporales activos no se serializan, por decisión de frontera del guardado.
4. Un cambio futuro incompatible en plantillas de objetos deberá acompañarse de una migración de versión.
5. ETAPA 5 deberá generar IDs únicos de ejecución y notificar el Maná realmente consumido una sola vez.

## Criterios de aceptación comprobables

- Exactamente cuatro maestrías mágicas activas.
- Las tres profesiones pueden aprenderlas por configuración.
- Un punto universal inicial.
- Un punto de atributo y uno universal por nivel general.
- Sin bonificación especial en niveles múltiplos de cinco.
- XP independiente y puntos específicos por maestría.
- XP proporcional al Maná real.
- Una recompensa por ejecución.
- Requisitos 0/3/6 y grados 4/3/3.
- Persistencia de oro, inventario, equipo y progresión.
- Limpieza por muerte y nueva partida.
- Sin lanzamiento de habilidades antes de ETAPA 5.

## Conventional Commit propuesto

```text
feat(magia): agregar maestrías y progresión de habilidades

- agregar Fuego, Frío, Rayo y Veneno configurables por profesión
- incorporar experiencia de maestría proporcional al Maná consumido
- otorgar puntos universales por nivel y específicos por maestría
- registrar grados de las doce habilidades con requisitos 0/3/6
- persistir progreso, recursos, oro, inventario y equipamiento
- guardar en transiciones y limpiar el estado al morir o iniciar otra partida
- agregar comandos deterministas de validación para la consola del navegador
- actualizar el documento maestro a la versión 1.5
```


## Prompt propuesto para ETAPA 5

```text
Quiero continuar el Plan Maestro de Magia, Habilidades y Maestrías de Dark Moon.

Repositorio: https://github.com/Lordtias/Dark-Moon.git
Rama: main
Especificación operativa: docs/magia/ETAPA_0_REVALIDACION_ESPECIFICACION.md
Documento maestro actualizado: docs/magia/Plan_Maestro_Magia_Habilidades_Maestrias_Dark_Moon_v1.5.docx
Entrega anterior: docs/magia/ENTREGA_ETAPA_4.md
Último commit confirmado de la ETAPA 4: [REEMPLAZAR POR EL SHA DESPUÉS DEL PUSH]

Etapa solicitada: ETAPA 5 — Motor configurable de habilidades y grados

Revisá directamente el último estado de main, el historial reciente, la especificación operativa, el documento maestro v1.5, la entrega de la ETAPA 4 y todo el código relacionado. Verificá el HEAD real y comparalo con el SHA indicado. No asumas que continúa siendo el último commit.

Antes de escribir código, comprobá especialmente:

* ProgresoMagicoJugador como fuente única de maestrías, puntos y grados;
* el contrato de XP proporcional al Maná realmente consumido y la deduplicación por idEjecucion;
* las doce habilidades, sus requisitos 0/3/6 y máximos 4/3/3;
* la agenda temporal y el estado de combate;
* el motor de daño elemental y resistencias;
* el motor de efectos temporales;
* Inteligencia, Sabiduría, Maná y sus multiplicadores;
* alcance, patrones, línea de visión y selección actual de ataques;
* persistencia del personaje, inventario, oro y equipamiento;
* barra de habilidades y controladores de entrada actuales.

Restricción obligatoria de pruebas:

* no incorporar archivos .patch;
* entregar archivos completos aunque el cambio sea mínimo;
* no incorporar archivos .mjs;
* no utilizar node:test ni Node.js;
* no instalar runtimes, librerías ni dependencias externas;
* validar mediante pruebas manuales dentro del juego y comandos deterministas copiables en la consola del navegador.

Antes de implementar, explicame:

1. HEAD actual y relación con el commit de ETAPA 4;
2. alcance exacto de ETAPA 5;
3. contrato común de una ejecución de habilidad;
4. validación, selección y cancelación;
5. consumo atómico de Maná y tiempo;
6. integración con daño elemental, efectos y estado de combate;
7. generación y ciclo de vida de idEjecucion;
8. notificación única de experiencia de maestría;
9. integración prevista con barra e interfaz;
10. archivos a crear, modificar o eliminar;
11. contradicciones, decisiones pendientes y riesgos;
12. pruebas manuales, comandos y criterios de aceptación;
13. fuera de alcance.

Después de presentar la revisión y el plan, detenete y esperá mi aprobación explícita. No escribas código hasta que responda exactamente:

Aprobado. Podés implementar la etapa.

Al terminar, entregame resumen, commit base, archivos completos, arquitectura, pruebas, comandos de consola, resultados, criterios comprobados, riesgos, confirmación de restricciones, Conventional Commit completo y prompt para la etapa siguiente.

No realices el commit ni avances a la etapa posterior.
```
