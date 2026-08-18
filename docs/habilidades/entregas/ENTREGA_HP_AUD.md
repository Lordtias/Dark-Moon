# ENTREGA — HP-AUD · Auditoría post-hito de habilidades y modificadores

## Estado

**Implementada — pendiente de validación manual del usuario.**

HP-AUD no es HP7. Es una auditoría extraordinaria posterior al cierre de HP6 destinada a certificar que el hito completo no dejó motores paralelos, restos productivos o dependencias indebidas.

## Base verificada

- Repositorio de trabajo: `/mnt/data/hp_aud/Dark-Moon`
- Rama: `main`
- Commit base / HEAD inicial: `e47d2caef9257e64cd663fc8bbc49852b19f163e`
- `origin/main` contenido en el ZIP: `e47d2caef9257e64cd663fc8bbc49852b19f163e`
- `git status` inicial: limpio.
- Dependencias nuevas: ninguna.
- Commit/push realizados: ninguno.

## Alcance aprobado

Se aprobaron únicamente tres correcciones:

1. reconstruir `README.md` como guía funcional real del repositorio;
2. centralizar la semántica duplicada de escalado de magnitudes de modificadores;
3. retirar del `Player` la vía directa de XP de maestría, conservando la inyección explícita de prueba en el depurador.

No se modifica balance, contenido, persistencia, assets históricos, Phaser, Electron ni fórmulas jugables.

## Resultado de la auditoría

La auditoría confirmó:

- una sola instancia de `SistemaModificadoresCombatiente` por combatiente;
- un único resolutor general para Player y Enemigo;
- `ConfiguracionHabilidadEfectiva` delegando `danoHabilidad` y `atributoHabilidad` al mismo centralizador;
- auras, maldiciones, efectos temporales, zonas y terreno como fuentes del mismo contrato, sin doble aplicación detectada;
- daño físico, de habilidad y periódico convergiendo en `ComponentesDanio.resolverPaqueteDanio`;
- una única progresión `ProgresoHabilidadesJugador`;
- `SistemaExperienciaMaestrias` como traductor productivo de hechos ya resueltos a XP;
- persistencia de fuentes y no de resultados derivados;
- ausencia productiva de `ProgresoMagicoJugador`, `PercepcionJugador` y `SistemaPasivasJugador`;
- 0 imports relativos faltantes y 0 ciclos ES.

## Cambios implementados

### 1. Semántica única para escalar modificadores

Se agregó en `src/juego/modificadores/ContratosModificadoresCombatiente.js`:

```text
escalarMagnitudModificador(descriptor, escala)
```

La función no resuelve objetivos ni crea un segundo motor. Únicamente define cómo una intensidad escala la magnitud declarada de cada operación:

- `multiplicar` / `multiplicar_redondear`: escala la distancia respecto del neutro 1;
- `limitar_maximo`: conserva el límite estructural;
- las demás operaciones: escalan su magnitud linealmente.

`CalculadorAtributosMagicos.js` y `SistemaEfectosTemporales.js` eliminaron sus implementaciones privadas y consumen la misma función.

### 2. Una sola ruta productiva de XP

Se eliminó:

```text
Player.agregarExperienciaMaestria()
```

Se conserva:

```text
Player.registrarExperienciaMaestria()
  → SistemaExperienciaMaestrias.registrarEvento()
  → ProgresoHabilidadesJugador
```

`darkMoonDebug.progreso.agregarExperienciaMaestria(...)` continúa disponible como herramienta de prueba, pero su implementación accede explícitamente a `ProgresoHabilidadesJugador` desde el módulo de depuración. El balanceador también puede preparar estados directamente porque no es gameplay productivo.

### 3. Restauración del README

`README.md` había sido reemplazado accidentalmente por instrucciones de un ZIP incremental. Se recuperó la última guía funcional completa sana y se actualizó al estado actual:

- 16 maestrías;
- 104 habilidades: 40 activas y 64 pasivas;
- sistema común de modificadores;
- pasivas, auras y maldiciones;
- configuración efectiva de habilidades;
- árbol genérico;
- detalle Pasiva/Aura/Maldición/Ofensiva;
- HUD de Auras/Maldiciones;
- Panel Personaje/Objetos;
- 104 iconos normalizados a 128×128;
- ruta canónica de XP.

## Archivos modificados

- `README.md`
- `src/juego/modificadores/ContratosModificadoresCombatiente.js`
- `src/juego/magia/CalculadorAtributosMagicos.js`
- `src/juego/efectos/SistemaEfectosTemporales.js`
- `src/entidad/destructible/combatiente/Player.js`
- `src/herramientas/depuracion/DepuradorMagiaHabilidades.js`
- `docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md`

## Archivos agregados

- `docs/habilidades/entregas/ENTREGA_HP_AUD.md`

## Archivos eliminados

Ninguno.

## Dependencias y versiones

No se agregó ni actualizó ninguna dependencia. Se conserva el estado del repositorio:

- Phaser `4.2.1`, cargado localmente;
- Electron `43.3.0`;
- `@electron/packager` `20.0.1`.

## Persistencia

Sin cambios de clave, versión o estructura. No se agregan migraciones ni resultados derivados persistidos.

## Compatibilidad web

Sin cambio de arquitectura. Se sirvieron por HTTP y respondieron `200` los recursos críticos, incluyendo `index.html`, `game.js`, Phaser, catálogos HP y los módulos modificados. No se observaron respuestas `404`.

La ejecución Chromium headless no pudo certificarse debido a la limitación DBus/proceso gráfico del entorno, igual que en HP6; no se declara como prueba superada.

## Compatibilidad Electron

No se modifica Electron. `electron/main.js` mantiene `nodeIntegration: false`, `contextIsolation: true` y `sandbox: true`; `package.json` conserva las versiones fijadas. El ZIP no contiene `node_modules`; no se instalaron dependencias ni se ejecutó Electron.

## Validación automática realizada

| Prueba | Resultado | Estado |
|---|---|---|
| Ruta/rama/HEAD/origin | `main`, `e47d2ca...`, origin coincidente | Correcto |
| Git inicial | árbol limpio | Correcto |
| Sintaxis JS | 277 archivos | Correcto |
| JSON | 38 archivos | Correcto |
| Imports relativos | 0 faltantes | Correcto |
| Ciclos ES | 0 | Correcto |
| Catálogo de maestrías | 16 | Correcto |
| Catálogo de habilidades | 104 = 40 activas + 64 pasivas | Correcto |
| Catálogo de efectos | 35 | Correcto |
| Descriptores numéricos canónicos | 303 normalizados | Correcto |
| Iconos | 104/104 presentes y 128×128 | Correcto |
| Equivalencia del escalador | 40/40 combinaciones | Correcto |
| Orden plano + % base + % total | base 100 → 195 | Correcto |
| Claves/operaciones inválidas | error explícito | Correcto |
| Errores explícitos del escalador | 3/3 casos inválidos rechazados | Correcto |
| Snapshot de Potencia de Efectos | magnitudes y duración esperadas | Correcto |
| Acumulación temporal | suma/multiplicación/límite esperados | Correcto |
| API XP de Player | bypass ausente, traductor presente | Correcto |
| Rutas directas de progreso | solo traductor/observador/herramientas autorizadas | Correcto |
| README | guía funcional restaurada sin textos incrementales obsoletos | Correcto |
| `git diff --check` | sin errores | Correcto |
| HTTP recursos críticos | 200, sin 404 | Correcto |
| Chromium headless | bloqueo del entorno DBus | Pendiente |
| Juego manual | requiere validación del usuario | Pendiente |
| Electron manual | no ejecutado en este entorno | Pendiente |

## Pruebas manuales solicitadas al usuario

1. iniciar una partida y comprobar consola sin errores;
2. abrir Personaje, Objetos y Habilidades;
3. aprender o mejorar una pasiva y verificar actualización inmediata;
4. lanzar una Aura y una Maldición y verificar aplicación, HUD y expiración;
5. comprobar una habilidad afectada por una pasiva de atributo interno;
6. comprobar XP de una maestría mágica mediante consumo de Maná;
7. comprobar XP de arma y una fuente defensiva (Armadura o Bloqueo);
8. desde consola, ejecutar una inyección de XP de depuración y verificar que la herramienta sigue disponible;
9. guardar/cargar y comprobar progreso, equipo y barra;
10. revisar consola durante el recorrido.

## Riesgos pendientes

- La regresión jugable visual/manual todavía debe ser validada por el usuario.
- Chromium headless no es certificable en este entorno por DBus.
- Los assets históricos bajo `assets/imagenes/jugador/old/` permanecen fuera del alcance de HP-AUD.
- El balance fino documentado en el Plan Maestro continúa abierto y no forma parte de esta auditoría.

## Criterio de cierre

HP-AUD podrá marcarse **Cerrada** cuando el usuario confirme las pruebas manuales anteriores o una regresión equivalente. En ese momento corresponde actualizar este documento/Plan con el cierre y proponer el commit definitivo sin añadir cambios funcionales.

## Conventional Commit propuesto

```text
refactor(habilidades): cerrar deuda detectada en auditoría post-hito

- centralizar el escalado de magnitudes de modificadores en el contrato común;
- retirar del Player el bypass de XP y conservar la inyección explícita de depuración;
- restaurar y actualizar el README funcional al estado posterior a HP6;
- documentar HP-AUD y la certificación arquitectónica del hito;
- validar sintaxis, JSON, imports, ciclos, catálogos, escalado, acumulaciones, XP y recursos web.
```

No realizar este commit hasta completar la validación manual y aprobar el cierre.

## ENLACE PARA LA SIGUIENTE ETAPA — PROVISIONAL

---------------- INICIO DEL ENLACE ----------------

PLAN:
Plan Maestro de habilidades y pasivas de Dark Moon.

ETAPA CERRADA:
HP-AUD — Auditoría post-hito de habilidades y modificadores.

ESTADO:
Pausada.

COMMIT BASE:
`e47d2caef9257e64cd663fc8bbc49852b19f163e`

HEAD FINAL VERIFICADO:
`e47d2caef9257e64cd663fc8bbc49852b19f163e` antes del commit final del usuario.

GIT STATUS FINAL:
Árbol de trabajo con los cambios implementados de HP-AUD; no se realizó commit ni push.

DOCUMENTO DE ENTREGA:
`docs/habilidades/entregas/ENTREGA_HP_AUD.md`

DOCUMENTOS MAESTROS ACTUALIZADOS:
- `docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`: Sin cambios.

OBJETIVO QUE SE COMPLETÓ:
Auditar transversalmente HP1–HP6 y corregir tres deudas concretas sin crear HP7 ni ampliar el alcance funcional.

ARQUITECTURA HEREDADA:
Un único `SistemaModificadoresCombatiente`, una única `ConfiguracionHabilidadEfectiva` derivada, un único `SistemaExperienciaMaestrias` productivo, un único `SistemaEfectosTemporales` y persistencia de fuentes canónicas.

ARCHIVOS CLAVE:
- `src/juego/modificadores/ContratosModificadoresCombatiente.js`: contrato y semántica común de escalado.
- `src/juego/modificadores/SistemaModificadoresCombatiente.js`: resolutor canónico único.
- `src/juego/maestrias/SistemaExperienciaMaestrias.js`: traductor productivo único de XP.
- `README.md`: guía funcional del estado real del repositorio.

DEPENDENCIAS Y VERSIONES:
Ninguna nueva. Phaser 4.2.1; Electron 43.3.0; @electron/packager 20.0.1.

PRUEBAS CLAVE SUPERADAS:
- equivalencia 40/40 del escalado anterior frente a la función centralizada;
- acumulación temporal y snapshot de Potencia de Efectos sin regresión;
- 0 imports faltantes, 0 ciclos y catálogos HP completos válidos;
- bypass productivo de XP retirado del Player y recursos web críticos en HTTP 200.

PROBLEMAS O RIESGOS PENDIENTES:
- validación manual de gameplay por el usuario;
- Chromium headless limitado por DBus en este entorno;
- balance futuro y assets históricos fuera del alcance.

DECISIONES APROBADAS:
- no crear HP7;
- ejecutar HP-AUD como auditoría post-hito;
- centralizar el escalado duplicado;
- retirar el bypass directo de XP del Player conservando soporte explícito de depuración;
- restaurar README como documento funcional.

DECISIONES QUE SIGUEN ABIERTAS:
Las decisiones de balance y contenido futuro ya enumeradas en el Plan Maestro.

SIGUIENTE ETAPA RECOMENDADA:
Por definir después de cerrar HP-AUD.

OBJETIVO DE LA SIGUIENTE ETAPA:
Debe definirse mediante una nueva propuesta y no pertenece automáticamente al hito HP.

PRIMEROS ARCHIVOS A REVISAR:
- `README.md`
- `docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md`
- el documento maestro del próximo hito aprobado.

NO MODIFICAR SIN NUEVA APROBACIÓN:
- semántica de `SistemaModificadoresCombatiente`;
- `ProgresoHabilidadesJugador` / `SistemaExperienciaMaestrias`;
- `SistemaEfectosTemporales`, Auras y Maldiciones;
- balance y persistencia.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Debe definirse en la propuesta correspondiente.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
`refactor(habilidades): cerrar deuda detectada en auditoría post-hito`

- centralizar el escalado de magnitudes de modificadores en el contrato común;
- retirar del Player el bypass de XP y conservar la inyección explícita de depuración;
- restaurar y actualizar el README funcional al estado posterior a HP6;
- documentar HP-AUD y la certificación arquitectónica del hito;
- validar sintaxis, JSON, imports, ciclos, catálogos, escalado, acumulaciones, XP y recursos web.

----------------- FIN DEL ENLACE -----------------
