# ENTREGA HP1 — Generalización de progresión y configuración

## Estado

**Implementada; validación técnica completada.** La validación interactiva completa dentro del juego queda pendiente de ejecución manual porque el navegador headless disponible en el entorno bloquea por política organizacional cualquier sitio local. No se avanzó a HP2.

## Repositorio

- Ruta de trabajo: `/mnt/data/hp1_work/Dark-Moon`
- Rama: `main`
- Commit base: `029e3d675f7bb9d3037fc81fb650ba9520a10d86`
- HEAD verificado: `029e3d675f7bb9d3037fc81fb650ba9520a10d86`
- `origin/main`: `029e3d675f7bb9d3037fc81fb650ba9520a10d86`
- No se realizó commit ni push.

### Git status final verificado

```text
## main...origin/main
 M README.md
 M assets/estilos/paneles/habilidades-maestrias.css
 M docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md
 M src/aplicacion/Aplicacion.js
 M src/config/idiomas/en.json
 M src/config/idiomas/es.json
 D src/config/magia/Habilidades.json
 D src/config/magia/Maestrias.json
 M src/entidad/destructible/combatiente/Player.js
 M src/herramientas/balance/AnalizadorBalanceCombate.js
 M src/herramientas/balance/AnalizadorBalanceJuego.js
 M src/herramientas/balance/AnalizadorBalanceRegresion.js
 M src/herramientas/balance/BalanceAplicacion.js
 M src/herramientas/depuracion/DepuradorMagiaHabilidades.js
 M src/interfaz/dom/PresentacionMapaActivoDom.js
 M src/interfaz/graficos/ValidadorPerfilesHabilidadesVisuales.js
 M src/interfaz/habilidades/IntegracionHabilidadesDom.js
 M src/interfaz/habilidades/PanelHabilidadesMaestrias.js
 M src/juego/habilidades/ContratoBarraHabilidades.js
 M src/juego/habilidades/EstadoSesionHabilidades.js
 D src/juego/habilidades/ObservadorProgresoMagico.js
 M src/juego/habilidades/PersistenciaBarraHabilidades.js
 M src/juego/habilidades/SistemaHabilidadesJugador.js
 M src/juego/habilidades/ValidadorConfiguracionEjecucionHabilidades.js
 M src/juego/habilidades/ValidadorHabilidadesNPC.js
 D src/juego/maestrias/ContextoProgresoMagico.js
 D src/juego/maestrias/ProgresoMagicoJugador.js
 D src/juego/maestrias/ValidadorConfiguracionProgresoMagico.js
 M src/juego/progresion/SistemaProgresion.js
 M src/partida/EstadoPartida.js
 M src/partida/PersistenciaJugador.js
?? docs/phaser/entregas/ENTREGA_HP1.md
?? src/config/habilidades/
?? src/juego/habilidades/ObservadorProgresoHabilidades.js
?? src/juego/maestrias/ContextoProgresoHabilidades.js
?? src/juego/maestrias/ProgresoHabilidadesJugador.js
?? src/juego/maestrias/ValidadorConfiguracionProgresoHabilidades.js
```

## Alcance aprobado

1. eliminar configuraciones, clases y aliases antiguos en lugar de conservar wrappers;
2. asumir cero partidas guardadas y no implementar migraciones;
3. diferir maestrías físicas y diseño amplio de pasivas a HP3;
4. generalizar el panel por configuración sin rediseñarlo visualmente.

## Resumen sencillo

HP1 reemplaza la progresión exclusivamente mágica por una progresión general de habilidades. Las categorías, maestrías y habilidades pasan a configuraciones generales. El catálogo admite habilidades `activa` y `pasiva`; una pasiva puede progresar pero no ejecutarse, entrar a la barra ni necesitar un perfil Phaser de ejecución.

Las doce habilidades actuales permanecen activas. No se agregó contenido físico ni lógica de modificadores de HP2/HP3/HP4.

## Arquitectura anterior

```text
config/magia/Maestrias + Habilidades
  → ValidadorConfiguracionProgresoMagico
  → ProgresoMagicoJugador
  → Player.progresoMagico
  → panel / barra / ejecución / persistencia
```

## Arquitectura final

```text
config/habilidades/Maestrias + Habilidades
  → ValidadorConfiguracionProgresoHabilidades
  → ProgresoHabilidadesJugador
  → Player.progresoHabilidades
  → panel / barra / ejecución / persistencia
```

Flujo de tipo de habilidad:

```text
activa → progresión + ejecución + barra + perfil visual
pasiva → progresión; sin ejecución, sin barra y sin perfil visual de ejecución
```

## Cambios principales

- nuevas rutas canónicas `src/config/habilidades/`;
- `ProgresoHabilidadesJugador` reemplaza completamente a `ProgresoMagicoJugador`;
- validador general sin lista fija de fuego/frío/rayo/veneno ni cantidad rígida de habilidades;
- categorías y orden configurables;
- `tipo: activa | pasiva` obligatorio;
- panel alimentado por categorías/maestrías configuradas y estado vacío genérico;
- barra y sistema de ejecución rechazan pasivas;
- perfiles visuales solo se exigen a habilidades ejecutables;
- estado de progreso filtrado por maestrías realmente disponibles para la profesión;
- persistencia usa `progresoHabilidades`, guardado de jugador v2 y barra v2;
- aliases históricos de habilidades eliminados;
- herramientas de balance filtran habilidades activas ejecutables donde corresponde;
- informes específicamente mágicos filtran maestrías de categoría `magicas`;
- traducciones antiguas de placeholders físicos eliminadas.

## Archivos agregados

- `src/config/habilidades/Maestrias.json`
- `src/config/habilidades/Habilidades.json`
- `src/juego/maestrias/ContextoProgresoHabilidades.js`
- `src/juego/maestrias/ProgresoHabilidadesJugador.js`
- `src/juego/maestrias/ValidadorConfiguracionProgresoHabilidades.js`
- `src/juego/habilidades/ObservadorProgresoHabilidades.js`
- `docs/phaser/entregas/ENTREGA_HP1.md`

## Archivos eliminados

- `src/config/magia/Maestrias.json`
- `src/config/magia/Habilidades.json`
- `src/juego/maestrias/ContextoProgresoMagico.js`
- `src/juego/maestrias/ProgresoMagicoJugador.js`
- `src/juego/maestrias/ValidadorConfiguracionProgresoMagico.js`
- `src/juego/habilidades/ObservadorProgresoMagico.js`

No se dejaron wrappers ni copias de compatibilidad.

## Archivos modificados

- `README.md`
- `assets/estilos/paneles/habilidades-maestrias.css`
- `docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md`
- `src/aplicacion/Aplicacion.js`
- `src/config/idiomas/es.json`
- `src/config/idiomas/en.json`
- `src/entidad/destructible/combatiente/Player.js`
- `src/herramientas/balance/AnalizadorBalanceCombate.js`
- `src/herramientas/balance/AnalizadorBalanceJuego.js`
- `src/herramientas/balance/AnalizadorBalanceRegresion.js`
- `src/herramientas/balance/BalanceAplicacion.js`
- `src/herramientas/depuracion/DepuradorMagiaHabilidades.js`
- `src/interfaz/dom/PresentacionMapaActivoDom.js`
- `src/interfaz/graficos/ValidadorPerfilesHabilidadesVisuales.js`
- `src/interfaz/habilidades/IntegracionHabilidadesDom.js`
- `src/interfaz/habilidades/PanelHabilidadesMaestrias.js`
- `src/juego/habilidades/ContratoBarraHabilidades.js`
- `src/juego/habilidades/EstadoSesionHabilidades.js`
- `src/juego/habilidades/PersistenciaBarraHabilidades.js`
- `src/juego/habilidades/SistemaHabilidadesJugador.js`
- `src/juego/habilidades/ValidadorConfiguracionEjecucionHabilidades.js`
- `src/juego/habilidades/ValidadorHabilidadesNPC.js`
- `src/juego/progresion/SistemaProgresion.js`
- `src/partida/EstadoPartida.js`
- `src/partida/PersistenciaJugador.js`

`AnalizadorBalanceCombate.js` se incorporó durante la segunda auditoría porque recorría todo el catálogo suponiendo ejecución en cada habilidad; sin ese ajuste, una futura pasiva rompería el balance aunque el contrato general la aceptara.

## Archivos deliberadamente no modificados

- `src/config/magia/Efectos.json`
- `src/config/magia/HabilidadesNPC.json`
- `src/config/presentacion/PerfilesHabilidadesVisuales.json`
- motores de combate canónico;
- motores de efectos temporales;
- `SistemaAfijos` y catálogos de afijos;
- `package.json` y `package-lock.json`;
- `electron/main.js`;
- Phaser vendorizado;
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`.

No hubo una decisión visual nueva que requiriera modificar el Diseño Maestro Visual.

## Dependencias

Ninguna dependencia nueva, actualización o instalación.

Se conservan sin modificación las dependencias ya presentes en el proyecto. HP1 no requiere Node.js para su implementación ni agrega backend.

## Persistencia

- jugador: `dark-moon:estado-jugador:v2`;
- barra: `dark-moon:barra-habilidades:v2`;
- progreso interno: versión 2;
- propiedad durable: `progresoHabilidades`.

No se implementó lectura, conversión, limpieza ni migración del esquema anterior. Un estado de progreso v1 es rechazado explícitamente.

## Validaciones ejecutadas

| Prueba | Preparación / pasos | Esperado | Obtenido | Estado |
|---|---|---|---|---|
| JSON | Parsear todos los `.json` del repositorio | 0 errores | 38 archivos, 0 errores | Correcto |
| Imports | Resolver imports/export relativos de todos los JS | 0 rutas faltantes | 726 referencias, 0 faltantes | Correcto |
| Sintaxis JS modificada | Compilar con V8 de Chromium los JS modificados/nuevos, sin ejecutar imports | 0 errores | 24 archivos, 0 errores | Correcto |
| Catálogo general real | Validar `Maestrias.json` + `Habilidades.json` | 4 categorías, 4 maestrías y 12 habilidades | Coincide | Correcto |
| Tipos actuales | Revisar catálogo real normalizado | 12 activas | 12 activas | Correcto |
| Cantidades variables | Catálogo sintético con 2 maestrías y 3 habilidades | Debe validar | Validó | Correcto |
| Activa/pasiva | Catálogo sintético | Ambos tipos válidos | Correcto | Correcto |
| Categoría inexistente | Referenciar `fantasma` | Error explícito | Error explícito | Correcto |
| Tipo inexistente | Usar `tipo: aura` | Error explícito | Error explícito | Correcto |
| Activa sin ejecución | Omitir `ejecucion` | Error explícito | Error explícito | Correcto |
| Pasiva con ejecución | Agregar `ejecucion` a pasiva | Error explícito | Error explícito | Correcto |
| Maestrías por profesión | Mago con maestría propia + maestría exclusiva de guerrero | Excluir la ajena | Excluida | Correcto |
| Habilidades por profesión | Habilidades de dos maestrías con permisos distintos | Excluir habilidad inaccesible | Excluida | Correcto |
| Aprender pasiva | Gastar punto universal en pasiva | Grado 1 | Grado 1 | Correcto |
| Estado nuevo | Exportar progreso | versión 2 y solo fuentes aplicables | Correcto | Correcto |
| Sin migración | Restaurar progreso versión 1 | Rechazo | Rechazado | Correcto |
| Barra / pasiva | Asignar pasiva aprendida | Rechazo | Rechazado | Correcto |
| Barra / activa | Asignar activa aprendida | Aceptar | Aceptada | Correcto |
| Ejecución / pasiva | Normalizar pasiva | `ejecucion: null` | Correcto | Correcto |
| Perfil visual / pasiva | Catálogo con pasiva sin perfil | No exigir perfil | No lo exige | Correcto |
| Perfil visual indebido | Agregar perfil a pasiva no ejecutable | Error | Error explícito | Correcto |
| Referencias antiguas productivas | Buscar nombres/rutas Magico antiguos en `src` y README | 0 | 0 | Correcto |
| Archivos antiguos | Comprobar seis rutas eliminadas | No deben existir | No existen | Correcto |
| Dependencias | Revisar package/Electron/Phaser en Git | Sin cambios | Sin cambios | Correcto |
| `git diff --check` | Ejecutar con política CRLF del repositorio | Sin errores de whitespace | Sin errores | Correcto |

### Validación manual de cierre

La ejecución interactiva automática no pudo realizarse en este entorno porque Chromium headless sustituye los sitios locales por una política organizacional externa al repositorio.

Posteriormente el usuario ejecutó las pruebas manuales básicas solicitadas sobre su entorno habitual y confirmó que **todas fueron superadas**. Esta confirmación cubre el flujo de cierre manual de HP1: inicio/nueva partida, panel y categorías, cuatro maestrías mágicas, mejora de habilidad, barra, ejecución de habilidades activas, guardado/carga y ausencia de errores observados en consola.

La evidencia interactiva se registra como **validación manual reportada por el usuario**, no como prueba ejecutada por este entorno.

### Electron

HP1 no modifica `electron/main.js` ni dependencias. No se instalaron paquetes ni se forzó una ejecución Electron desde este entorno. La arquitectura y las rutas permanecen compatibles con el contenido estático heredado; la etapa no incorpora cambios específicos de Electron.

## Compatibilidad web

No se introdujo backend ni dependencia. Los nuevos JSON se cargan por rutas relativas y todos los imports relativos resuelven. La validación manual del usuario confirmó el flujo interactivo básico de HP1.

## Compatibilidad Electron

Sin cambios en proceso principal, preload, aislamiento de contexto ni dependencias. Las rutas nuevas permanecen dentro del contenido estático servido por la aplicación.

## Riesgos y pendientes

- Ningún pendiente de HP1 conocido tras la validación manual reportada por el usuario.
- HP2 debe realizar la auditoría exhaustiva de objetivos modificables antes de crear el resolutor.
- HP3 continúa siendo responsable del diseño de maestrías físicas, XP física y catálogo amplio de pasivas.

## Comprobación de restricciones

- sin `.patch`;
- sin `.mjs`;
- sin commit;
- sin push;
- sin instalación de dependencias;
- sin motor paralelo;
- sin wrappers de progreso antiguo;
- sin configuraciones generales duplicadas bajo `config/magia`;
- sin migración de partidas;
- sin contenido físico de HP3;
- sin objetivos modificables de HP2;
- sin atributos internos modificables de HP4;
- sin modificación de fórmulas canónicas de combate;
- sin cambios visuales que requieran actualizar el Diseño Maestro Visual.

## Conventional Commit propuesto

```text
refactor(habilidades): generalizar progresión y configuración

- reemplazar la progresión mágica por ProgresoHabilidadesJugador sin wrappers ni configuraciones antiguas;
- mover maestrías y habilidades al catálogo general y soportar categorías configurables y tipos activa/pasiva;
- adaptar panel, barra, perfiles visuales, persistencia, balance y depuración al contrato general;
- versionar el guardado y la barra sin migraciones históricas y eliminar aliases anteriores;
- validar JSON, imports, sintaxis y contratos de progresión/pasivas sin agregar dependencias;
- actualizar README, Plan Maestro de habilidades y documentación de entrega.
```

## ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Habilidades pasivas y modificadores canónicos de Dark Moon.

ETAPA CERRADA:
HP1 — Generalización de progresión y configuración

ESTADO:
Cerrada

COMMIT BASE:
029e3d675f7bb9d3037fc81fb650ba9520a10d86

HEAD FINAL VERIFICADO:
029e3d675f7bb9d3037fc81fb650ba9520a10d86

GIT STATUS FINAL:
Cambios de HP1 presentes en el árbol de trabajo y sin commit. Ver listado exacto de `git status` en esta entrega.

DOCUMENTO DE ENTREGA:
docs/phaser/entregas/ENTREGA_HP1.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md: Sin cambios

OBJETIVO QUE SE COMPLETÓ:
Generalizar la progresión y configuración de habilidades, eliminar la dependencia conceptual de magia y dejar un único contrato capaz de contener habilidades activas y pasivas sin migraciones históricas.

ARQUITECTURA HEREDADA:
`ProgresoHabilidadesJugador` es la única progresión; los catálogos generales viven en `src/config/habilidades`; categorías y maestrías son configurables; las pasivas progresan pero no se ejecutan ni usan barra/perfil visual; `Player.progresoHabilidades` y `progresoHabilidades` son los estados canónicos; no existen wrappers ni configuraciones antiguas de progreso mágico.

ARCHIVOS CLAVE:
- src/juego/maestrias/ProgresoHabilidadesJugador.js: fuente única de puntos, XP, maestrías y grados.
- src/juego/maestrias/ValidadorConfiguracionProgresoHabilidades.js: contrato general de categorías, maestrías y activa/pasiva.
- src/config/habilidades/Maestrias.json: categorías y maestrías generales.
- src/config/habilidades/Habilidades.json: catálogo general de habilidades.
- src/entidad/destructible/combatiente/Player.js: propietario del progreso del jugador.
- src/partida/PersistenciaJugador.js: persistencia nueva sin migración.

DEPENDENCIAS Y VERSIONES:
Ninguna dependencia nueva o actualizada en HP1.

PRUEBAS CLAVE SUPERADAS:
- 38 JSON parseados y 726 imports relativos resueltos sin errores;
- 24 JS modificados/nuevos compilados por V8 sin errores de sintaxis;
- 20 pruebas ejecutadas de contrato general, pasivas, barra y perfiles visuales correctas;
- cero referencias productivas y cero archivos supervivientes del progreso/configuración antiguos;
- pruebas manuales básicas de HP1 superadas según validación reportada por el usuario.

PROBLEMAS O RIESGOS PENDIENTES:
- Ninguno conocido para HP1 tras la validación manual reportada por el usuario.

DECISIONES APROBADAS:
- eliminar completamente wrappers/configuraciones antiguas;
- no implementar migración ni compatibilidad con guardados previos;
- diferir diseño fuerte de maestrías físicas y pasivas a HP3;
- generalizar el panel por configuración sin rediseño visual.

DECISIONES QUE SIGUEN ABIERTAS:
Las propias de HP2: inventario exhaustivo de objetivos modificables, contrato final de registros/operaciones y puntos exactos de integración del resolutor.

SIGUIENTE ETAPA RECOMENDADA:
HP2 — Auditoría exhaustiva, contrato, resolutor y afijos globales

OBJETIVO DE LA SIGUIENTE ETAPA:
Auditar exhaustivamente todas las variables y ecuaciones potencialmente modificables de combatientes, incluyendo enemigos, escudos, quiver y dominios no enumerados; cerrar el registro/contrato y resolutor canónico y absorber la integración de afijos globales sin crear motores paralelos.

PRIMEROS ARCHIVOS A REVISAR:
- src/entidad/destructible/combatiente/EstadisticasDerivadas.js
- src/entidad/destructible/combatiente/ConfiguracionAtaque.js
- src/entidad/destructible/combatiente/Combatiente.js
- src/entidad/destructible/combatiente/Player.js
- src/juego/visibilidad/PercepcionJugador.js
- src/juego/objetos/SistemaAfijos.js
- src/juego/efectos/SistemaEfectosTemporales.js

NO MODIFICAR SIN NUEVA APROBACIÓN:
- contrato general `ProgresoHabilidadesJugador` cerrado por HP1;
- fórmulas canónicas de combate/movimiento/muerte/XP/botín salvo punto de conexión previamente propuesto;
- diseño de maestrías físicas y catálogo de pasivas reservado para HP3.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Existe un inventario exhaustivo basado en código real, un registro canónico único de objetivos válidos, un resolutor común para combatientes y afijos globales integrados al mismo contrato, sin excepciones por ID/nombre ni resultados derivados persistidos, con pruebas de operaciones/condiciones y desglose canónico.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
refactor(habilidades): generalizar progresión y configuración

- reemplazar la progresión mágica por ProgresoHabilidadesJugador sin wrappers ni configuraciones antiguas;
- mover maestrías y habilidades al catálogo general y soportar categorías configurables y tipos activa/pasiva;
- adaptar panel, barra, perfiles visuales, persistencia, balance y depuración al contrato general;
- versionar el guardado y la barra sin migraciones históricas y eliminar aliases anteriores;
- validar JSON, imports, sintaxis y contratos de progresión/pasivas sin agregar dependencias;
- actualizar README, Plan Maestro de habilidades y documentación de entrega.

----------------- FIN DEL ENLACE -----------------
