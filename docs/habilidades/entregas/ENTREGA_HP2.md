# ENTREGA HP2 — Auditoría exhaustiva, contrato, resolutor y afijos globales

## 1. Estado de la etapa

**Estado:** Cerrada con pendientes.

La implementación y la validación técnica disponibles en este entorno están completadas. Queda pendiente la validación manual interactiva del usuario dentro del juego antes de certificar HP2 como `Cerrada`.

No se avanzó a HP3.

---

## 2. Repositorio verificado

- Ruta de trabajo: `/mnt/data/hp2_work/Dark-Moon`
- Rama: `main`
- Commit base / cierre confirmado de HP1: `f9eb1a9fd894d8c21a7103abe1b5a0a6abf3b481`
- HEAD verificado durante HP2: `f9eb1a9fd894d8c21a7103abe1b5a0a6abf3b481`
- `origin/main`: `f9eb1a9fd894d8c21a7103abe1b5a0a6abf3b481`
- Commit realizado por esta entrega: **No**
- Push realizado: **No**

El árbol partió limpio. El estado final contiene exclusivamente los cambios no confirmados de HP2 y su documentación.

---

## 3. Alcance aprobado

HP2 debía:

1. auditar exhaustivamente las variables reales del juego antes de fijar un registro;
2. crear un único contrato y `SistemaModificadoresCombatiente` para Player y Enemigo;
3. centralizar todo valor declarado como objetivo modificable;
4. soportar las matemáticas realmente utilizadas, incluyendo composición multiplicativa;
5. distinguir afijos `local_objeto` y `portador`;
6. permitir fuentes de equipo, efectos temporales, terreno/zonas, variantes enemigas y futuras fuentes equivalentes;
7. eliminar mini-resolutores y compatibilidades históricas directamente afectadas;
8. persistir fuentes y reconstruir resultados derivados, sin migraciones;
9. dejar documentadas las variables implementadas, posteriores, pendientes de decisión y deliberadamente excluidas;
10. conservar el balance y las fórmulas funcionales existentes salvo los cambios arquitectónicos expresamente aprobados.

No formaba parte de HP2:

- diseñar las maestrías físicas o el catálogo amplio de pasivas de HP3;
- activar afijos que ya estaban reservados/pendientes;
- decidir los atributos internos modificables de habilidades de HP4;
- agregar contenido jugable de terreno lodoso;
- rediseñar interfaz;
- instalar dependencias.

---

## 4. Resultado sencillo

Antes de HP2 había varios lugares capaces de alterar valores: propiedades de objetos, efectos temporales, Percepción, variantes enemigas y afijos con semánticas mezcladas.

Después de HP2 la regla es:

```text
valor base del dominio
        ↓
todas las fuentes modificadoras del objetivo
        ↓
SistemaModificadoresCombatiente
        ↓
valor modificado
        ↓
clamp/redondeo final propio del dominio
        ↓
consumidor canónico
```

Si un valor está registrado como objetivo modificable, ningún consumidor puede volver a aplicar por su cuenta pasivas, afijos del portador, efectos temporales, terreno, zonas, auras, maldiciones u otra fuente equivalente.

Las propiedades `local_objeto` continúan resolviéndose dentro del objeto porque modifican al objeto y no al portador.

---

## 5. Registro canónico implementado

Fuente única:

`src/juego/modificadores/ContratosModificadoresCombatiente.js`

Objetivos conectados:

- `vidaMaxima`
- `manaMaximo`
- `regeneracionVida`
- `regeneracionMana`
- `precision`
- `evasion`
- `armadura`
- `probabilidadCritico`
- `multiplicadorCritico`
- `probabilidadBloqueo`
- `mitigacionBloqueo`
- `potenciaEfectos`
- `potenciaHabilidad`
- `resistenciaFuego`
- `resistenciaFrio`
- `resistenciaRayo`
- `resistenciaVeneno`
- `resistenciaCongelamiento`
- `resistenciaAturdimiento`
- `resistenciaEnvenenamiento`
- `resistenciaQuemadura`
- `alcanceAtaque`
- `percepcion`
- `factorTiempo`
- `factorMovimiento`
- `factorAtaque`
- `factorAccion`
- `factorConsumo`
- `multiplicadorDanioFuente`

El Plan Maestro mantiene además el inventario completo en cuatro estados:

1. implementado en HP2;
2. previsto para una etapa posterior concreta;
3. pendiente de decisión explícita;
4. deliberadamente fuera del sistema.

Esto permite distinguir una exclusión consciente de una variable olvidada.

---

## 6. Operaciones canónicas

El centralizador soporta:

```text
sumar
porcentaje_base
porcentaje_total
multiplicar_redondear
multiplicar
```

Orden:

```text
subtotal = base + planos + (base × porcentaje_base)
despuesPorcentajeTotal = subtotal × (1 + porcentaje_total)
despuesMultiplicacionRedondeada = round(despuesPorcentajeTotal × producto_multiplicar_redondear)
resultado = despuesMultiplicacionRedondeada × producto_multiplicar
```

La etapa de redondeo solo se ejecuta cuando existen fuentes `multiplicar_redondear`.

### Motivo de `multiplicar`

Los efectos temporales ya componían multiplicadores reales. Ejemplo:

```text
1 × 1,40 × 1,60 = 2,24
```

Ese cálculo ahora ocurre dentro del centralizador.

### Motivo de `multiplicar_redondear`

Las variantes enemigas ya multiplicaban ciertos factores y redondeaban antes de que actuaran efectos temporales posteriores. Esa semántica se convirtió en una operación canónica para conservar el comportamiento existente en lugar de mantener una excepción externa.

### Vida máxima de variantes

El multiplicador de Vida de una variante se representa como `porcentaje_base`, porque históricamente multiplicaba la Vida base del enemigo y no un bono plano posterior del equipo. Esto permite centralizarlo sin alterar ese orden funcional.

Los nombres históricos `aumentarVelocidad` y `multiplicarMas` encontrados en afijos no activos quedaron documentados como decisiones futuras. No se reinterpretaron ni activaron.

---

## 7. Contexto y condiciones

Claves disponibles en HP2:

- `tipoCombatiente`
- `familiaArma`
- `mano`
- `tipoAtaque`
- `esAtaqueDual`
- `categoriaArmadura`

Una clave desconocida provoca error explícito.

Las condiciones son declarativas. No admiten `eval`, funciones serializadas ni expresiones JavaScript arbitrarias.

`categoriaArmadura` queda registrada pero la semántica de conjuntos mixtos debe aprobarse durante HP3 antes de utilizarse para pasivas.

---

## 8. Fuentes de modificadores

### 8.1. Equipo y afijos del portador

El centralizador consulta el equipamiento canónico actual. No se copia un estado secundario al equipar/desequipar.

Al retirar una pieza, su fuente deja de existir en la siguiente resolución.

### 8.2. Efectos temporales

`SistemaEfectosTemporales` conserva:

- duración;
- renovación;
- acumulación;
- suspensión;
- expiración;
- ciclo de vida del efecto.

Pero ya no escribe el factor numérico final. Expone descriptores vigentes y `SistemaModificadoresCombatiente` realiza la composición.

### 8.3. Terreno

`SistemaEspacial` dispone del punto genérico `obtenerModificadoresTerreno` / `consultarModificadoresTerreno`.

Un futuro terreno lodoso puede declarar, por ejemplo:

```text
objetivo: factorMovimiento
operacion: multiplicar
valor: 1.50
```

El modificador existe mientras el actor se encuentre sobre esa casilla y desaparece al salir. HP2 no agrega el contenido “barro”; agrega el contrato genérico.

### 8.4. Zonas temporales

Una zona puede aportar modificadores mientras el actor se encuentre dentro, además de continuar pudiendo aplicar daño/efectos como en el sistema existente.

La Nube tóxica puede seguir aplicando Envenenamiento. Una zona futura puede aportar modificadores directos, efectos o ambos.

### 8.5. Variantes enemigas

Las variantes existentes se auditaron como fuente real:

- Vida máxima registrada por el centralizador;
- factores temporales registrados por el centralizador;
- atributos primarios permanecen en construcción base, pendientes de decisión futura;
- experiencia otorgada permanece en el dominio de recompensas.

No se crearon pasivas para enemigos.

---

## 9. Afijos

Todo efecto de afijo declara obligatoriamente:

```text
ambito: local_objeto
```

o:

```text
ambito: portador
```

### Locales

Continúan componiendo propiedades del objeto. Ejemplos activos: daño local, precisión local, crítico local, armadura y bloqueo propios de una pieza.

### Portador

Se aplican únicamente mientras el objeto está equipado. Ejemplos activos migrados:

- `Vigoroso` → Vida máxima;
- `Enfocado` → Potencia de Habilidad;
- `De evasión` → Evasión;
- `De regeneración` → regeneración de Vida;
- resistencias elementales y a efectos existentes.

El objeto sigue mostrando el afijo como parte de su descripción. Por ejemplo, una varita conserva su Potencia de Habilidad intrínseca y muestra por separado el aporte de `Enfocado`; el aporte del afijo no se fusiona con la propiedad local de la varita.

Los afijos pendientes fueron clasificados por ámbito pero continúan pendientes.

---

## 10. Percepción

Se eliminó:

`src/juego/visibilidad/PercepcionJugador.js`

Player y Enemigo utilizan ahora el mismo flujo:

```text
Percepción base
→ SistemaModificadoresCombatiente
→ Percepción final
→ visibilidad / IA / persecución
```

No queda wrapper de compatibilidad.

---

## 11. Persistencia

Nuevo contrato:

```text
dark-moon:estado-jugador:v3
VERSION_GUARDADO_JUGADOR = 3
```

No existe migración v2 → v3.

Los objetos persistidos conservan sus fuentes:

- ID/plantilla;
- cantidad;
- rareza;
- nivel de objeto;
- prefijos;
- sufijos;
- contenido de contenedores.

No se persisten `propiedadesFinales` ni estadísticas derivadas de modificadores.

Al cargar:

```text
plantilla + afijos locales
→ FabricaObjetos
→ propiedades locales reconstruidas
```

Los afijos `portador` vuelven a participar del centralizador al estar equipados.

---

## 12. Compatibilidad histórica eliminada dentro del alcance

Se eliminó, sin wrappers:

- `PercepcionJugador`;
- alias `consumirMunicionAtaque()`;
- APIs alternativas antiguas de equipamiento dentro de `SistemaCatalizadores`;
- fallback antiguo de `SistemaCombate` que reconstruía componentes de daño físico cuando una fuente no ofrecía componentes tipados;
- persistencia de `propiedadesFinales`;
- entrega HP1 obsoleta en `docs/phaser/entregas`.

La entrega válida de HP1 queda únicamente en:

`docs/habilidades/entregas/ENTREGA_HP1.md`

---

## 13. Archivos agregados

- `src/juego/modificadores/ContratosModificadoresCombatiente.js`
- `src/juego/modificadores/SistemaModificadoresCombatiente.js`
- `docs/habilidades/entregas/ENTREGA_HP2.md`

---

## 14. Archivos eliminados

- `src/juego/visibilidad/PercepcionJugador.js`
- `docs/phaser/entregas/ENTREGA_HP1.md`

---

## 15. Archivos modificados

- `README.md`
- `docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md`
- `docs/habilidades/entregas/ENTREGA_HP1.md`
- `src/config/objetos/afijos/Prefijos.json`
- `src/config/objetos/afijos/Sufijos.json`
- `src/entidad/destructible/combatiente/Combatiente.js`
- `src/entidad/destructible/combatiente/ConfiguracionAtaque.js`
- `src/entidad/destructible/combatiente/Enemigo.js`
- `src/entidad/destructible/combatiente/EstadisticasDerivadas.js`
- `src/entidad/destructible/combatiente/Player.js`
- `src/herramientas/balance/AnalizadorBalanceCombate.js`
- `src/juego/Juego.js`
- `src/juego/combate/SistemaCombate.js`
- `src/juego/comercio/SistemaComercio.js`
- `src/juego/efectos/ContratosEfectosTemporales.js`
- `src/juego/efectos/SistemaEfectosTemporales.js`
- `src/juego/espacio/SistemaEspacial.js`
- `src/juego/fabricas/FabricaEnemigos.js`
- `src/juego/generacion/GeneradorEquipoInicial.js`
- `src/juego/ia/SistemaAccionesEnemigos.js`
- `src/juego/magia/SistemaCatalizadores.js`
- `src/juego/objetos/GeneradorObjetoAleatorio.js`
- `src/juego/objetos/SistemaAfijos.js`
- `src/juego/objetos/ValidadorConfiguracionGeneracionObjetos.js`
- `src/juego/tiempo/CoordinadorTiempoPartida.js`
- `src/juego/zonas/AplicadorContenidoZonaTemporal.js`
- `src/juego/zonas/SistemaZonasTemporales.js`
- `src/objetos/FabricaObjetos.js`
- `src/partida/PersistenciaJugador.js`

---

## 16. Dependencias

Nuevas dependencias: **Ninguna**.

No se instaló ni actualizó Phaser, Electron, Node.js, npm, librerías ni frameworks.

La arquitectura web y Electron existente no cambia de plataforma. Electron continúa siendo un contenedor de la misma aplicación web; HP2 no modifica `electron/main.js`, `package.json` ni `package-lock.json`.

---

## 17. Instalación / reemplazo

### Repositorio completo

Reemplazar el repositorio de pruebas por el ZIP completo entregado, preservando el flujo Git habitual del usuario.

### Incremental

Copiar los archivos completos incluidos en el ZIP incremental respetando sus rutas y eliminar los archivos listados en `ARCHIVOS_A_ELIMINAR_HP2.txt`.

No aplicar parches.

No hay comandos de instalación de dependencias.

### Desinstalación

No existe una dependencia que desinstalar. Para volver atrás debe utilizarse la copia/commit anterior del propio repositorio; esta entrega no ejecuta `git reset`, `git clean`, `checkout` ni `restore` masivos.

---

## 18. Ejecución

La ejecución del juego continúa siendo la misma documentada en `README.md`: servir el repositorio mediante HTTP y abrir la entrada web habitual.

HP2 no convierte Electron en requisito de la versión web.

---

## 19. Validaciones técnicas realizadas

### 19.1. Git

**Preparación:** repositorio HP1 entregado por el usuario.

**Pasos:** verificar rama, HEAD, `origin/main`, status y `git diff --check`.

**Esperado:** base correcta y sin errores de whitespace.

**Obtenido:** rama `main`, HEAD/origin en `f9eb1a9fd894d8c21a7103abe1b5a0a6abf3b481`; `git diff --check` correcto.

**Estado:** Correcto.

### 19.2. JSON

**Preparación:** todos los JSON del repositorio.

**Pasos:** parseo estructural mediante Python.

**Esperado:** todos válidos.

**Obtenido:** 38 JSON, 0 errores.

**Estado:** Correcto.

### 19.3. Imports relativos

**Preparación:** todos los módulos JavaScript del repositorio.

**Pasos:** recorrer imports relativos y comprobar archivo destino.

**Esperado:** ninguna ruta faltante.

**Obtenido:** 740 imports relativos, 0 faltantes.

**Estado:** Correcto.

### 19.4. Integridad léxica básica de JS modificado

**Preparación:** módulos JavaScript modificados/agregados de HP2.

**Pasos:** revisión automática de delimitadores fuera de strings/comentarios y revisión dirigida de los archivos centrales.

**Esperado:** sin delimitadores desbalanceados.

**Obtenido:** 24 archivos JS modificados/agregados revisados, 0 incidencias.

**Estado:** Correcto.

**Limitación:** no se utilizó Node.js ni se instaló un parser adicional, respetando las restricciones de la etapa. Esta comprobación no sustituye la ejecución interactiva del navegador.

### 19.5. Cobertura del registro

**Preparación:** 29 objetivos del contrato canónico.

**Pasos:** comprobar que cada constante del registro aparece en un punto de integración fuera del propio contrato.

**Esperado:** ningún objetivo declarado sin conexión.

**Obtenido:** 29/29 con punto de uso/integración.

**Estado:** Correcto.

### 19.6. Afijos

**Preparación:** Prefijos y Sufijos.

**Pasos:** verificar ámbito de cada efecto y contrato de cada afijo activo `portador`.

**Esperado:** todos con ámbito válido; portadores activos con objetivo y operación canónicos.

**Obtenido:** 64 efectos auditados; 0 ámbitos inválidos; 12 efectos activos `portador` con objetivo/operación válidos.

**Estado:** Correcto.

### 19.7. Compatibilidades antiguas

**Preparación:** código productivo `src`.

**Pasos:** buscar `PercepcionJugador`, `consumirMunicionAtaque`, `propiedadesFinales`, `obtenerEquipados` y `listarObjetosEquipados`.

**Esperado:** ninguna referencia productiva.

**Obtenido:** 0 referencias.

**Estado:** Correcto.

### 19.8. Nombres de etapa y archivos prohibidos

**Preparación:** código productivo y repositorio.

**Pasos:** buscar identificadores/comentarios HP1–HP4 en `src` y extensiones `.patch`, `.mjs`, `.tmp`, `.bak` fuera de `.git`.

**Esperado:** ninguno.

**Obtenido:** 0 nombres de etapa en `src`; 0 archivos prohibidos/temporales detectados.

**Estado:** Correcto.

### 19.9. Persistencia

**Preparación:** `PersistenciaJugador.js` y `FabricaObjetos.js`.

**Pasos:** comprobar versión, snapshot de objetos y reconstrucción.

**Esperado:** v3, sin `propiedadesFinales`, reconstrucción desde plantilla + afijos.

**Obtenido:** contrato v3; el bloque de serialización no persiste propiedades derivadas; la carga reconstruye mediante `crearObjeto`.

**Estado:** Correcto.

### 19.10. Fórmulas del centralizador

Casos comprobados:

- solo plano;
- solo `% base`;
- solo `% total`;
- combinación de los tres;
- multiplicación de dos efectos temporales;
- multiplicación con redondeo de variante + multiplicador temporal posterior;
- penalizaciones negativas de suma/porcentaje;
- equivalencia del multiplicador de Vida de variante con un bono plano posterior.

Resultados representativos:

```text
100 +20 +10% base +25% total = 162,5
1 ×1,40 ×1,60 = 2,24
round(85 ×1,25) ×1,08 = 114,48
```

**Estado:** Correcto.

### 19.11. Recursos web por HTTP

**Preparación:** servidor HTTP local Python.

**Pasos:** solicitar `index.html`, ambos módulos del centralizador y ambos catálogos de afijos.

**Esperado:** HTTP 200.

**Obtenido:** 5/5 recursos HTTP 200.

**Estado:** Correcto.

### 19.12. Navegador / Electron interactivos

**Estado:** Pendiente.

El entorno de ejecución disponible no permite certificar una sesión interactiva real del navegador local y no se instalaron dependencias de Electron. No se presenta esta prueba como realizada.

---

## 20. Pruebas manuales básicas pendientes

Estas son las pruebas recomendadas al usuario para certificar HP2:

1. iniciar una partida nueva y entrar al mapa sin errores de consola;
2. equipar/desequipar un objeto con `Vigoroso` y comprobar que Vida máxima aumenta y vuelve al valor anterior;
3. equipar/desequipar `De evasión`, `De regeneración` o una resistencia de portador y comprobar el cambio correspondiente;
4. comprobar que un afijo local de arma como Afilado/Precisión/Crítico continúa afectando solamente al arma/ataque correspondiente;
5. comprobar escudo: Armadura, probabilidad de Bloqueo y mitigación siguen funcionando;
6. comprobar arco + quiver y consumo de munición normalmente;
7. comprobar una varita con `Enfocado`: el afijo debe verse en el objeto y su aporte debe desaparecer al desequipar;
8. aplicar una ralentización/congelación/electrización que modifique factores temporales, comprobar su efecto y que al expirar vuelva al valor normal;
9. enfrentar variantes Enfermo/Gigante/Élite y comprobar que no presentan regresiones evidentes en Vida/velocidad;
10. guardar y cargar una partida nueva con objetos afijados; los afijos deben conservarse y sus aportes reconstruirse correctamente;
11. revisar consola durante toda la pasada: no deben aparecer errores del centralizador, afijos, persistencia, Percepción, zonas ni combate.

No se pide probar “terreno lodoso” porque HP2 implementa el contrato genérico, no ese contenido concreto.

---

## 21. Compatibilidad web

Arquitectónicamente compatible.

- no cambia la entrada web;
- no cambia el modelo ES Modules;
- no agrega dependencias;
- los nuevos módulos y JSON se sirven correctamente mediante HTTP.

La sesión jugable manual queda pendiente del usuario.

---

## 22. Compatibilidad Electron

Arquitectónicamente compatible.

HP2 no modifica Electron ni requiere APIs de Node en el juego. No se ejecutó Electron en este entorno y no se instaló nada para forzar esa prueba.

---

## 23. Riesgos y pendientes

- completar la regresión manual indicada antes de certificar cierre;
- HP3 debe decidir el catálogo amplio de pasivas/auras/maldiciones y la semántica de categoría de armadura mixta;
- HP4 debe auditar fuertemente los atributos internos de habilidades;
- los seis atributos primarios y otros candidatos quedan explícitamente pendientes de decisión, no olvidados;
- `aumentarVelocidad` y `multiplicarMas` siguen siendo nombres de contenido reservado sin semántica activa; una etapa futura debe decidir cómo representarlos canónicamente antes de activarlos.

---

## 24. Restricciones verificadas

- sin commit;
- sin push;
- sin dependencias nuevas;
- sin instalaciones;
- sin `.patch`;
- sin `.mjs`;
- sin motor paralelo para Player/Enemigo;
- sin wrappers de Percepción;
- sin migración de guardados;
- sin excepciones por nombre visible;
- sin nombres HP en identificadores/archivos de producción;
- sin cambios visuales que requieran modificar `DISENO_MAESTRO_VISUAL_DARK_MOON.md`;
- sin avance a HP3.

---

## 25. Conventional Commit propuesto

```text
refactor(habilidades): centralizar modificadores de combatientes

- crear el registro y resolutor canónico de modificadores para jugador y enemigos;
- conectar estadísticas, tiempo, percepción, equipo, efectos, terreno, zonas y variantes al centralizador común;
- distinguir afijos locales y del portador y reconstruir propiedades de objetos desde sus fuentes;
- versionar el guardado a v3 sin migraciones ni resultados derivados persistidos;
- eliminar mini-resolutores, wrappers y fallbacks históricos afectados por HP2;
- validar contratos, afijos, JSON, imports, fórmulas y recursos web y actualizar la documentación de diseño.
```

No realizar el commit hasta superar/aceptar la validación manual.

---

## 26. ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Habilidades pasivas, modificadores y progresión física de Dark Moon.

ETAPA CERRADA:
HP2 — Auditoría exhaustiva, contrato, resolutor y afijos globales

ESTADO:
Cerrada con pendientes

COMMIT BASE:
f9eb1a9fd894d8c21a7103abe1b5a0a6abf3b481

HEAD FINAL VERIFICADO:
f9eb1a9fd894d8c21a7103abe1b5a0a6abf3b481 (sin commit de HP2 realizado por la entrega)

GIT STATUS FINAL:
Cambios de HP2 presentes y no confirmados; rama main sobre el commit base. Requiere validación manual y commit posterior del usuario.

DOCUMENTO DE ENTREGA:
docs/habilidades/entregas/ENTREGA_HP2.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md: Sin cambios

OBJETIVO QUE SE COMPLETÓ:
Auditar el universo real de variables y centralizar los objetivos modificables del combatiente mediante un único contrato/resolutor común, diferenciando propiedades locales y fuentes del portador e integrando equipo, efectos temporales, terreno/zonas y variantes enemigas.

ARQUITECTURA HEREDADA:
Todo objetivo registrado obtiene su valor final mediante SistemaModificadoresCombatiente. Player y Enemigo usan el mismo motor. Las propiedades local_objeto se resuelven en el objeto; los modificadores portador, temporales, de entorno y futuras pasivas/auras/maldiciones se componen únicamente en el centralizador. Las operaciones vigentes son sumar, porcentaje_base, porcentaje_total, multiplicar_redondear y multiplicar. Persistencia guarda fuentes, no resultados derivados.

ARCHIVOS CLAVE:
- src/juego/modificadores/ContratosModificadoresCombatiente.js: registro único de objetivos, operaciones, ámbitos y contexto.
- src/juego/modificadores/SistemaModificadoresCombatiente.js: resolutor y desglose canónicos.
- docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md: inventario de variables, decisiones y diseño aprobado.
- src/config/objetos/afijos/Prefijos.json: ámbitos y fuentes de prefijos.
- src/config/objetos/afijos/Sufijos.json: ámbitos y fuentes de sufijos.
- src/juego/efectos/SistemaEfectosTemporales.js: ciclo de vida de efectos que ahora expone modificadores al centralizador.
- src/juego/espacio/SistemaEspacial.js: contrato genérico de modificadores de terreno.
- src/juego/zonas/SistemaZonasTemporales.js: fuentes de modificadores dependientes de zona/posición.

DEPENDENCIAS Y VERSIONES:
Ninguna nueva. Phaser/Electron existentes sin cambios.

PRUEBAS CLAVE SUPERADAS:
- 38 JSON válidos y 740 imports relativos sin rutas faltantes.
- 29/29 objetivos del registro con punto de integración y afijos activos de portador validados.
- fórmulas plano/%base/%total/multiplicación/redondeo y equivalencias históricas comprobadas.
- persistencia v3 sin propiedades derivadas y recursos web centrales servidos por HTTP 200.

PROBLEMAS O RIESGOS PENDIENTES:
- Validación manual interactiva del usuario antes de certificar HP2 como Cerrada.
- Las semánticas de atributos primarios, categoría de armadura mixta y varios afijos reservados requieren aprobación en sus etapas indicadas.

DECISIONES APROBADAS:
- Todo objetivo modificable del combatiente atraviesa SistemaModificadoresCombatiente.
- Si aparece una matemática real no representada, se amplía el contrato en vez de crear un cálculo paralelo.
- Terreno y zonas son fuentes canónicas basadas en el estado espacial real.
- Afijos distinguen local_objeto y portador; el objeto sigue describiendo visualmente todos sus afijos.
- No hay migración de guardados ni wrappers de compatibilidad.
- El inventario de variables mantiene estados implementado/posterior/pendiente/fuera del sistema.

DECISIONES QUE SIGUEN ABIERTAS:
- Diseño amplio de pasivas, auras, maldiciones y progresión física de HP3.
- Semántica de categoría de armadura cuando el equipamiento sea mixto.
- Inclusión futura de atributos primarios y otros candidatos marcados como pendientes de decisión.
- Contrato final de atributos internos de habilidades en HP4.

SIGUIENTE ETAPA RECOMENDADA:
HP3 — Diseño de contenido pasivo y progresión física

OBJETIVO DE LA SIGUIENTE ETAPA:
Realizar un diseño fuerte del catálogo amplio de pasivas de armas/armaduras/básicas que correspondan, auras y maldiciones, y definir la progresión/XP de maestrías físicas reutilizando el motor canónico de HP2 sin lógica especial por contenido.

PRIMEROS ARCHIVOS A REVISAR:
- docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md
- src/config/habilidades/Maestrias.json
- src/config/habilidades/Habilidades.json
- src/juego/modificadores/ContratosModificadoresCombatiente.js
- src/juego/modificadores/SistemaModificadoresCombatiente.js

NO MODIFICAR SIN NUEVA APROBACIÓN:
- operaciones y orden matemático canónicos del centralizador;
- fórmulas base de combate/tiempo fuera de los puntos expresamente diseñados;
- variables marcadas como pendientes de decisión o fuera del sistema;
- contrato de atributos internos de habilidades reservado para HP4.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Catálogo y progresión física ampliamente diseñados y aprobados, fuentes pasivas/auras/maldiciones integradas sin excepciones por nombre, XP y puntos de maestrías definidos y validados, regresión funcional superada y documentación/entrega HP3 completa.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
refactor(habilidades): centralizar modificadores de combatientes

- crear el registro y resolutor canónico de modificadores para jugador y enemigos;
- conectar estadísticas, tiempo, percepción, equipo, efectos, terreno, zonas y variantes al centralizador común;
- distinguir afijos locales y del portador y reconstruir propiedades de objetos desde sus fuentes;
- versionar el guardado a v3 sin migraciones ni resultados derivados persistidos;
- eliminar mini-resolutores, wrappers y fallbacks históricos afectados por HP2;
- validar contratos, afijos, JSON, imports, fórmulas y recursos web y actualizar la documentación de diseño.

----------------- FIN DEL ENLACE -----------------
