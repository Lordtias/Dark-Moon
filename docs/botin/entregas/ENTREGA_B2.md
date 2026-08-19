# ENTREGA B2 — Migración de fuentes, Desechables y destrucción

## 1. Estado de la entrega

- Plan: Botín canónico de Dark Moon.
- Etapa: B2 — Migración de fuentes, Desechables y destrucción.
- Estado: **Cerrada. Implementación completa, validación técnica superada y pruebas manuales aprobadas por el usuario el 19/08/2026.**
- Repositorio: `/mnt/data/darkmoon_b2_review/Dark-Moon`.
- Rama: `main`.
- Commit base: `f2c2ec68e011fc0f67250688ca4debb61d524c23`.
- HEAD verificado antes y después de implementar: `f2c2ec68e011fc0f67250688ca4debb61d524c23`.
- `origin/main` al iniciar B2: `f2c2ec68e011fc0f67250688ca4debb61d524c23`.
- Commit realizado: **No**.
- Push realizado: **No**.
- Dependencias instaladas: **Ninguna**.

La copia entregada por el usuario ya contenía B1 commiteada y tenía el árbol limpio al iniciar B2. Esto corrige el enlace heredado de B1, que todavía describía sus cambios como pendientes de commit.

---

## 2. Alcance aprobado

B2 debía:

- migrar enemigos, cofres, recipientes y destructibles al contrato canónico;
- separar drops específicos de recompensas genéricas;
- incorporar `Desechables.json`;
- reservar Materiales a Madera, Tela, Metal y Piedra;
- distinguir abrir de destruir;
- conservar solamente el contenido todavía existente al destruir;
- aplicar 80 % de supervivencia por objeto/pila restante;
- generar materiales estructurales mediante el motor canónico;
- integrar Élite → Equipamiento desde configuración;
- eliminar `tablaBotinAdicional` como concepto productivo;
- dejar `SistemaBotin` como única ruta productiva;
- mantener dentro de `SistemaBotin` también la consulta de valor esperado utilizada por el presupuesto;
- eliminar la espada de acero mágica forzada del Señor de la Guerra y reemplazarla por una probabilidad alta sin rareza forzada;
- mostrar una píldora `Material` en el detalle de los objetos de tipo material;
- eliminar `estadoBalance: provisional_b1` de configuración productiva sin reemplazarlo por otro identificador de etapa.

No se modificaron contratos canónicos de movimiento, daño, muerte, experiencia, habilidades ni modificadores.

---

## 3. Resumen sencillo

Antes de B2, el nuevo contrato de B1 existía pero las fuentes reales todavía usaban tablas con IDs concretos. Después de B2, enemigos, cofres, recipientes y destructibles entregan solicitudes declarativas a `SistemaBotin`.

`SistemaBotin` resuelve tanto la generación real como la consulta analítica de valor esperado. El planificador de población ya no sabe interpretar probabilidades o pesos de botín por su cuenta.

Los restos de enemigos se separaron como Desechables. Madera, Tela, Metal y Piedra son ahora Materiales. Al romper un recipiente, sólo las pilas que todavía permanecen dentro participan de una tirada de supervivencia del 80 %; después se generan los materiales estructurales correspondientes. Abrir no genera materiales ni reconstruye contenido.

---

## 4. Arquitectura anterior y final

### Antes

```text
Fuente
  ↓
tablaBotin / tablaBotinAdicional
  ↓
interpretaciones heredadas por generación y presupuesto
  ↓
SistemaBotin / contenido de contenedor
```

### Después

```text
Fuente
  ↓
Solicitud canónica
  ↓
SistemaBotin
  ├── resolverSolicitudBotin()                 → generación real
  ├── calcularValorEsperadoSolicitudBotin()    → consulta analítica
  └── resolverSupervivenciaContenidoDestruido()→ regla de destrucción
  ↓
Resultado canónico
  ↓
BotinSuelo / ContenedorObjetos / presupuesto
```

El presupuesto consulta el motor; no existe `CalculadorValorEsperadoBotin.js` ni un segundo intérprete de loot.

---

## 5. Migración de contenido

### 5.1 Desechables

Se agregó `src/config/objetos/Desechables.json` y se movieron, conservando ID y función económica:

- `cola_rata`;
- `caparazon_cucaracha`;
- `hueso_esqueleto`;
- `carne_putrefacta`;
- `hueso_negro`.

Su tipo pasa a ser `desechable` y continúan siendo vendibles.

### 5.2 Materiales

`Materiales.json` queda reservado inicialmente a:

- `madera`;
- `tela`;
- `metal`;
- `piedra`.

Se agregaron iconos 64×64 RGBA transparentes para los cuatro materiales.

Los materiales muestran una píldora `Material` derivada de `tipo: material`; la palabra no se copia dentro de la descripción del objeto.

### 5.3 Munición

`flecha_madera` incorpora metadatos de cantidad genérica de 3 a 7 unidades para evitar que una selección genérica produzca siempre una única flecha.

---

## 6. Enemigos y variantes

Todos los enemigos recurrentes y especiales se migraron a `solicitudBotin`.

Los restos característicos continúan como específicos. Equipamiento, consumibles y munición general pasan a perfiles/marcos.

La variante `elite` agrega declarativamente el marco `equipamiento` desde `VariantesEnemigos.json`. No existe una condición `if elite` dentro de `SistemaBotin` ni un perfil `enemigo_elite`.

El Señor de la Guerra ya no garantiza una `espada_acero` mágica. `espada_acero` queda como drop específico con 75 % de probabilidad y sin `rarezaForzada`; si aparece, su rareza sigue el generador canónico.

---

## 7. Cofres, recipientes y destructibles

Los cofres y contenidos de recipientes se generan una sola vez al crear la entidad y quedan materializados en `ContenedorObjetos`.

Los cofres importantes utilizan `recompensa_mayor` con los marcos `comunes` y `equipamiento`, sin específicos ni garantizados. La importancia del cofre queda determinada por el perfil y los marcos canónicos, no por un ID ni una rareza fija.

`tablaBotinAdicional` de encuentros especiales fue eliminada y no se reemplazó por otra tabla paralela; esos premios se absorben en el marco genérico de Equipamiento.

Los destructibles declaran una `solicitudBotinDestruccion` acorde a su composición, por ejemplo:

- silla/banco/mesa → Madera;
- cama → Madera + Tela;
- reja → Metal;
- lápida → Piedra;
- sarcófago → Piedra + Tela.

Restos abandonados y pilas de huesos pueden producir Desechables mediante el mismo contrato, sin convertirse en materiales estructurales.

---

## 8. Abrir frente a destruir

### Abrir

```text
crear recipiente
→ generar contenido una vez
→ guardar instancias reales
→ abrir/retirar instancias
```

No se generan materiales estructurales ni se vuelve a tirar contenido.

### Destruir

```text
extraer contenido que todavía queda
→ 80 % de supervivencia por pila
→ depositar las mismas instancias sobrevivientes
→ resolver solicitud estructural
→ depositar materiales/desechables resultantes
```

Una pila sobrevive o se destruye entera. Una pila de 10 flechas no se convierte parcialmente en 8 mediante esta regla.

La probabilidad vive en `src/config/botin/ReglasBotin.json` y usa una secuencia pseudoaleatoria dedicada `supervivencia-contenido`, separada de selección, específicos y generación de objetos.

---

## 9. Balance y presupuesto

`estadoBalance: provisional_b1` fue eliminado de `PerfilesBotin.json`. No se creó `provisional_b2` ni metadata equivalente.

El estado del balance pertenece al Plan Maestro y a esta entrega.

La consulta `SistemaBotin.calcularValorEsperadoSolicitudBotin()` reutiliza:

- solicitud normalizada;
- perfiles;
- marcos efectivos;
- candidatos;
- pesos;
- rangos de cantidad;
- específicos;
- garantizados.

No consume RNG ni crea objetos. El planificador de población consulta esa función.

Comparación de referencia contra las tablas heredadas:

- enemigos recurrentes como conjunto: aproximadamente −23 %;
- especiales sin jefe como conjunto: aproximadamente +17 %;
- jefe: aproximadamente +18 %;
- contenidos genéricos de recipientes: aproximadamente dentro de ±30 %;
- cofres moderados: aproximadamente −12 %;
- cofres importantes: 2–3 tiradas seguras de `recompensa_mayor` sobre `comunes` + `equipamiento`; Equipamiento es muy probable pero no garantizado y no existe un ID/rareza fijo.

Los materiales estructurales son recompensa nueva y se presupuestan además del contenido mediante la misma consulta canónica.

---

## 10. Archivos modificados

- `assets/estilos/modales/modal-detalle-objeto.css`
- `docs/botin/PLAN_MAESTRO_BOTIN_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
- `src/config/botin/PerfilesBotin.json`
- `src/config/entidades/Enemigos.json`
- `src/config/entidades/EnemigosEspeciales.json`
- `src/config/entidades/VariantesEnemigos.json`
- `src/config/entidades/mazmorra/Decoraciones.json`
- `src/config/entidades/mazmorra/Obstaculos.json`
- `src/config/entidades/mazmorra/Recipientes.json`
- `src/config/idiomas/en.json`
- `src/config/idiomas/es.json`
- `src/config/mapas/Alcantarilla.json`
- `src/config/mapas/CasaGuerrero.json`
- `src/config/mapas/Cementerio.json`
- `src/config/mapas/FortalezaAbandonada.json`
- `src/config/mapas/SalaGuerra.json`
- `src/config/objetos/Materiales.json`
- `src/config/objetos/Municiones.json`
- `src/entidad/destructible/Destructible.js`
- `src/entidad/destructible/combatiente/Combatiente.js`
- `src/entidad/destructible/combatiente/Enemigo.js`
- `src/herramientas/depuracion/ValidadorInfraestructuraEntidades.js`
- `src/interfaz/objetos/PresentadorObjeto.js`
- `src/interfaz/objetos/VistaDetalleObjeto.js`
- `src/juego/botin/ContextoGeneracionBotin.js`
- `src/juego/botin/ContratoBotin.js`
- `src/juego/botin/SelectorObjetosBotin.js`
- `src/juego/botin/SistemaBotin.js`
- `src/juego/botin/ValidadorConfiguracionBotin.js`
- `src/juego/combate/ResolutorDestruccionesJugador.js`
- `src/juego/configuracion/CargadorConfiguracion.js`
- `src/juego/configuracion/ValidadorConfiguracionEntidadesMazmorra.js`
- `src/juego/configuracion/ValidadorConfiguracionMapas.js`
- `src/juego/fabricas/FabricaDestructibles.js`
- `src/juego/fabricas/FabricaEnemigos.js`
- `src/juego/fabricas/FabricaEntidadesMazmorra.js`
- `src/juego/generacion/GeneradorEncuentroEspecial.js`
- `src/juego/generacion/PlanificadorPoblacionMazmorra.js`
- `src/juego/generacion/PobladorEnemigosMazmorra.js`
- `src/juego/generacion/PobladorInteractuablesMazmorra.js`

---

## 11. Archivos agregados

- `assets/imagenes/materiales/madera.png`
- `assets/imagenes/materiales/metal.png`
- `assets/imagenes/materiales/piedra.png`
- `assets/imagenes/materiales/tela.png`
- `src/config/botin/ReglasBotin.json`
- `src/config/objetos/Desechables.json`
- `docs/botin/entregas/ENTREGA_B2.md`

No se eliminó ningún archivo.

---

## 12. Dependencias y versiones

No se agregó, eliminó ni actualizó ninguna dependencia.

Se conservan:

- Phaser `4.2.1`;
- Electron `43.3.0`;
- `@electron/packager` `20.0.1`.

`package.json`, `package-lock.json` y `electron/**` no se modifican.

No existe procedimiento de instalación propio de B2.

---

## 13. Aplicación del incremental

El ZIP incremental contiene todos los archivos completos modificados o agregados con su ruta relativa.

Aplicación:

1. partir de la base cuyo HEAD es `f2c2ec68e011fc0f67250688ca4debb61d524c23` o de una copia equivalente sin cambios incompatibles;
2. descomprimir el incremental en la raíz de Dark Moon;
3. permitir reemplazar los archivos existentes;
4. conservar las rutas de los archivos nuevos;
5. no eliminar ningún archivo: B2 no tiene bajas físicas;
6. revisar `git status` antes de ejecutar el juego.

No hay librerías que instalar ni desinstalar.

---

## 14. Ejecución

### Web

Desde la raíz:

```bash
python3 -m http.server 8000
```

En Windows también puede utilizarse:

```bash
python -m http.server 8000
```

Abrir:

```text
http://localhost:8000/index.html
```

### Electron

B2 no modifica su mecanismo. Si la copia del usuario ya posee las dependencias instaladas:

```bash
npm start
```

No se ejecutó Electron en esta copia porque el ZIP no contiene `node_modules` y no existe un binario `electron` disponible. No se instalaron dependencias para forzar la prueba.

---

## 15. Pruebas técnicas realizadas

| Prueba | Preparación / pasos | Esperado | Obtenido | Estado |
|---|---|---|---|---|
| JSON | Parsear todos los JSON del repositorio | 0 errores | 41 JSON válidos | Correcto |
| Sintaxis JS de `src` | `node --check` sobre todos los JS | 0 errores | 278 válidos | Correcto |
| Entradas principales | `node --check game.js` y `electron/main.js` | 0 errores | Ambos válidos | Correcto |
| Imports ES | Comprobar imports relativos reales | 0 faltantes | 529 revisados, 0 faltantes | Correcto |
| Recursos visuales JSON | Comprobar rutas visuales referenciadas | 0 faltantes | 202 referencias, 0 faltantes | Correcto |
| Diff | `git diff --check` | Sin whitespace errors | Sin errores | Correcto |
| Configuración de botín/mapas | Ejecutar validadores reales | Sin error | `CONFIG_B2_OK` | Correcto |
| Solicitudes reales | Enemigos, Élite, entidades y mapas en niveles límite | 0 inválidas | 132 validaciones, 0 errores | Correcto |
| Infraestructura | Ejecutar `ValidadorInfraestructuraEntidades` | Sin error | `VALIDADOR_INFRA_OK` | Correcto |
| Valor esperado canónico | Comparar costo consumido con consulta de `SistemaBotin` | Igual valor | Rata 6.99 = costo 6.99 | Correcto |
| Supervivencia 0 % | Forzar regla a 0 en configuración de prueba | Ninguna pila preexistente sobrevive | Sólo aparece material estructural | Correcto |
| Supervivencia 100 % | Forzar regla a 100 | Toda pila preexistente sobrevive | Poción conservada + material estructural | Correcto |
| Apertura parcial + destruir | Retirar antes una pila y luego romper | Lo retirado no reaparece | No reapareció; sólo material estructural | Correcto |
| Supervivencia 80 % | 1000 pilas con semilla fija | Cercano al 80 %, reproducible, sin dividir pila | 798/1000 = 79.8 %, reproducible, cantidades intactas | Correcto |
| Píldora Material | Presentar Madera y Desechable | Material muestra categoría; desechable no muestra “sin estadísticas” | `Material` visible en presentación de Madera | Correcto |
| Persistencia | Snapshot/restauración v4 con Madera×3 y Cola×2 | IDs, cantidades y tipos idénticos | Madera material×3 y Cola desechable×2 restauradas | Correcto |
| Generación procedural | 10 semillas × 5 mazmorras | 50 generaciones completas | 50/50 correctas | Correcto |
| Web estática | Servidor HTTP limpio y solicitudes a entradas/recursos B2 | HTTP 200 | Todos los recursos consultados respondieron 200 | Correcto |
| Electron runtime | Ejecutar `npm start` | Juego funcional | No ejecutable sin dependencias instaladas | Pendiente |
| Juego manual | Ejecutar la batería manual solicitada de B2 dentro del juego | Sin regresión funcional/visual | El usuario confirmó el 19/08/2026 que las pruebas de B2 fueron satisfactorias | Correcto |

Los scripts auxiliares usados para estas validaciones viven fuera del repositorio y no forman parte del incremental.

---

## 16. Regresión encontrada durante la implementación

La primera distribución de perfiles genéricos hizo que una composición de Alcantarilla excediera el presupuesto de población.

Se comprobó la misma semilla contra una copia limpia obtenida desde el `HEAD` base y allí sí generaba correctamente, por lo que se confirmó que era una regresión introducida por el balance de B2.

No se aumentó el presupuesto para ocultarla. Se corrigió asignando grados de recompensa genérica coherentes a contenidos/cofres. Después de la corrección se generaron 50 mazmorras completas sin fallos.

---

## 17. Límites y advertencias

- Node muestra el aviso preexistente `MODULE_TYPELESS_PACKAGE_JSON` al importar módulos ES directamente desde scripts de prueba. B2 no modifica `package.json` sólo para silenciar una advertencia de harness.
- Existen comentarios históricos `HP5/HP6` en CSS no tocados por B2. Son deuda preexistente y no se eliminaron porque hacerlo ampliaría el alcance. Los archivos productivos modificados por B2 no introducen identificadores de etapa.
- La ejecución Electron queda pendiente por ausencia de dependencias instaladas en esta copia.
- La carga web estática fue comprobada por HTTP y la batería visual/interactiva de B2 fue aprobada manualmente por el usuario el 19/08/2026.

---

## 18. Compatibilidad web

B2 sigue usando JavaScript, JSON, CSS y PNG servidos mediante rutas relativas. No incorpora Node al runtime web, CDN, bundler ni nuevas dependencias.

Se verificaron por HTTP `index.html`, `game.js`, perfiles/reglas de botín, Desechables, Materiales, el nuevo icono de Madera, CSS del detalle y `SistemaBotin.js`, todos con respuesta 200.

---

## 19. Compatibilidad Electron

No cambian:

- `electron/main.js`;
- aislamiento de contexto;
- sandbox;
- `nodeIntegration`;
- `package.json`;
- protocolo/rutas del wrapper.

`electron/main.js` conserva sintaxis válida. La ejecución real queda pendiente por ausencia de `node_modules` y binario Electron.

---

## 20. Impacto sobre persistencia

No cambia `VERSION_GUARDADO_JUGADOR`, que continúa en v4.

Los objetos se persisten por sus datos canónicos y se reconstruyen desde el catálogo. Se verificó el round-trip de:

- Madera ×3, tipo `material`;
- Cola de rata ×2, tipo `desechable`.

No se requiere migrador de guardado y el propio Plan Maestro mantiene la regla de no soportar partidas antiguas previas para esta reestructuración.

---

## 21. Pruebas manuales realizadas por el usuario

**Resultado global:** el usuario confirmó el 19/08/2026 que las pruebas de B2 fueron satisfactorias. No se reportaron fallos pendientes. La batería utilizada fue la siguiente.

### A. Enemigos y drops específicos

1. Matar varias Ratas y Cucarachas.
2. Confirmar que sus restos característicos continúan apareciendo con probabilidad, no de forma obligatoria.
3. Matar esqueletos y enemigos armados.
4. Confirmar que el equipo general ya no depende de una lista fija por enemigo.

Esperado: drops característicos conservados y recompensa general variable.

### B. Variante Élite

1. Enfrentar una variante Élite de un enemigo que normalmente sólo usa `comunes`, por ejemplo una Rata.
2. Repetir varias muestras.

Esperado: puede aparecer Equipamiento además del marco base, pero no queda garantizado.

### C. Señor de la Guerra

1. Derrotarlo varias veces/semillas.
2. Observar `espada_acero`.

Esperado: tiene probabilidad alta de aparecer, pero no 100 %; cuando aparece no queda forzada a rareza mágica.

### D. Cofres

1. Abrir cofres moderados de varias mazmorras.
2. Abrir cofres importantes.

Esperado: moderados usan recompensa genérica; importantes usan `recompensa_mayor` con `comunes` + `equipamiento`, sin objeto ni rareza garantizados.

### E. Abrir parcialmente y destruir

1. Abrir un recipiente con varias pilas.
2. Retirar una de ellas.
3. Dejar otra dentro.
4. Destruir el recipiente.

Esperado: el objeto retirado nunca reaparece; cada pila restante puede sobrevivir o perderse; después aparecen los materiales estructurales.

### F. Destruir sin abrir

1. Romper varios recipientes cerrados.
2. Comparar su contenido sobreviviente.

Esperado: aproximadamente 80 % de las pilas sobreviven a largo plazo; no hay fraccionamiento por unidad.

### G. Materiales estructurales

Romper, entre otros:

- silla/banco/mesa;
- cama;
- lápida;
- reja;
- sarcófago.

Esperado: sólo materiales compatibles con la estructura, nunca espada/poción por excepción de nombre.

### H. Materiales y Desechables en interfaz

1. Recoger Madera/Tela/Metal/Piedra.
2. Abrir su detalle.
3. Recoger Cola de rata u otro Desechable.
4. Revisar detalle e inventario.

Esperado: los Materiales muestran la píldora `Material`; Desechables no se presentan como materiales ni muestran el mensaje de “sin estadísticas” como si fueran objetos desconocidos.

### I. Comercio

Vender un Desechable.

Esperado: continúa siendo vendible con su valor base y no se incorpora automáticamente al stock aleatorio del mercader.

### J. Guardar/cargar

Guardar con Materiales y Desechables en inventario y volver a cargar.

Esperado: cantidades e identidad se conservan.

### K. Regresión general

Comprobar:

- movimiento;
- espera;
- ataque;
- habilidades;
- muerte;
- experiencia;
- botín;
- inventario;
- transición entre mapas;
- zoom/redimensionamiento;
- consola sin errores.

---

## 22. Cierre formal de B2

B2 queda **Cerrada**.

El usuario confirmó el 19/08/2026 que las pruebas manuales de B2 fueron satisfactorias. No se informaron incidencias pendientes de gameplay, botín, destrucción, inventario ni presentación.

La validación técnica previa también quedó superada. Electron no fue ejecutado de forma independiente por el asistente en esta copia porque el ZIP no contenía `node_modules` ni un binario Electron disponible; no se instalaron dependencias para forzar esa prueba. Esta limitación queda documentada y no impide el cierre al no existir una regresión específica conocida del wrapper.

No iniciar B3 automáticamente.

---

## 23. Conventional Commit propuesto

```text
feat(botin): migrar fuentes y destruccion al contrato canonico

- migra enemigos, cofres, recipientes y destructibles a solicitudes canónicas;
- separa Desechables de Materiales e incorpora Madera, Tela, Metal y Piedra;
- integra Élite → Equipamiento y la consulta de valor esperado dentro de SistemaBotin;
- aplica supervivencia configurable del contenido destruido sin regenerar objetos retirados;
- elimina tablas y rutas productivas heredadas y ajusta el balance contra el presupuesto procedural;
- valida configuraciones, 132 solicitudes, persistencia, 50 mazmorras y carga web;
- actualiza el Plan Maestro de Botín, el Diseño Maestro Visual y la entrega B2.
```

No se realizó el commit.

---

## 24. ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Plan Maestro — Botín Canónico de Dark Moon

ETAPA CERRADA:
B2 — Migración de fuentes, Desechables y destrucción

ESTADO:
Cerrada

COMMIT BASE:
f2c2ec68e011fc0f67250688ca4debb61d524c23

HEAD FINAL VERIFICADO:
f2c2ec68e011fc0f67250688ca4debb61d524c23

GIT STATUS FINAL:
48 cambios de B2 pendientes de commit: 41 archivos modificados y 7 archivos nuevos; 0 eliminados. Verificado con `git -c core.autocrlf=true status --porcelain=v1 -uall`. No se realizó commit ni push.

DOCUMENTO DE ENTREGA:
docs/botin/entregas/ENTREGA_B2.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/botin/PLAN_MAESTRO_BOTIN_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md

OBJETIVO QUE SE COMPLETÓ:
Migrar las fuentes productivas de botín al contrato canónico, separar Desechables y Materiales, implementar abrir/destruir con supervivencia configurable, integrar Élite → Equipamiento y hacer que generación y valoración presupuestaria dependan de un único SistemaBotin.

ARQUITECTURA HEREDADA:
SistemaBotin es la única autoridad del botín. Las fuentes entregan solicitudes Perfil + Marcos + Contexto + Específicos + Garantizados. La consulta de valor esperado también pertenece a SistemaBotin. Los recipientes materializan contenido una sola vez; destruir sólo procesa lo que sigue dentro y luego genera recompensas estructurales. Élite modifica marcos desde configuración y no existe lógica especial por nombre.

ARCHIVOS CLAVE:
- src/juego/botin/SistemaBotin.js: única generación productiva, consulta de valor esperado y supervivencia del contenido destruido.
- src/config/botin/PerfilesBotin.json: balance genérico sin identificadores de etapa.
- src/config/botin/ReglasBotin.json: probabilidad de supervivencia de contenido.
- src/config/objetos/Desechables.json: restos vendibles sin utilidad funcional actual.
- src/config/objetos/Materiales.json: Madera, Tela, Metal y Piedra.
- src/config/entidades/VariantesEnemigos.json: Élite agrega Equipamiento declarativamente.

DEPENDENCIAS Y VERSIONES:
Ninguna nueva. Phaser 4.2.1, Electron 43.3.0 y @electron/packager 20.0.1 se conservan.

PRUEBAS CLAVE SUPERADAS:
- 132 solicitudes reales válidas y validador de infraestructura completo superado.
- supervivencia 80 %: 798/1000 pilas, reproducible por semilla y sin dividir cantidades.
- 50/50 mazmorras completas generadas correctamente y presupuesto consultando a SistemaBotin.
- persistencia v4 de Materiales/Desechables y carga HTTP de recursos B2 correctas.
- pruebas manuales de B2 aprobadas por el usuario el 19/08/2026.

PROBLEMAS O RIESGOS PENDIENTES:
- Electron no fue ejecutado de forma independiente por el asistente por ausencia de `node_modules`/binario; no se instalaron dependencias.
- comentarios históricos HP5/HP6 preexistentes en CSS ajenos a B2 permanecen fuera de alcance.

DECISIONES APROBADAS:
- SistemaBotin es también la autoridad para calcular valor esperado; no existe calculador paralelo.
- Señor de la Guerra no fuerza espada de acero mágica; la espada queda como específico de alta probabilidad sin rareza forzada.
- Materiales muestran una píldora Material derivada de su tipo canónico.
- estadoBalance/provisional_b1 se elimina de producción y no se reemplaza por un identificador de B2.
- cuatro marcos canónicos: Equipamiento, Comunes, Materiales y Desechables; supervivencia inicial 80 % por pila; Élite agrega Equipamiento desde configuración.

DECISIONES QUE SIGUEN ABIERTAS:
- balance numérico de Suerte, resistencias base de joyería y Tier III reservado a B3 según el Plan Maestro.

SIGUIENTE ETAPA RECOMENDADA:
B3 — Suerte, joyería y Tier III

OBJETIVO DE LA SIGUIENTE ETAPA:
Implementar Carisma → Suerte, Ajuste comercial, Hallazgo mágico, Fortuna, De lucidez, accesorios Tier I/II/III, 24 bases elementales de joyería, Tier III de equipo, nuevos assets y las actualizaciones necesarias del Panel de Personaje y Diseño Maestro Visual.

PRIMEROS ARCHIVOS A REVISAR:
- docs/botin/PLAN_MAESTRO_BOTIN_DARK_MOON.md
- src/config/ConfiguracionPersonaje.json
- src/juego/botin/SistemaBotin.js
- src/config/objetos/Armaduras.json
- src/config/objetos/GeneracionObjetos.json

NO MODIFICAR SIN NUEVA APROBACIÓN:
- contratos canónicos de movimiento, combate, muerte y experiencia.
- motor canónico de modificadores y registros de objetivos/atributos de habilidades, salvo integración explícitamente necesaria para B3.
- Planes Maestros cerrados de Habilidades y Mazmorras.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Suerte y sus tres usos aprobados deben resolverse canónicamente sin reglas duplicadas; joyería y Tier III deben generarse mediante los sistemas de objetos/botín existentes; los valores de resistencia y balance deben quedar definidos y probados; Panel de Personaje y Diseño Maestro Visual deben reflejar los nuevos datos; persistencia, web y Electron deben conservar compatibilidad; y no debe introducirse una segunda ruta de generación o cálculo.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
feat(botin): migrar fuentes y destruccion al contrato canonico

- migra enemigos, cofres, recipientes y destructibles a solicitudes canónicas;
- separa Desechables de Materiales e incorpora Madera, Tela, Metal y Piedra;
- integra Élite → Equipamiento y la consulta de valor esperado dentro de SistemaBotin;
- aplica supervivencia configurable del contenido destruido sin regenerar objetos retirados;
- elimina tablas y rutas productivas heredadas y ajusta el balance contra el presupuesto procedural;
- valida configuraciones, 132 solicitudes, persistencia, 50 mazmorras y carga web;
- actualiza el Plan Maestro de Botín, el Diseño Maestro Visual y la entrega B2.

----------------- FIN DEL ENLACE -----------------
