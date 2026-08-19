# ENTREGA B-AUD — Auditoría post-hito de botín, objetos y recompensas

## 1. Estado de la entrega

- **Plan:** Botín canónico de Dark Moon.
- **Etapa:** B-AUD — Auditoría post-hito de botín, objetos y recompensas.
- **Estado:** Implementada técnicamente; pendiente de validación manual del usuario para el cierre formal.
- **Repositorio de trabajo:** `/mnt/data/darkmoon_baud/Dark-Moon`.
- **Rama:** `main`.
- **Commit base:** `1701ba9bb0401e49623d4ed90174aa9c895b85ab`.
- **HEAD verificado antes y después de implementar:** `1701ba9bb0401e49623d4ed90174aa9c895b85ab`.
- **`origin/main`:** `1701ba9bb0401e49623d4ed90174aa9c895b85ab`.
- **Commit/push:** no realizados.
- **Git status técnico final:** 34 cambios de B-AUD pendientes de commit: 32 archivos modificados y 2 archivos nuevos; 0 eliminados. Verificado con `git -c core.autocrlf=true status --porcelain=v1 -uall`.

La copia B3 recibida estaba limpia al ejecutar Git con la política de finales de línea esperada por el repositorio (`git -c core.autocrlf=true status --porcelain=v1 -uall`). El `git status` normal muestra ruido de CRLF/LF que no representa cambios funcionales.

---

## 2. Alcance aprobado

B-AUD audita B1–B3 y sus integraciones directas. No es una auditoría general de Dark Moon.

Decisiones aplicadas:

1. revisar también consumidores cuando se modifica un contrato compartido;
2. eliminar los afijos pendientes tanto de configuración como de documentación, sin conservar un catálogo de backlog;
3. mantener `Raro` y `Único` visibles en `Rarezas.json`, pero todavía no generables;
4. eliminar metadatos de seguimiento de desarrollo de los JSON productivos;
5. centralizar los seis atributos canónicos y retirar reglas históricas por `carisma`;
6. centralizar la validación estructural de solicitudes de botín;
7. centralizar selección ponderada sólo si conserva exactamente las tiradas reproducibles de B3;
8. hacer que el catálogo JSON sea la autoridad sobre rarezas existentes/habilitadas;
9. eliminar `obtenerTiposPorMarcoBotin()` al confirmarse sin consumidores;
10. conservar herramientas de depuración con uso explícito y corregirlas si quedaron desactualizadas;
11. no cambiar balance, fórmulas, probabilidades, contenido productivo ni persistencia;
12. una única entrega incremental y un único Conventional Commit futuro.

---

## 3. Resumen sencillo

B-AUD no añade poder, objetos ni probabilidades nuevas. Reduce la cantidad de lugares que hay que leer para entender las mismas reglas.

Los principales resultados son:

- los catálogos de afijos contienen ahora solamente los **27 afijos realmente utilizables**: 10 prefijos y 17 sufijos;
- se eliminaron **31 entradas que eran sólo ideas pendientes** y los campos de roadmap asociados;
- se descubrió y eliminó un solape real: `Sufijos.json` contenía **dos claves `de_fortuna`**; el navegador usaba silenciosamente la última;
- `Raro` y `Único` siguen visibles, pero su condición productiva se expresa como `generacionHabilitada: false`, no mediante estados de etapa/desarrollo;
- los seis atributos (`fuerza`, `destreza`, `constitucion`, `inteligencia`, `sabiduria`, `suerte`) tienen un solo contrato estructural;
- las solicitudes declarativas de botín tienen una sola validación estructural reutilizable;
- rareza, nivel de objeto, afijos, botín, población, encuentros y comercio reutilizan una selección ponderada común sin cambiar las semillas;
- la existencia/habilitación de rarezas pertenece a `Rarezas.json`; ya no existe una segunda lista codificada de las cuatro rarezas;
- se eliminó un export de botín sin consumidores;
- el contexto visual de rarezas recibe sólo nombre y color, no campos de generación que la interfaz no necesita;
- el validador manual de infraestructura quedó actualizado al catálogo de Accesorios y a la materialización diferida de B3.

---

## 4. Arquitectura anterior y final

### Antes

Había varias fuentes pequeñas de verdad alrededor de un núcleo canónico correcto:

```text
Atributos
├─ lista en Combatiente
├─ lista en Player
├─ lista en Persistencia
├─ lista en Panel
└─ validaciones especiales de Suerte/Carisma

Solicitud de botín
├─ ContratoBotin
├─ copia parcial en ValidadorConfiguracionMapas
└─ copia parcial en ValidadorConfiguracionEntidadesMazmorra

Selección ponderada
├─ rareza
├─ nivel
├─ afijos
├─ botín
├─ población
├─ encuentro especial
└─ comercio

Rarezas
├─ Rarezas.json
└─ lista codificada en RarezasObjeto.js
```

### Después

```text
Atributos
→ ContratosAtributosCombatiente
→ consumidores

Solicitud declarativa de botín
→ ContratoBotin
→ mapas / entidades / SistemaBotin

Selección ponderada reproducible
→ GeneradorAleatorio.seleccionarPonderado
→ objetos / botín / población / encuentros / comercio

Rarezas
→ Rarezas.json = catálogo y habilitación
→ RarezasObjeto.js = sólo semántica estructural Común/Mágico
```

`SistemaBotin` continúa siendo la única autoridad productiva de generación y de valor esperado. No se creó un motor alternativo.

---

## 5. Hallazgos concretos de auditoría

### 5.1. Afijos no productivos mezclados con producción

B3 cargaba 23 prefijos y 35 sufijos, aunque sólo 10 y 17 respectivamente participaban realmente de la generación.

B-AUD elimina 31 entradas de diseño/balance/motor pendiente. No se copian a otro documento por decisión explícita del usuario.

Los 27 afijos productivos conservan exactamente sus valores, pesos, restricciones, grados y orden efectivo de B3.

### 5.2. Clave JSON duplicada `de_fortuna`

El B3 original contenía dos propiedades raíz con el ID `de_fortuna` dentro de `Sufijos.json`:

- una propuesta antigua;
- la definición productiva incorporada en B3.

JSON permite que un parser convencional use silenciosamente la última definición. B-AUD conserva únicamente la productiva y se verifican todos los JSON de `src/config` mediante un parser que detecta claves duplicadas.

### 5.3. Metadatos de roadmap dentro de JSON ejecutables

Se retiraron de configuración de objetos campos sin función runtime como:

- `estado`;
- `motivoEstado`;
- `requiere`;
- `notasDiseno`;
- `propuestaBalance`.

`Rarezas.json` utiliza ahora el dato funcional `generacionHabilitada`.

### 5.4. Seis atributos repetidos

Se agregó:

`src/entidad/destructible/combatiente/ContratosAtributosCombatiente.js`

Ese contrato es consumido por combatientes, jugador, estadísticas derivadas, persistencia, configuración de Suerte y Panel de Personaje.

La validación ya no dice específicamente “Carisma no puede existir”. Exige genéricamente que las claves coincidan exactamente con el contrato vigente.

### 5.5. Validación repetida de solicitudes de botín

`ContratoBotin.js` expone la validación estructural común. Los validadores de mapas y entidades de mazmorra dejan de mantener copias propias del mismo contrato.

La validación completa de IDs de objeto, perfil y rareza continúa realizándose cuando están disponibles sus catálogos.

### 5.6. Selección ponderada repetida

`GeneradorAleatorio.js` incorpora una operación común de selección ponderada que consume exactamente una llamada al mismo RNG reproducible.

La reutilizan los consumidores auditados sin alterar orden, pesos ni número de tiradas.

### 5.7. Segunda lista de rarezas

`RarezasObjeto.js` deja de enumerar Común/Mágico/Raro/Único como catálogo alternativo.

Conserva únicamente `RAREZA_COMUN` y `RAREZA_MAGICA` porque esas dos rarezas tienen semántica estructural actual en los objetos. La autoridad sobre qué rarezas existen y cuáles pueden generarse es `Rarezas.json`.

### 5.8. Export sin uso

`obtenerTiposPorMarcoBotin()` fue eliminado de `SelectorObjetosBotin.js` después de confirmar que no poseía consumidores.

### 5.9. Herramienta de depuración desactualizada

`ValidadorInfraestructuraEntidades` fallaba ya en el B3 recibido porque:

- creaba `SistemaInteraccionJugador` sin `configuracionObjetos`;
- no cargaba `Accesorios.json`;
- todavía esperaba que los cofres materializaran el contenido al crearse.

La herramienta se actualizó al contrato actual y ahora comprueba también que un cofre materializa una sola vez y no rerollea.

No fue necesario modificar el gameplay para corregirla.

---

## 6. Archivos modificados

- `docs/botin/PLAN_MAESTRO_BOTIN_DARK_MOON.md`
- `docs/botin/entregas/ENTREGA_B3.md`
- `src/config/objetos/GeneracionObjetos.json`
- `src/config/objetos/Rarezas.json`
- `src/config/objetos/afijos/Prefijos.json`
- `src/config/objetos/afijos/Sufijos.json`
- `src/entidad/destructible/combatiente/Combatiente.js`
- `src/entidad/destructible/combatiente/EstadisticasDerivadas.js`
- `src/entidad/destructible/combatiente/Player.js`
- `src/herramientas/depuracion/ValidadorInfraestructuraEntidades.js`
- `src/interfaz/PanelPersonaje.js`
- `src/interfaz/objetos/ContextoPresentacionObjetos.js`
- `src/juego/botin/ContratoBotin.js`
- `src/juego/botin/SelectorObjetosBotin.js`
- `src/juego/botin/SistemaBotin.js`
- `src/juego/comercio/GeneradorStockMercader.js`
- `src/juego/configuracion/ValidadorConfiguracionEntidadesMazmorra.js`
- `src/juego/configuracion/ValidadorConfiguracionMapas.js`
- `src/juego/configuracion/ValidadorConfiguracionSuerte.js`
- `src/juego/generacion/GeneradorAleatorio.js`
- `src/juego/generacion/GeneradorEncuentroEspecial.js`
- `src/juego/generacion/PobladorInteractuablesMazmorra.js`
- `src/juego/generacion/UtilidadesPoblacionMazmorra.js`
- `src/juego/objetos/GeneradorNivelObjeto.js`
- `src/juego/objetos/GeneradorObjetoAleatorio.js`
- `src/juego/objetos/GeneradorRarezaObjeto.js`
- `src/juego/objetos/RarezasObjeto.js`
- `src/juego/objetos/SistemaAfijos.js`
- `src/juego/objetos/ValidadorConfiguracionGeneracionObjetos.js`
- `src/objetos/FabricaObjetos.js`
- `src/objetos/Objeto.js`
- `src/partida/PersistenciaJugador.js`

## 7. Archivos agregados

- `src/entidad/destructible/combatiente/ContratosAtributosCombatiente.js`
- `docs/botin/entregas/ENTREGA_B_AUD.md`

## 8. Archivos eliminados

Ninguno.

---

## 9. Dependencias y versiones

No se agregó, eliminó ni actualizó ninguna dependencia.

Se conservan:

- Phaser `4.2.1`;
- Electron `43.3.0`;
- `@electron/packager` `20.0.1`.

No hay instrucciones de instalación adicionales.

---

## 10. Persistencia

No cambia.

- versión durable: `v5`;
- clave: `dark-moon:estado-jugador:v5`;
- no se agregan migradores;
- no se persisten resultados derivados nuevos;
- la centralización de atributos reutiliza exactamente las seis claves que B3 ya guardaba.

---

## 11. Compatibilidad web

Se inició un servidor HTTP local sin dependencias externas y devolvieron HTTP 200:

- `/`;
- `/index.html`;
- `/game.js`;
- `/src/config/objetos/Rarezas.json`;
- `/src/config/objetos/afijos/Prefijos.json`;
- `/src/config/objetos/afijos/Sufijos.json`;
- `/src/entidad/destructible/combatiente/ContratosAtributosCombatiente.js`;
- `/src/juego/botin/ContratoBotin.js`.

La ejecución headless completa con Chromium no pudo certificarse en este entorno: el proceso quedó bloqueado por limitaciones del entorno/DBus y se terminó por timeout sin producir DOM. No se declara esa prueba como superada.

GitHub Pages no fue publicado ni modificado.

---

## 12. Compatibilidad Electron

La configuración del proyecto conserva Electron `43.3.0`, pero el ZIP recibido no contiene `node_modules`.

No se instalaron dependencias y Electron no fue ejecutado de forma independiente durante B-AUD.

B-AUD no modifica `package.json`, `electron/main.js`, preload, seguridad ni integración web/Electron.

---

## 13. Pruebas automatizadas y reproducibles

### 13.1. Equivalencia ponderada B3 → B-AUD

Se compararon **500 semillas** para:

- rarezas con Hallazgo mágico 0/25/100;
- nivel de objeto;
- afijos;
- marcos de botín;
- objetos de botín;
- selección procedural;
- encuentros especiales;
- stock comercial.

Resultado final: **idéntico byte a byte**.

SHA-256 de ambos resultados:

`035ccb89a83c6127bdf27043f4b50edf0cc3aae963b4a7f26905b2827b348763`

### 13.2. Equivalencia de solicitudes reales de botín

Se localizaron 32 solicitudes reales únicas en mapas, entidades y enemigos.

Prueba:

`32 solicitudes × 5 niveles × 5 semillas = 800 casos`.

Se compararon:

- objetos generados;
- cantidades;
- rarezas;
- nivel de objeto;
- prefijos y sufijos;
- detalle canónico;
- valor esperado;
- errores esperados.

Resultado B3/B-AUD: **idéntico byte a byte**.

SHA-256 de ambos resultados:

`2810a9a89da8ca2ba4484a942332e3c4c504d4991880ca2001ebb3ebcc53d2a9`

### 13.3. Equivalencia de mazmorras completas

Se compararon las cinco mazmorras en sus niveles mínimo y máximo con 10 semillas por combinación: **100 mazmorras completas**.

Se compararon matriz de mapa, resumen de generación, objetivos e interactuables.

Resultado B3/B-AUD: **idéntico byte a byte**.

SHA-256 de ambos resultados:

`adc52400c9530921c47f538e8a1a4e289457dd1475c2349a2deeb206080af061`

### 13.4. Estrés adicional

Se generaron **200 mazmorras completas** adicionales sobre B-AUD: 5 mapas, niveles mínimo/máximo y 20 semillas.

Resultado: **200/200 correctas**.

### 13.5. Validadores

- configuración de generación: 4 rarezas, 10 prefijos, 17 sufijos;
- mapas: 5;
- entidades de mazmorra: 23;
- `ValidadorInfraestructuraEntidades`: `valido: true`.

### 13.6. Integridad estática

- 280 módulos JavaScript: sintaxis correcta;
- 39 JSON de `src/config`: sintaxis correcta;
- claves JSON duplicadas: 0;
- 787 imports relativos revisados: 0 faltantes;
- 118 IDs de objeto combinados: 0 duplicados;
- 11 IDs de enemigo combinados: 0 duplicados;
- referencias B1/B2/B3/B-AUD dentro de `src`: 0;
- referencias `carisma` dentro de `src`: 0;
- campos de roadmap auditados dentro de `src/config/objetos`: 0;
- referencias a `obtenerTiposPorMarcoBotin`: 0;
- `git diff --check`: correcto.

---

## 14. Casos fallidos encontrados durante la auditoría

### Duplicación `de_fortuna`

Existía en el B3 original y quedó corregida.

### Validador de infraestructura

La herramienta de depuración fallaba en el B3 original por contratos que habían cambiado en B2/B3. Quedó corregida y vuelve a superar su batería.

### Orden de afijos durante la limpieza

En una primera reconstrucción del catálogo limpio, `de_fortuna` había quedado físicamente al final del archivo. Aunque los valores eran iguales, eso alteraba el orden de candidatos y por lo tanto algunas semillas reproducibles.

La prueba de equivalencia lo detectó. Se restauró el **orden efectivo que tenía B3 al parsear el JSON duplicado**, y las comparaciones finales volvieron a ser idénticas byte a byte.

Este ajuste no queda como pendiente.

### Chromium headless

Prueba pendiente por limitaciones del entorno, no por un error demostrado del juego.

### Electron

Prueba pendiente por ausencia de dependencias instaladas en la copia entregada.

---

## 15. Pruebas manuales propuestas

### M1 — Inicio y Personaje

1. iniciar el juego normalmente;
2. crear/cargar un personaje;
3. abrir Panel de Personaje;
4. verificar Fuerza, Destreza, Constitución, Inteligencia, Sabiduría y Suerte.

Esperado: el panel funciona igual que en B3 y Suerte conserva sus valores/desgloses.

### M2 — Primera mazmorra y cofre

1. entrar a Alcantarilla;
2. abrir un cofre importante;
3. cerrar la ventana;
4. volver a abrir el mismo cofre.

Esperado: carga correcta, el contenido se materializa una sola vez y no cambia al reabrir.

### M3 — Enemigo y botín

1. matar un enemigo;
2. recoger su botín;
3. comprobar inventario.

Esperado: flujo indistinguible de B3.

### M4 — Objetos mágicos y joyería

1. generar/encontrar equipo mágico;
2. comprobar nombre, color, prefijos/sufijos y tooltip;
3. equipar una joya con un afijo global cuando esté disponible.

Esperado: presentación y efectos iguales a B3.

### M5 — Comercio

1. abrir un mercader;
2. revisar stock;
3. comprar y vender.

Esperado: stock, precios y Ajuste comercial funcionan normalmente.

### M6 — Guardado/carga

1. guardar con inventario/equipo;
2. recargar;
3. verificar atributos, objetos y equipo.

Esperado: persistencia v5 sin cambios.

### M7 — Regresión de mapas altos

Entrar a Fortaleza Abandonada y Sala de Guerra con un nivel apropiado.

Esperado: generación normal, sin errores de presupuesto ni de configuración de Tier III.

---

## 16. Instrucciones para aplicar el incremental

El ZIP de B-AUD debe aplicarse **directamente sobre B3 SHA `1701ba9bb0401e49623d4ed90174aa9c895b85ab`**.

1. hacer respaldo o trabajar con Git limpio;
2. extraer el ZIP en la raíz del repositorio preservando las rutas relativas;
3. aceptar el reemplazo de los archivos existentes;
4. agregar los dos archivos nuevos;
5. no eliminar ningún archivo;
6. ejecutar las pruebas manuales anteriores;
7. revisar `git status` antes de commitear.

No hay comandos de instalación ni de desinstalación.

---

## 17. Restricciones comprobadas

- no se realizó commit;
- no se realizó push;
- no se instalaron dependencias;
- no se creó `.patch` ni `.mjs` dentro del repositorio;
- no se modificó balance;
- no se creó contenido nuevo de gameplay;
- no se creó una segunda ruta de botín;
- no se cambió persistencia v5;
- no se tocaron contratos de movimiento, combate, muerte o experiencia;
- no se tocaron contratos/atributos de habilidades;
- no se cambió el Diseño Maestro Visual;
- no se introdujo el identificador B-AUD en código/configuración productiva.

---

## 18. Riesgos y pendientes

- pruebas manuales del usuario pendientes;
- Chromium headless no pudo finalizar en este entorno;
- Electron no fue ejecutado por ausencia de `node_modules` y no se instalaron dependencias;
- `Raro` y `Único` permanecen visibles pero deshabilitados, por decisión explícita, para una implementación futura aún no definida;
- no existe B4 definida en el Plan Maestro.

---

## 19. Documentación actualizada

- `docs/botin/PLAN_MAESTRO_BOTIN_DARK_MOON.md`
- `docs/botin/entregas/ENTREGA_B3.md` — se retira la referencia documental a un afijo futuro descartado durante B-AUD.
- `docs/botin/entregas/ENTREGA_B_AUD.md`

`docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`: **Sin cambios**, porque B-AUD no modifica decisiones visuales.

---

## 20. Conventional Commit propuesto

```text
refactor(botin): auditar y consolidar contratos de recompensas

- limpia catálogos productivos de afijos y elimina metadatos de desarrollo y la definición duplicada de De fortuna;
- centraliza atributos de combatiente, validación de solicitudes de botín y selección ponderada reproducible;
- deja Rarezas.json como autoridad del catálogo y retira APIs/listas redundantes sin cambiar balance;
- actualiza el validador de infraestructura a Accesorios y materialización diferida;
- demuestra equivalencia determinista contra B3 en selección, 800 solicitudes reales y 100 mazmorras completas, más 200 generaciones de estrés;
- actualiza el Plan Maestro de Botín y documenta la entrega B-AUD.
```

No realizar el commit hasta la aprobación de las pruebas manuales.

---

## 21. ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Botín canónico de Dark Moon

ETAPA CERRADA:
B-AUD — Auditoría post-hito de botín, objetos y recompensas

ESTADO:
Pausada — implementación técnica completa, pendiente de validación manual para el cierre formal

COMMIT BASE:
1701ba9bb0401e49623d4ed90174aa9c895b85ab

HEAD FINAL VERIFICADO:
1701ba9bb0401e49623d4ed90174aa9c895b85ab

GIT STATUS FINAL:
34 cambios de B-AUD pendientes de commit: 32 archivos modificados y 2 archivos nuevos; 0 eliminados. Verificado con `git -c core.autocrlf=true status --porcelain=v1 -uall`. No hay commit ni push.

DOCUMENTO DE ENTREGA:
docs/botin/entregas/ENTREGA_B_AUD.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/botin/PLAN_MAESTRO_BOTIN_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md: Sin cambios

OBJETIVO QUE SE COMPLETÓ:
Auditar B1–B3 y sus integraciones directas para eliminar configuración de desarrollo, duplicaciones y solapes demostrados, consolidando contratos comunes sin alterar el gameplay observable de B3.

ARQUITECTURA HEREDADA:
SistemaBotin continúa como única autoridad productiva y presupuestaria. ContratosAtributosCombatiente centraliza los seis atributos. ContratoBotin centraliza la estructura de solicitudes. GeneradorAleatorio proporciona la selección ponderada reproducible común. Rarezas.json es la autoridad sobre rarezas existentes/habilitadas. Producción contiene únicamente los 27 afijos actualmente generables; Raro y Único permanecen visibles pero deshabilitados.

ARCHIVOS CLAVE:
- src/juego/botin/SistemaBotin.js: única generación productiva y consulta de valor esperado.
- src/juego/botin/ContratoBotin.js: contrato canónico reutilizable de solicitudes.
- src/juego/generacion/GeneradorAleatorio.js: RNG y selección ponderada común.
- src/entidad/destructible/combatiente/ContratosAtributosCombatiente.js: registro estructural único de atributos.
- src/config/objetos/Rarezas.json: catálogo y habilitación de rarezas.
- src/config/objetos/afijos/Prefijos.json: 10 prefijos productivos.
- src/config/objetos/afijos/Sufijos.json: 17 sufijos productivos.

DEPENDENCIAS Y VERSIONES:
Ninguna nueva. Phaser 4.2.1, Electron 43.3.0 y @electron/packager 20.0.1 se conservan.

PRUEBAS CLAVE SUPERADAS:
- 500 semillas de selecciones ponderadas idénticas byte a byte contra B3.
- 800 resoluciones de solicitudes reales de botín idénticas byte a byte contra B3.
- 100 mazmorras completas idénticas byte a byte contra B3 y 200 generaciones adicionales sin fallos.
- 39 JSON sin claves duplicadas, 280 módulos JS válidos y 787 imports relativos sin faltantes.
- ValidadorInfraestructuraEntidades completo superado.

PROBLEMAS O RIESGOS PENDIENTES:
- pruebas manuales del usuario pendientes;
- Chromium headless no certificado por limitaciones del entorno;
- Electron no ejecutado por ausencia de dependencias instaladas;
- Raro y Único siguen deshabilitados hasta una etapa futura.

DECISIONES APROBADAS:
- los afijos pendientes se eliminan también de la documentación y no se conserva backlog de ellos;
- Raro y Único permanecen en Rarezas.json visibles pero deshabilitados;
- producción no contiene metadatos de etapas/desarrollo;
- atributos, validación de solicitudes y selección ponderada se centralizan cuando existe equivalencia demostrada;
- no se cambia balance, persistencia ni gameplay B3.

DECISIONES QUE SIGUEN ABIERTAS:
- definición de una futura etapa para Raro/Único u otro contenido; no existe B4 definida.

SIGUIENTE ETAPA RECOMENDADA:
Sin B4 definida; definir explícitamente la próxima etapa antes de modificar el sistema.

OBJETIVO DE LA SIGUIENTE ETAPA:
No definido todavía en el Plan Maestro.

PRIMEROS ARCHIVOS A REVISAR:
- docs/botin/PLAN_MAESTRO_BOTIN_DARK_MOON.md
- docs/botin/entregas/ENTREGA_B_AUD.md
- src/config/objetos/Rarezas.json

NO MODIFICAR SIN NUEVA APROBACIÓN:
- SistemaBotin y el contrato canónico de solicitudes/valor esperado;
- contratos de movimiento, combate, muerte y experiencia;
- persistencia v5;
- contratos de modificadores y habilidades;
- balance B1–B3.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Debe definirse junto con la próxima etapa; no existe un alcance B4 aprobado.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
refactor(botin): auditar y consolidar contratos de recompensas

- limpia catálogos productivos de afijos y elimina metadatos de desarrollo y la definición duplicada de De fortuna;
- centraliza atributos de combatiente, validación de solicitudes de botín y selección ponderada reproducible;
- deja Rarezas.json como autoridad del catálogo y retira APIs/listas redundantes sin cambiar balance;
- actualiza el validador de infraestructura a Accesorios y materialización diferida;
- demuestra equivalencia determinista contra B3 en selección, 800 solicitudes reales y 100 mazmorras completas, más 200 generaciones de estrés;
- actualiza el Plan Maestro de Botín y documenta la entrega B-AUD.

----------------- FIN DEL ENLACE -----------------
