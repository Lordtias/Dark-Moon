# ENTREGA B1 — Contrato y motor canónico de botín

**Plan:** `docs/botin/PLAN_MAESTRO_BOTIN_DARK_MOON.md`  
**Base:** `b5b8b69df1e7faa3a3e0fd7475dc50f0019f95a0`  
**Rama:** `main`  
**Estado:** **Cerrada.** Pruebas técnicas superadas y pruebas manuales aprobadas por el usuario.  
**Fecha:** 18/08/2026

## 1. Objetivo de B1

Crear la infraestructura canónica del nuevo sistema de botín sin migrar parcialmente las fuentes productivas actuales.

B1 deja preparados:

- perfiles genéricos de recompensa;
- cuatro marcos de selección;
- contrato Perfil + Marcos + Contexto + Específicos + Garantizados;
- selección ponderada de marcos y plantillas;
- filtros de contexto;
- secuencias aleatorias separadas;
- ruta canónica para obtener `objetosGenerados: []`;
- carga y validación de perfiles durante el arranque normal.

Enemigos, cofres y destructibles continúan utilizando `tablaBotin` hasta B2. Esto es deliberado para evitar una migración productiva incompleta.

## 2. Arquitectura anterior

```text
Fuente
  ↓
tablaBotin
  ↓
SistemaBotin
  ↓
objeto generado
```

La tabla decide IDs concretos incluso para recompensas que podrían ser genéricas.

## 3. Arquitectura nueva disponible

```text
Fuente
  ↓
Solicitud canónica
  ├── perfil
  ├── marcosPermitidos
  ├── contexto
  ├── especificos
  └── garantizados
       ↓
SistemaBotin
       ↓
marcos efectivos
       ↓
selección ponderada
       ↓
filtro de candidatos
       ↓
nivel / rareza / afijos canónicos
       ↓
objetosGenerados: []
```

## 4. Perfiles

Se agrega:

`src/config/botin/PerfilesBotin.json`

Perfiles iniciales:

- `enemigo_comun`;
- `enemigo_especial`;
- `jefe`;
- `recompensa_menor`;
- `recompensa_estandar`;
- `recompensa_mayor`.

Los valores numéricos están marcados `provisional_b1`. B2 deberá contrastarlos con el valor esperado del loot actual antes de activar la migración real.

## 5. Marcos

Contrato único:

- `equipamiento` → arma, armadura, quiver, futuro accesorio;
- `comunes` → consumible, munición;
- `materiales` → material;
- `desechables` → futuro tipo desechable.

B1 reconoce ya tipos futuros sin crear todavía sus catálogos productivos.

## 6. Contexto

B1 soporta:

- marcos adicionales;
- marcos excluidos;
- IDs permitidos;
- IDs excluidos;
- etiquetas requeridas;
- etiquetas excluidas.

Esto permite que B2 implemente `elite → +equipamiento`, materiales estructurales y otras restricciones sin condicionales por nombre de entidad dentro del motor.

## 7. Específicos y garantizados

Los drops específicos conservan:

- ID concreto;
- probabilidad;
- cantidad mínima/máxima;
- rareza forzada opcional.

Los garantizados conservan:

- ID concreto;
- cantidad fija;
- rareza forzada opcional.

Un garantizado no consume una tirada para decidir si existe. Una instancia equipable puede continuar consumiendo la secuencia canónica de nivel/rareza/afijos.

## 8. Selección genérica

El perfil define:

- cantidad mínima/máxima de tiradas;
- probabilidad por tirada;
- peso de cada marco.

La fuente/contexto deja sólo los marcos efectivos.

La selección ponderada utiliza únicamente esos pesos efectivos. No necesita escribir porcentajes duplicados en cada entidad.

Después de seleccionar un marco, el motor filtra el catálogo por:

- tipo de objeto;
- nivel mínimo de generación;
- IDs permitidos/prohibidos;
- etiquetas requeridas/excluidas.

Una plantilla puede declarar opcionalmente:

- `generacionBotin.peso`;
- `generacionBotin.cantidadMinima`;
- `generacionBotin.cantidadMaxima`;
- `etiquetasBotin`.

Los valores ausentes conservan defaults seguros.

## 9. Aleatoriedad

`ContextoGeneracionBotin` crea tres secuencias dedicadas:

- `:especificos-botin`;
- `:seleccion-botin`;
- `:objetos`.

No se reutiliza la secuencia procedural del mapa para la selección genérica.

## 10. Integración de arranque

`Aplicacion` carga y valida los perfiles junto con las demás configuraciones.

La configuración pasa por:

```text
Aplicacion
→ ControladorPartida
→ GestorMapasPartida
→ ConfiguracionInicial
→ ContextoGeneracionBotin
```

Esto hace que el nuevo contrato esté disponible durante toda la mazmorra antes de crear cofres y otras entidades.

## 11. Compatibilidad productiva durante B1

Se conserva sin cambio funcional el flujo legado:

- enemigos actuales;
- cofres actuales;
- destructibles actuales;
- encuentros especiales;
- presupuesto actual de botín de mazmorras.

B1 no modifica JSON de enemigos/mapas ni sus `tablaBotin`.

La ruta nueva `resolverSolicitudBotin()` y `generarBotinCanonicoEnSuelo()` queda disponible para B2.

## 12. Ideas B2/B3 documentadas

El Plan Maestro nuevo registra expresamente:

- Materiales vs Desechables;
- Madera/Tela/Metal/Piedra;
- abrir frente a destruir;
- 80 % de supervivencia del contenido al romper recipientes;
- variante Élite agregando Equipamiento;
- Carisma → Suerte;
- Ajuste comercial;
- Hallazgo mágico;
- `De fortuna`;
- Resistencia Mental / `De lucidez`;
- joyería elemental;
- 24 bases de anillos/collares Tier I–III;
- Tier III general;
- dirección visual futura.

Los Planes Maestros cerrados de Habilidades y Mazmorras no se modifican.

## 13. Archivos agregados

- `src/config/botin/PerfilesBotin.json`
- `src/juego/botin/ContratoBotin.js`
- `src/juego/botin/SelectorObjetosBotin.js`
- `src/juego/botin/ValidadorConfiguracionBotin.js`
- `docs/botin/PLAN_MAESTRO_BOTIN_DARK_MOON.md`
- `docs/botin/entregas/ENTREGA_B1.md`

## 14. Archivos modificados

- `src/aplicacion/Aplicacion.js`
- `src/aplicacion/ControladorPartida.js`
- `src/juego/botin/ContextoGeneracionBotin.js`
- `src/juego/botin/SistemaBotin.js`
- `src/juego/configuracion/CargadorConfiguracion.js`
- `src/juego/configuracion/ConfiguracionInicial.js`
- `src/partida/GestorMapasPartida.js`

## 15. Archivos eliminados

Ninguno.

## 16. Dependencias

Ninguna dependencia nueva.

Se conservan las versiones ya presentes:

- Phaser 4.2.1;
- Electron 43.3.0;
- `@electron/packager` 20.0.1.

## 17. Persistencia

Sin cambios en B1.

El Plan Maestro registra que B3 podrá sustituir Carisma por Suerte sin migración histórica porque se asume cero partidas guardadas previas.

## 18. Diseño visual

Sin cambios en B1.

`docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md` no se modifica.

## 19. Validaciones técnicas realizadas

Resultados técnicos de B1:

- repositorio verificado en rama `main`, HEAD `b5b8b69df1e7faa3a3e0fd7475dc50f0019f95a0`;
- el ZIP original informa 225 archivos modificados por finales de línea; al normalizar CRLF/LF existen **0 diferencias semánticas** antes de B1 y `git -c core.autocrlf=true status` queda limpio;
- **39 JSON** parseados, 0 errores;
- **281 JS** inspeccionados por la validación de imports;
- **780 imports relativos** revisados, 0 rutas faltantes;
- `node --check` ejecutado sobre todos los JS de `src` y `electron`, sin errores;
- `Aplicacion.js` importada completa con Node ESM, sin error de resolución;
- `cargarConfiguracionBotin()` probado de forma aislada: carga y valida los seis perfiles;
- contrato canónico probado con una misma semilla dos veces: resultado reproducible;
- drop específico probado junto con recompensa garantizada en el mismo resultado;
- contexto con `marcosAdicionales: ["equipamiento"]` probado sobre una fuente base `comunes`: resultado efectivo `comunes + equipamiento`;
- marco `desechables` sin candidatos actuales probado con perfil de probabilidad 100 %: produce error explícito y no silencio;
- `generarBotinCanonicoEnSuelo()` probado: materializa el resultado dentro de un único `BotinSuelo`;
- `resolverTablaBotin()` fue comparado entre el ZIP base y B1 usando idéntica tabla, nivel y semillas: resumen, tiradas y resultado fueron exactamente iguales;
- `PerfilesBotin.json` pudo servirse mediante HTTP estático y descargarse correctamente;
- `git diff --check` no detectó errores de whitespace del cambio semántico;
- no se agregaron dependencias.

### Ejecución visual no certificada

Se intentó una ejecución headless de Chromium contra el servidor estático. Chromium no completó `--dump-dom` dentro del límite del entorno y no produjo un error JavaScript útil antes del timeout. Por tanto **no se registra la ejecución visual web como prueba superada** y se mantiene dentro de las pruebas manuales solicitadas al usuario.

## 20. Pruebas manuales requeridas

B1 no cambia todavía el loot productivo, por lo que la validación manual se concentra en regresión:

1. iniciar una partida nueva;
2. entrar a una mazmorra;
3. confirmar que enemigos continúan entregando el loot anterior;
4. abrir cofres y confirmar contenido anterior;
5. destruir destructibles/recipientes y confirmar comportamiento anterior;
6. comprobar que no aparecen errores de carga de `PerfilesBotin.json`;
7. revisar consola por errores;
8. probar cambio de mazmorra y una segunda expedición;
9. verificar versión web;
10. verificar Electron si se dispone del entorno.

### Resultado de las pruebas manuales

El usuario confirmó el 18/08/2026 que las pruebas manuales de B1 fueron **superadas**.

Se registra por tanto como validado por el usuario el flujo de regresión solicitado para:

- inicio de partida;
- entrada a mazmorra;
- continuidad del loot heredado de enemigos;
- apertura de cofres;
- destrucción de recipientes/destructibles;
- ausencia de errores de carga observados durante la prueba;
- continuidad de expedición/cambio de mazmorra dentro del alcance probado.

Estas pruebas se registran como **validación manual del usuario** y no como ejecución automatizada del asistente.

B1 queda cerrada. B2 no se inicia automáticamente.


## 21. Estado Git de cierre

- Ruta de trabajo reconstruida para el cierre: `/mnt/data/dm_b1_close/Dark-Moon`.
- Rama: `main`.
- Commit base: `b5b8b69df1e7faa3a3e0fd7475dc50f0019f95a0`.
- HEAD final verificado: `b5b8b69df1e7faa3a3e0fd7475dc50f0019f95a0`.
- No se realizó commit ni push.
- `git -c core.autocrlf=true status --short` refleja únicamente el alcance B1: 7 archivos modificados y 6 archivos nuevos; 0 eliminados.
- Las diferencias masivas observadas con la configuración Git por defecto del ZIP corresponden a finales de línea CRLF/LF y no se consideran cambios funcionales.

## 22. Estado de cierre

**B1 — Contrato y motor canónico de botín: CERRADA.**

No quedan pendientes funcionales de B1 conocidos. Los valores de balance de `PerfilesBotin.json` continúan marcados como provisionales por diseño y deberán contrastarse en B2 antes de activar la migración productiva; esto no impide el cierre de B1 porque B1 no cambia el loot productivo.

## 23. Conventional Commit propuesto

```text
feat(botin): incorporar contrato y motor canónico de recompensas

- agrega perfiles genéricos y cuatro marcos canónicos de selección;
- incorpora solicitudes con contexto, drops específicos y garantizados;
- separa las secuencias aleatorias de selección y generación de objetos;
- integra la configuración de botín al arranque sin migrar las fuentes existentes;
- documenta el Plan Maestro de Botín y las decisiones heredadas para B2 y B3;
- valida sintaxis, configuraciones, imports, reproducibilidad, regresión del loot legado y pruebas manuales de B1.
```

No realizar el commit desde esta entrega.

## 24. ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Botín canónico de Dark Moon.

ETAPA CERRADA:
B1 — Contrato y motor canónico de botín

ESTADO:
Cerrada

COMMIT BASE:
b5b8b69df1e7faa3a3e0fd7475dc50f0019f95a0

HEAD FINAL VERIFICADO:
b5b8b69df1e7faa3a3e0fd7475dc50f0019f95a0

GIT STATUS FINAL:
13 cambios semánticos correspondientes exclusivamente a B1 pendientes de commit: 7 archivos modificados y 6 archivos nuevos; 0 eliminados. Verificado con `git -c core.autocrlf=true status --short`. No se realizó commit ni push.

DOCUMENTO DE ENTREGA:
docs/botin/entregas/ENTREGA_B1.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/botin/PLAN_MAESTRO_BOTIN_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md: Sin cambios

OBJETIVO QUE SE COMPLETÓ:
Crear el contrato y la infraestructura del motor canónico de botín con perfiles genéricos, cuatro marcos de selección, contexto, drops específicos y garantizados, manteniendo intacta la ruta productiva heredada hasta su migración completa en B2.

ARQUITECTURA HEREDADA:
`SistemaBotin` es el único motor canónico. El nuevo contrato combina Perfil + Marcos + Contexto + Específicos + Garantizados y siempre devuelve `objetosGenerados: []`. Los cuatro marcos son Equipamiento, Comunes, Materiales y Desechables. Las variantes pueden modificar declarativamente los marcos mediante contexto; Élite agregará Equipamiento en B2 sin lógica especial dentro de `SistemaBotin`. Los drops característicos permanecen específicos de la fuente.

ARCHIVOS CLAVE:
- src/juego/botin/SistemaBotin.js: orquestador canónico y compatibilidad con `tablaBotin` heredada.
- src/juego/botin/ContratoBotin.js: contrato único de solicitudes y marcos.
- src/juego/botin/SelectorObjetosBotin.js: selección ponderada y filtrado de candidatos.
- src/config/botin/PerfilesBotin.json: perfiles genéricos y pesos provisionales de B1.
- docs/botin/PLAN_MAESTRO_BOTIN_DARK_MOON.md: decisiones A–F y alcance heredado de B2/B3.

DEPENDENCIAS Y VERSIONES:
Ninguna nueva. Se conservan Phaser 4.2.1, Electron 43.3.0 y @electron/packager 20.0.1.

PRUEBAS CLAVE SUPERADAS:
- carga y validación de los seis perfiles, JSON, imports y sintaxis JS;
- reproducibilidad con misma semilla, específicos + garantizados y marcos adicionales;
- regresión de `resolverTablaBotin()` contra la base y pruebas manuales de B1 aprobadas por el usuario.

PROBLEMAS O RIESGOS PENDIENTES:
- los pesos numéricos de perfiles continúan `provisional_b1` y deben balancearse en B2 antes de activar la migración real;
- B2 deberá auditar cada `tablaBotin` existente para separar drops específicos de recompensas genéricas.

DECISIONES APROBADAS:
- A–F completas: cuatro marcos, Resistencia Mental/De lucidez, separación Materiales/Desechables y variantes contextuales;
- SistemaBotin único canónico, específicos/garantizados, abrir vs destruir, 80 % de supervivencia futura, Suerte, joyería elemental y Tier III según Plan Maestro.

DECISIONES QUE SIGUEN ABIERTAS:
- balance numérico definitivo de perfiles durante B2;
- balance numérico de resistencias base de joyería y Tier III durante B3.

SIGUIENTE ETAPA RECOMENDADA:
B2 — Migración de fuentes, Desechables y destrucción

OBJETIVO DE LA SIGUIENTE ETAPA:
Migrar enemigos, cofres, recipientes y destructibles al contrato canónico; separar drops específicos de genéricos; crear Desechables y materiales estructurales; implementar abrir frente a destruir e integrar Élite → Equipamiento desde configuración, dejando `SistemaBotin` como única ruta productiva.

PRIMEROS ARCHIVOS A REVISAR:
- src/config/entidades/Enemigos.json
- src/config/entidades/EnemigosEspeciales.json
- src/config/entidades/VariantesEnemigos.json
- src/juego/botin/SistemaBotin.js
- src/juego/combate/ResolutorDestruccionesJugador.js

NO MODIFICAR SIN NUEVA APROBACIÓN:
- contratos canónicos de movimiento, combate, muerte y experiencia;
- Planes Maestros cerrados de Habilidades y Mazmorras;
- diseño de Suerte, joyería y Tier III reservado a B3 salvo preparación estructural imprescindible ya aprobada.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Todas las fuentes productivas del alcance B2 utilizan el contrato canónico sin segunda ruta de generación; los drops característicos se conservan; Materiales y Desechables quedan separados; abrir/destruir no duplica contenido; Élite habilita Equipamiento por configuración; las tablas heredadas migradas dejan de ser necesarias; y las pruebas de regresión/balance del nuevo loot son superadas.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
feat(botin): incorporar contrato y motor canónico de recompensas

- agrega perfiles genéricos y cuatro marcos canónicos de selección;
- incorpora solicitudes con contexto, drops específicos y garantizados;
- separa las secuencias aleatorias de selección y generación de objetos;
- integra la configuración de botín al arranque sin migrar las fuentes existentes;
- documenta el Plan Maestro de Botín y las decisiones heredadas para B2 y B3;
- valida sintaxis, configuraciones, imports, reproducibilidad, regresión del loot legado y pruebas manuales de B1.

----------------- FIN DEL ENLACE -----------------
