# ENTREGA CD1 — Preparación, Dispersión y Penetración

## 1. Estado de la entrega

- Repositorio: `/mnt/data/dm_followup/Dark-Moon`
- Rama verificada: `main`
- Commit base y HEAD verificado: `3c9d46fcc1691550cf712802ced2af8e1c3323e7`
- Dependencias nuevas: ninguna
- Persistencia: sin cambio de versión
- Descanso: **no implementado**; fue únicamente un ejemplo de diseño durante el análisis.

El ZIP recibido presenta una cantidad anormal de archivos marcados por Git debido a finales de línea CRLF/LF. Se comprobó antes de implementar que esos cambios no representan diferencias funcionales. Los archivos de CD1 se contrastan contra `HEAD` normalizando finales de línea para distinguir el alcance real.

## 2. Alcance aprobado e implementado

### Estados tácticos y preparación

- se agrega `SistemaEstadosTacticosCombatiente` como contenedor canónico transitorio;
- la preparación de un ataque utiliza un estado táctico genérico y no una Aura falsa;
- el primer consumidor es `Flecha cargada`;
- mover, esperar o cancelar selector conserva la preparación;
- cambiar/desequipar arma o carcaj, o perder munición compatible, invalida la preparación;
- el estado no se persiste.

### Acción de ataque en fases

- el ataque preparado se divide en `preparacion` y `ejecucion`;
- arco usa 60% / 40% del coste de ataque original;
- cada fase puede modificarse por `SistemaModificadoresCombatiente` mediante `costoFaseAccion`;
- una fase puede quedar en coste cero sin modificar el contrato global de `SistemaTiempo`;
- el afijo `De carga rápida` modifica únicamente la preparación;
- referencias futuras 75/25 para ballesta y 90/10 para armas de fuego quedan documentadas, no agregadas a contenido productivo.

### Munición

- preparar exige munición compatible pero no la consume;
- confirmar el disparo exige una preparación válida;
- la flecha se consume al ejecutar el ataque independientemente de acierto/fallo;
- `consumirRecursosAtaque` permite separar la política de consumo de munición para que una futura habilidad pueda decidirla sin crear una regla exclusiva por familia.

### Dispersión

- nuevo objetivo canónico `dispersion`;
- se aplica después de la mitad del alcance efectivo y progresa linealmente hasta el máximo en alcance máximo;
- modifica la Precisión contextual del intento, no la Precisión permanente del personaje;
- el preview y el ataque real usan la misma consulta canónica;
- valores naturales iniciales: Arco corto -24%, Arco recurvo -20%, Arco compuesto -16%;
- nuevo sufijo `De estabilidad`: +3..5 / +5..7 / +7..10 según grado;
- se muestra en Panel Personaje y detalle/comparación de objetos.

### Probabilidad final de impacto

- combate básico consulta el desglose puro de `SistemaCombate`;
- habilidades hostiles reutilizan el mismo desglose que usa su resolución real;
- Phaser recibe el porcentaje final ya calculado;
- visual: entero con `%`, 11 px y color del selector;
- habilidades de área muestran porcentaje individual por enemigo afectado.

### Penetración de Armadura

- nuevo objetivo canónico `penetracionArmadura` por fuente;
- valores naturales iniciales: Arco corto 4%, Arco recurvo 7%, Arco compuesto 10%;
- primero se calcula la mitigación histórica de Armadura y luego se restan puntos porcentuales de Penetración;
- el exceso produce vulnerabilidad física;
- límite inferior aprobado: -50% de mitigación efectiva;
- nuevo sufijo `Perforante`: +2..3 / +4..5 / +6..8 según grado;
- el sufijo excluye `varita` y `baston` por filtros de familia;
- se muestra en Panel Personaje y detalle/comparación de objetos.

## 3. Decisión sobre daño base de arcos

Se analizó expresamente si la nueva complejidad del arco requiere aumentar su daño físico base.

Con los valores iniciales de Penetración elegidos y usando la fórmula canónica de Armadura, el aumento relativo de daño efectivo antes de considerar Dispersión es aproximadamente:

- Tier I / 4% Penetración: +4% a +5%;
- Tier II / 7% Penetración: +7% a +8%;
- Tier III / 10% Penetración: +10% a +11%.

Por esta razón **no se modifica el daño base de los arcos en CD1**. La Penetración ya agrega una mejora ofensiva medible y ajustar simultáneamente el daño impediría evaluar su efecto. El balance general queda para una etapa posterior, una vez probada la mecánica real.

## 4. Objetivos y contexto de modificadores nuevos

Objetivos:

- `costoFaseAccion`;
- `dispersion`;
- `penetracionArmadura`.

Contexto:

- `tipoAccion`;
- `faseAccion`.

Se reutilizan además `familiaArma`, `tipoAtaque`, `mano` y `esAtaqueDual` según corresponda.

## 5. Archivos agregados

- `src/juego/estado/SistemaEstadosTacticosCombatiente.js`
- `src/juego/acciones/CostosAccionCompuesta.js`
- `src/juego/acciones/PreparacionAccionesCombatiente.js`
- `docs/combate/PLAN_MAESTRO_COMBATE_A_DISTANCIA_Y_DEFENSAS_DARK_MOON.md`
- `docs/combate/entregas/ENTREGA_CD1.md`

## 6. Archivos modificados

- `docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
- `src/config/ConfiguracionCombate.js`
- `src/config/idiomas/en.json`
- `src/config/idiomas/es.json`
- `src/config/objetos/Armas.json`
- `src/config/objetos/afijos/Sufijos.json`
- `src/entidad/destructible/combatiente/Combatiente.js`
- `src/entidad/destructible/combatiente/ConfiguracionAtaque.js`
- `src/entidad/destructible/combatiente/EstadisticasDerivadas.js`
- `src/interfaz/PanelPersonaje.js`
- `src/interfaz/dom/HudPartidaDom.js`
- `src/interfaz/graficos/AdaptadorEscenaJuego.js`
- `src/interfaz/graficos/phaser/CompositorSeleccionPhaser.js`
- `src/interfaz/objetos/ComparadorObjetos.js`
- `src/interfaz/objetos/PresentadorObjeto.js`
- `src/juego/Juego.js`
- `src/juego/combate/CalculadorDPS.js`
- `src/juego/combate/ComponentesDanio.js`
- `src/juego/combate/SistemaCombate.js`
- `src/juego/combate/SistemaCombateJugador.js`
- `src/juego/habilidades/MotorDanioHabilidad.js`
- `src/juego/habilidades/SistemaHabilidadesJugador.js`
- `src/juego/modificadores/ContratosModificadoresCombatiente.js`
- `src/juego/objetos/ValidadorConfiguracionGeneracionObjetos.js`
- `src/objetos/Objeto.js`

Archivos eliminados: ninguno.

## 7. Dependencias e instalación

No se agregan ni actualizan dependencias.

No se modifica `package.json`, `package-lock.json`, Phaser, Electron ni Node.js.

No requiere instalación adicional.

## 8. Persistencia

`PersistenciaJugador` conserva su contrato anterior. `SistemaEstadosTacticosCombatiente` no forma parte del snapshot durable. Cerrar/cargar una partida elimina una preparación táctica pendiente y no requiere migración de guardado.

## 9. Validaciones ejecutadas

### 9.1 Sintaxis e imports

- 288 archivos JavaScript: `node --check` correcto;
- 40 JSON bajo `src/`: parseo correcto;
- imports relativos faltantes: 0.

Estado: **Correcto**.

### 9.2 Validador de generación de objetos

Preparación: cargar `GeneracionObjetos.json`, `Rarezas.json`, `Prefijos.json` y `Sufijos.json` y ejecutar `validarConfiguracionGeneracionObjetos`.

Resultado: `VALIDACION_AFIJOS_OK`.

Estado: **Correcto**.

### 9.3 Construcción de armas

Preparación: instanciar las 33 plantillas de `Armas.json` mediante `Objeto`.

Resultado: `ARMAS_OBJETO_OK 33`.

Estado: **Correcto**.

### 9.4 Estados tácticos, coste en fases, Dispersión y vulnerabilidad

Casos automatizados:

- activar/retirar estado táctico;
- 105 dividido en 63/42 para arco;
- modificador -25% aplicado solamente a preparación;
- Dispersión -24%: 0 en distancia 3, -8 en distancia 4 y -24 en distancia 6 para alcance 6;
- preview contextual con Dispersión;
- 10% Penetración contra Armadura 0 produce 110 de 100;
- Penetración extrema respeta el límite de vulnerabilidad -50% y produce como máximo 150 de 100.

Resultado: `PRUEBAS_CANONICAS_OK`.

Estado: **Correcto**.

### 9.5 Preparación y munición

Casos automatizados con arma/carcaj/munición controlados:

- preparar arco crea estado y cuesta 63;
- preparar no consume flecha;
- preparación es válida con mismo arco/carcaj/munición;
- ejecución consume exactamente una flecha;
- retirar carcaj invalida y retira la preparación.

Resultado: `PRUEBA_PREPARACION_MUNICION_OK`.

Estado: **Correcto**.

### 9.6 Afijo del portador

`De carga rápida` equipado en un arco:

- preparación 63 con -25% → 47,25 antes del redondeo de fase;
- ejecución permanece 42;
- el SMC registra `porcentajeTotal = -25`.

Resultado: `AFIJO_CARGA_RAPIDA_SMC_OK`.

Estado: **Correcto**.

### 9.7 Afijos locales

- Arco corto -24% + Estabilidad +5 → -19%;
- Penetración natural 4% + Perforante +3 → 7%.

Resultado: `AFIJOS_LOCALES_ARCO_OK`.

Estado: **Correcto**.

### 9.8 Filtros de familia

- Estabilidad: arco sí, espada no;
- Carga rápida: arco sí;
- Perforante: espada sí, bastón no.

Resultado: `FILTROS_AFIJOS_OK`.

Estado: **Correcto**.

Durante la preparación de esta prueba se utilizó inicialmente por error el ID inexistente `espada_corta`; se corrigió a la plantilla real `espada_larga`. Fue un error del script de prueba, no del producto.

### 9.9 Servido web

Servidor HTTP local; respuestas comprobadas:

- `index.html`: 200;
- `game.js`: 200;
- `SistemaCombate.js`: 200;
- `CostosAccionCompuesta.js`: 200;
- `SistemaEstadosTacticosCombatiente.js`: 200;
- `Armas.json`: 200;
- Phaser local 4.2.1: 200.

Estado: **Correcto**.

### 9.10 Chromium headless

Se intentó `chromium --headless --no-sandbox ... --dump-dom` contra el servidor local. El proceso quedó bloqueado por la ausencia de DBus del entorno y venció el timeout sin DOM utilizable.

Estado: **Pendiente por entorno**. No se considera prueba superada.

### 9.11 Electron

`node_modules` no está presente en la copia entregada y la política de la etapa prohíbe instalar dependencias. No se ejecutó Electron.

Estado: **Pendiente de prueba manual/local**.

## 10. Pruebas manuales solicitadas al usuario

1. Equipar arco + carcaj + flechas y pulsar Atacar una vez: debe cargar la flecha, mostrar icono y consumir solamente la fase de preparación.
2. Pulsar Atacar nuevamente: debe abrir el selector sin consumir otra preparación.
3. Confirmar contra enemigo: debe retirar icono, consumir una flecha y resolver impacto.
4. Repetir hasta obtener un fallo: la flecha también debe consumirse.
5. Cargar, abrir selector y cancelar: el icono debe permanecer.
6. Cargar y moverse/esperar: la preparación debe permanecer.
7. Cargar y desequipar arco o carcaj: la preparación debe desaparecer.
8. Cargar y retirar la última munición compatible: la preparación debe desaparecer.
9. Comprobar que la primera mitad del alcance no modifica probabilidad y que el porcentaje baja progresivamente en la segunda mitad.
10. Verificar que el porcentaje visible coincide con el valor final usado por el ataque, con entero, `%`, 11 px y color del selector.
11. Probar habilidad individual hostil y habilidad de área: porcentaje final por objetivo.
12. Revisar Panel Personaje con arco y sin arco: Dispersión y Penetración deben actualizarse.
13. Equipar objetos con Estabilidad, Perforante y Carga rápida y comprobar sus efectos/desgloses.
14. Probar ataque a enemigo sin Armadura, con Armadura baja y con Armadura alta; el log debe mostrar mitigación o vulnerabilidad sin doble signo.
15. Repetir controles anteriores en desktop y móvil para comprobar regresión de selección/táctil.
16. Ejecutar versión web normal y Electron local si el entorno dispone de dependencias.

## 11. Compatibilidad

### Web

No se agregan APIs externas ni dependencias. Los recursos críticos se sirven correctamente por HTTP.

### Electron

No se modifica Electron ni se añade acceso Node al juego. Arquitectónicamente conserva compatibilidad, pero la ejecución Electron queda pendiente de prueba local por ausencia de `node_modules` en el entorno de entrega.

## 12. Riesgos y pendientes

- falta prueba manual completa de gameplay y UI real;
- Chromium headless no pudo ejecutarse por DBus;
- Electron no se ejecutó en este entorno;
- la generalización de resistencias negativas queda para CD2;
- el daño base de arcos queda deliberadamente sin cambios hasta una etapa de balance con datos reales;
- futuras habilidades de arma deberán declarar explícitamente su política de preparación/munición cuando se incorporen, reutilizando el contrato ya separado.

## 13. Comprobación de restricciones

- sin commit;
- sin push;
- sin `git reset`, `git clean`, `git checkout` ni restauración masiva;
- sin dependencias nuevas;
- sin `.patch` ni `.mjs`;
- sin motor paralelo de combate;
- sin cálculo de probabilidad en Phaser;
- sin Aura falsa para la preparación;
- sin persistir resultados derivados;
- sin implementar Descanso;
- sin introducir ballesta/arma de fuego como contenido inexistente;
- sin cambios de daño base de arcos;
- sin implementar todavía resistencias negativas generales.

## 14. Conventional Commit propuesto

```text
feat(combate): incorporar preparación dispersión y penetración

- agrega estados tácticos y acciones de ataque divididas en preparación y ejecución;
- incorpora Dispersión, preview final de impacto y Penetración de Armadura canónicas;
- añade valores naturales de arco y afijos de estabilidad, perforación y carga rápida;
- mantiene el daño base de arcos y difiere resistencias negativas a una etapa separada;
- valida sintaxis, JSON, imports, objetos, afijos, fases, munición, dispersión y vulnerabilidad;
- actualiza documentación de combate, modificadores y diseño visual.
```

## 15. ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Plan Maestro de combate a distancia y defensas de Dark Moon

ETAPA CERRADA:
CD1 — Preparación, Dispersión y Penetración

ESTADO:
Cerrada con pendientes

COMMIT BASE:
3c9d46fcc1691550cf712802ced2af8e1c3323e7

HEAD FINAL VERIFICADO:
3c9d46fcc1691550cf712802ced2af8e1c3323e7

GIT STATUS FINAL:
`git status --porcelain` muestra 218 archivos trackeados como modificados y 4 entradas no trackeadas (una es el directorio `docs/combate/`, que contiene 2 archivos nuevos). La comparación byte a byte contra `HEAD`, normalizando CRLF/LF, identifica exactamente 26 archivos trackeados con cambios funcionales y 5 archivos nuevos de CD1; el resto son diferencias heredadas de finales de línea del ZIP.

DOCUMENTO DE ENTREGA:
docs/combate/entregas/ENTREGA_CD1.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/combate/PLAN_MAESTRO_COMBATE_A_DISTANCIA_Y_DEFENSAS_DARK_MOON.md
- docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md

OBJETIVO QUE SE COMPLETÓ:
Incorporar una preparación canónica y genérica para ataques en fases, aplicar esa mecánica al arco y sumar Dispersión, preview final de impacto y Penetración de Armadura sin duplicar combate ni presentación.

ARQUITECTURA HEREDADA:
Estados tácticos transitorios separados de Auras/Maldiciones; acciones compuestas resueltas por fases; SMC como único resolutor de Dispersión, Penetración y coste de fase; preview y resolución real comparten probabilidad canónica; Phaser/HTML solo representan resultados.

ARCHIVOS CLAVE:
- src/juego/estado/SistemaEstadosTacticosCombatiente.js: contrato general de estados tácticos transitorios.
- src/juego/acciones/CostosAccionCompuesta.js: división y modificación contextual de fases.
- src/entidad/destructible/combatiente/ConfiguracionAtaque.js: preparación y recursos del ataque.
- src/juego/combate/SistemaCombate.js: probabilidad contextual con Dispersión y resolución por fuente.
- src/juego/combate/ComponentesDanio.js: Penetración y vulnerabilidad física.

DEPENDENCIAS Y VERSIONES:
Ninguna dependencia nueva. Phaser 4.2.1 y Electron 43.3.0 permanecen sin cambios.

PRUEBAS CLAVE SUPERADAS:
- 288 JavaScript con sintaxis correcta, 40 JSON válidos y 0 imports relativos faltantes.
- preparación 60/40, consumo de munición, Dispersión contextual y vulnerabilidad -50% comprobadas por pruebas directas.
- afijos y filtros de familia validados mediante los contratos reales de generación/modificadores.

PROBLEMAS O RIESGOS PENDIENTES:
- pruebas manuales completas de gameplay/UI;
- Chromium headless bloqueado por DBus del entorno;
- Electron no ejecutado por ausencia de node_modules;
- balance final de daño de arcos pendiente de una etapa específica.

DECISIONES APROBADAS:
- estados tácticos y acciones preparables como contratos genéricos;
- arco 60/40 y fases modificables independientemente;
- Dispersión canónica y visible;
- preview final por objetivo;
- Penetración por fuente con vulnerabilidad hasta -50%;
- daño base de arcos sin cambios en CD1;
- resistencias negativas generales separadas.

DECISIONES QUE SIGUEN ABIERTAS:
- valores finales de balance tras pruebas reales; los valores de CD1 son iniciales y deliberadamente conservadores.

SIGUIENTE ETAPA RECOMENDADA:
CD2 — Resistencias negativas y vulnerabilidades

OBJETIVO DE LA SIGUIENTE ETAPA:
Permitir defensas elementales y resistencias a efectos efectivas por debajo de cero de forma canónica, con límites, desgloses, UI y pruebas de estados/Maldiciones, sin alterar las fuentes base salvo decisión explícita.

PRIMEROS ARCHIVOS A REVISAR:
- src/juego/combate/ComponentesDanio.js
- src/juego/efectos/ResistenciasEfectos.js
- src/juego/efectos/SistemaEfectosTemporales.js
- src/entidad/destructible/combatiente/EstadisticasDerivadas.js
- src/juego/modificadores/ContratosModificadoresCombatiente.js

NO MODIFICAR SIN NUEVA APROBACIÓN:
- fórmula base de Armadura;
- límite de vulnerabilidad física -50%;
- daño base de arcos;
- contrato 60/40 del arco y estados tácticos de CD1;
- persistencia durable.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Resistencias negativas resueltas por una única semántica canónica, daño/estados/Maldiciones y UI consumiendo el mismo resultado, límites comprobados y regresión de resistencias positivas superada.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
feat(combate): incorporar preparación dispersión y penetración

- agrega estados tácticos y acciones de ataque divididas en preparación y ejecución;
- incorpora Dispersión, preview final de impacto y Penetración de Armadura canónicas;
- añade valores naturales de arco y afijos de estabilidad, perforación y carga rápida;
- mantiene el daño base de arcos y difiere resistencias negativas a una etapa separada;
- valida sintaxis, JSON, imports, objetos, afijos, fases, munición, dispersión y vulnerabilidad;
- actualiza documentación de combate, modificadores y diseño visual.

----------------- FIN DEL ENLACE -----------------
