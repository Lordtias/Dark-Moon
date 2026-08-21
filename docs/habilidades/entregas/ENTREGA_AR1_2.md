# Entrega AR1.2 — Alcance, grafo y cierre funcional de habilidades de Arco

## Estado

- **Etapa:** AR1.2.
- **Estado final:** **Cerrada**.
- **Fecha de cierre:** 21/08/2026.
- **Validación manual:** el usuario informó que las pruebas del incremental funcional fueron satisfactorias.
- **Siguiente etapa:** CD2 — Resistencias negativas.
- **CD2 no fue iniciado durante AR1.2.**

## Base de verdad del cierre

- ZIP de base: `Dark-Moon-AR1-2.zip`.
- Ruta de verificación final: `/mnt/data/ar1_2_close/Dark-Moon`.
- Rama: `main`.
- Commit base / HEAD confirmado: `6fd2536d63ac623dbc8f402d3da1fcaded4edffd`.
- Incremental funcional aplicado y probado por el usuario: `Dark-Moon-AR1-2-funcional-incremental.zip`.
- No se realizó commit ni push.
- No se utilizaron `git reset`, `git clean`, `git checkout` ni `git restore` masivo.
- No se instalaron dependencias.

### Estado Git y ruido CRLF

La extracción del ZIP base marca numerosos archivos como modificados por conversión de finales de línea. Ese ruido se separó del diff semántico antes de documentar el cierre.

En la copia final, `git status --short` muestra 247 archivos tracked modificados después de aplicar los dos incrementales. Al contrastar con `git diff -w --numstat`, el cierre posee **26 archivos con diferencias semánticas reales** respecto de `6fd2536d...`: **22 funcionales + 4 documentales**. No existen archivos semánticamente eliminados ni temporales de QA incorporados al cierre.

## Objetivo completado

Cerrar AR1.2 corrigiendo el alcance de las habilidades de Arco, haciendo legible y genérico su grafo, y completar los ajustes funcionales solicitados durante la validación sin crear lógica paralela:

- alcance de arma consumido desde `Combatiente.alcanceAtaque`;
- separación entre estadística general y atributo interno de habilidad;
- árbol genérico por nivel + conectividad, con 17 sinergias reales de Arcos;
- porcentaje final de impacto preservado hasta Phaser;
- Disparo múltiple con lectura visual de ráfaga;
- Disparo potente con estela reforzada;
- Disparo evasivo como herramienta de objetivo libre y movilidad;
- disparo y salto simultáneos únicamente en presentación;
- disponibilidad canónica para la barra de habilidades;
- feedback temporal de munición insuficiente en el mapa;
- desglose canónico de Alcance y fuentes de pasivas/modificadores expuesto a UI.

## Arquitectura final

### 1. Alcance general frente a atributo específico

Una habilidad con `ataqueArma.usaAlcanceArma=true` consume el alcance del ataque actual del combatiente:

```text
arma equipada
→ ConfiguracionAtaqueActual
→ Combatiente.resolverAlcanceAtaque()
→ OBJETIVOS_MODIFICADOR.ALCANCE_ATAQUE
→ resultado canónico + desglose
→ ConfiguracionHabilidadEfectiva
→ geometría / selector / ejecución
```

`ATRIBUTO_HABILIDAD.ALCANCE` queda reservado para habilidades cuyo alcance pertenece a la habilidad concreta. No se resuelve dos veces el mismo concepto.

`Combatiente.alcanceAtaque` continúa siendo el getter numérico de gameplay. `resolverAlcanceAtaque()` reutiliza la misma resolución y expone el desglose para presentación, evitando que el Panel Personaje reconstruya la fórmula.

### 2. Árbol de habilidades

- `requisitoNivelMaestria` determina exclusivamente el eje vertical;
- la conectividad real del grafo distribuye horizontalmente los nodos;
- `modificacion`/línea continua indica modificación específica de la habilidad destino;
- `sinergia`/línea punteada indica beneficio por estadística, estado o contexto compartido;
- no existen posiciones ni ramas especiales por `arcos`, magia, ID o nombre visible;
- Arcos conserva 17 sinergias con el contenido actual;
- el árbol usa scroll vertical cuando no cabe y redibuja conexiones al cambiar su geometría.

### 3. Probabilidad final de impacto

La probabilidad se calcula en dominio y llega a Phaser sin recalcularse:

```text
resolución canónica de impacto
→ SistemaHabilidadesJugador
→ probabilidadImpactoFinal
→ Renderizador / estado visual
→ AdaptadorEscenaJuego
→ CompositorSeleccionPhaser
```

El porcentaje ya contempla Precisión, Evasión y Dispersión dependiente de distancia cuando corresponda. Phaser solo lo representa.

### 4. Disparo múltiple

La cantidad de proyectiles, sus impactos, críticos y daño continúan siendo canónicos. Phaser únicamente:

- escalona la salida de las flechas como ráfaga;
- separa levemente origen y llegada visual para evitar superposición;
- no altera objetivos, casillas, Dispersión, daño ni cantidad de proyectiles.

### 5. Disparo potente

La flecha real de la munición conserva su función canónica. La presentación refuerza su impulso mediante una estela luminosa adherida al proyectil. La traza no modifica alcance, daño, colisión ni afinidad elemental.

### 6. Disparo evasivo

`Disparo evasivo` pasa a `tipoObjetivo="libre"`.

Puede seleccionar:

- un enemigo válido; o
- una casilla de suelo vacía, transitable, dentro de alcance y línea de visión.

Si se elige suelo vacío:

- se consume la munición declarada;
- se genera la representación del disparo;
- no se inventan impacto, daño, hostilidad ni experiencia;
- el desplazamiento se intenta hasta dos casillas en dirección opuesta al destino elegido;
- `paso_a_paso` sigue respetando bloqueos, límites y zonas.

El orden del dominio permanece:

```text
disparo
→ impacto/muerte cuando existe objetivo
→ desplazamiento táctico
→ cierre temporal
```

El plan visual puede absorber el evento de desplazamiento de la misma ejecución y reproducir proyectil + salto concurrentemente. La simultaneidad es visual y no cambia el orden canónico.

### 7. Disponibilidad de la barra

`SistemaHabilidadesJugador.obtenerEstadoBarra()` expone el estado de disponibilidad utilizando contratos existentes de:

- aprendizaje/configuración;
- Maná;
- requisitos de equipamiento;
- configuración de ataque;
- munición.

La UI consume `disponible`, motivo/mensaje y datos asociados. `BarraHabilidades` solo atenúa la ranura y muestra el motivo; no vuelve a leer arma, quiver ni inventario para decidir reglas de gameplay.

### 8. Munición insuficiente

Ataques básicos y habilidades de arma conservan el rechazo canónico por falta de munición. Cuando ese es el motivo, el resultado puede transportar `feedbackMapa` con el mismo mensaje. `ProcesadorResultadoAccion` lo entrega al renderizador y Phaser muestra un texto temporal cerca del jugador.

No existe un segundo cálculo de munición en Phaser.

### 9. Desgloses de pasivas

La auditoría confirmó que el proveedor `pasivas_aprendidas` sigue integrado al `SistemaModificadoresCombatiente`; el problema no era una exclusión general de pasivas.

Se corrigieron consumidores que obtenían un resultado numérico sin conservar la resolución necesaria para UI:

- `Alcance`: `resolverAlcanceAtaque()` expone el mismo desglose que produce el valor real;
- componentes de daño: conservan `resolucionMultiplicadorDanioFuente`, permitiendo atribuir pasivas contextuales como `Tensión controlada` sin recalcularlas en interfaz.

## Archivos funcionales modificados después del SHA base

1. `assets/estilos/paneles/habilidades-maestrias.css`
2. `src/aplicacion/ProcesadorResultadoAccion.js`
3. `src/config/habilidades/Habilidades.json`
4. `src/config/idiomas/en.json`
5. `src/config/idiomas/es.json`
6. `src/entidad/destructible/combatiente/Combatiente.js`
7. `src/entidad/destructible/combatiente/EstadisticasDerivadas.js`
8. `src/interfaz/PanelPersonaje.js`
9. `src/interfaz/Renderizador.js`
10. `src/interfaz/graficos/AdaptadorEscenaJuego.js`
11. `src/interfaz/graficos/PlanificadorEventosVisuales.js`
12. `src/interfaz/graficos/phaser/CreadorEfectosHabilidadesPhaser.js`
13. `src/interfaz/graficos/phaser/EscenaArranquePhaser.js`
14. `src/interfaz/graficos/phaser/RenderizadorPhaser.js`
15. `src/interfaz/graficos/phaser/reproductores/ReproductorHabilidadesArmaDistanciaPhaser.js`
16. `src/interfaz/habilidades/BarraHabilidades.js`
17. `src/interfaz/habilidades/IntegracionHabilidadesDom.js`
18. `src/juego/combate/SistemaCombateJugador.js`
19. `src/juego/habilidades/GeometriaHabilidades.js`
20. `src/juego/habilidades/MotorAtaqueArmaHabilidad.js`
21. `src/juego/habilidades/SistemaHabilidadesJugador.js`
22. `src/juego/habilidades/ValidadorConfiguracionEjecucionHabilidades.js`

## Documentos actualizados en el cierre

1. `docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md`
2. `docs/combate/PLAN_MAESTRO_COMBATE_A_DISTANCIA_Y_DEFENSAS_DARK_MOON.md`
3. `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
4. `docs/habilidades/entregas/ENTREGA_AR1_2.md`

## Archivos agregados/eliminados

- Agregados en este cierre documental: ninguno.
- Eliminados: ninguno.
- Dependencias agregadas: ninguna.

## Dependencias y versiones

AR1.2 no instala ni actualiza dependencias. Permanecen sin cambios las dependencias existentes del proyecto, incluyendo Phaser 4.2.1 y la configuración Electron ya presente.

No hay instrucciones de instalación adicionales.

## Persistencia

- No cambia el esquema de guardado.
- No se persiste disponibilidad de barra.
- No se persiste probabilidad final.
- No se persiste el desglose de Alcance.
- No se persiste el movimiento concurrente visual.
- Se siguen persistiendo únicamente las fuentes canónicas existentes.

## Compatibilidad web

Los cambios mantienen la carga web actual. No se modifican puntos de entrada ni se incorpora una dependencia de Node/Electron para gameplay.

## Compatibilidad Electron

No se modifican `electron/`, preload, aislamiento, empaquetado ni APIs de Node. La misma lógica HTML/JS/Phaser continúa siendo consumible por el empaquetado existente.

## Validaciones técnicas del incremental funcional

El incremental funcional entregado antes del cierre fue reconstruido y validado antes de ser entregado al usuario. Las comprobaciones registradas fueron:

- ZIP válido mediante `unzip -t`;
- 22/22 archivos del ZIP coincidentes por hash con la copia funcional validada;
- 295 archivos JavaScript comprobados, 0 errores de sintaxis;
- 42 JSON comprobados, 0 errores;
- 843 referencias relativas comprobadas, 0 imports faltantes;
- validadores canónicos de habilidades/progreso/perfiles correctos;
- `Habilidades.json` versión 13;
- Arcos conserva 9 habilidades y 17 relaciones;
- Disparo evasivo valida como `tipoObjetivo=libre`;
- geometría aislada: suelo vacío transitable correcto, enemigo correcto, pared rechazada;
- habilidades de Arco continúan obteniendo alcance del arma sin forzar `atributoHabilidad.alcance`;
- una habilidad de alcance propio continúa usando su atributo específico;
- disponibilidad distingue estado disponible, munición insuficiente y arma incompatible;
- ataque básico sin flechas produce rechazo canónico y feedback de mapa;
- un valor de probabilidad final de prueba se conservó a través del contrato visual hasta la representación Phaser;
- el plan visual de Disparo evasivo integra el movimiento táctico como movimiento concurrente;
- resoluciones de pasivas verificadas mediante SMC conservaron sus fuentes de desglose.

Una prueba aislada adicional del motor de Disparo evasivo no pudo completarse con un mock incompleto porque el combatiente real exige `SistemaEstadosTacticosCombatiente`. No se modificó producción para acomodar ese mock; las validaciones reales y las pruebas manuales posteriores cubrieron el comportamiento aprobado.

## Pruebas manuales finales

El usuario aplicó el incremental funcional y el 21/08/2026 informó: **“Las pruebas fueron correctas.”** Por lo tanto se registran como superados los casos manuales solicitados para cierre:

1. porcentaje final de acierto visible en habilidades y sensible a contexto/distancia;
2. Disparo múltiple con ráfaga y separación visual adecuada;
3. Disparo potente con traza/estela reforzada;
4. Disparo evasivo contra enemigo;
5. Disparo evasivo hacia casilla libre válida como herramienta de movilidad;
6. simultaneidad visual disparo/salto;
7. límites del salto frente a pared, borde y casillas bloqueadas;
8. barra apagada ante incompatibilidad de arma, falta de quiver/munición u otros requisitos;
9. feedback temporal de munición insuficiente;
10. desglose de Alcance/pasivas;
11. árbol de Arcos y sus relaciones sin regresión;
12. regresión básica de habilidades mágicas y ataque básico.

**Resultado obtenido:** Correcto según validación manual comunicada por el usuario.

## Casos fallidos o pendientes

No quedan fallos funcionales conocidos de AR1.2 después de la validación manual.

Pendientes fuera del alcance:

- los iconos definitivos de las habilidades activas de Arco son gestionados por el usuario como ajuste visual separado;
- CD2 — Resistencias negativas no fue iniciado.

## Validación del incremental documental de cierre

Después de actualizar los documentos, el ZIP documental se aplicó sobre otra extracción fresca del SHA base que ya tenía aplicado el incremental funcional. Resultado:

- `unzip -t`: sin errores;
- 4/4 documentos coinciden por SHA-256 con la copia usada para empaquetar;
- 295 JavaScript continúan pasando `node --check`;
- 42 JSON continúan parseando correctamente;
- 564 referencias relativas de módulos detectadas por la comprobación final, 0 destinos faltantes;
- `Habilidades.json` continúa en versión 13;
- `Disparo evasivo` continúa con `tipoObjetivo=libre`;
- Arcos continúa con 17 relaciones declaradas;
- diff semántico total contra HEAD: 26 archivos;
- diff semántico documental: exactamente 4 archivos;
- `git status --short`: 247 archivos tracked marcados después de aplicar ambos incrementales, con el resto atribuible al ruido de finales de línea del ZIP;
- no se detectaron archivos temporales, `.patch` ni `.mjs` incorporados al diff semántico.

## Comprobación de restricciones

- Una sola lógica canónica de combate: cumplido.
- Una sola resolución de modificadores: cumplido.
- Phaser representa resultados y no recalcula gameplay: cumplido.
- Sin condicionales productivos por nombre visible/maestría para el árbol: cumplido.
- Sin segunda lógica de disponibilidad en la barra: cumplido.
- Sin segunda lógica de munición en Phaser: cumplido.
- Sin persistir resultados derivados: cumplido.
- Sin dependencias nuevas: cumplido.
- Sin `.patch`/`.mjs`: cumplido.
- Sin commit ni push: cumplido.
- Sin avanzar a CD2: cumplido.

## Aplicación del incremental documental de cierre

Reemplazar:

```text
docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md
docs/combate/PLAN_MAESTRO_COMBATE_A_DISTANCIA_Y_DEFENSAS_DARK_MOON.md
docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md
docs/habilidades/entregas/ENTREGA_AR1_2.md
```

Agregar:

```text
Ningún archivo.
```

Eliminar:

```text
Ningún archivo.
```

Este ZIP documental debe aplicarse **después** del incremental funcional AR1.2 ya validado por el usuario.

## Conventional Commit propuesto

```text
fix(habilidades): cerrar ajustes funcionales de AR1.2

- preservar la probabilidad final de impacto hasta Phaser y reflejar disponibilidad canónica en la barra;
- reforzar la presentación de Disparo múltiple y Disparo potente sin alterar su resolución;
- convertir Disparo evasivo en objetivo libre y reproducir disparo y salto como una maniobra visual concurrente;
- mostrar feedback de munición insuficiente y exponer desgloses canónicos de Alcance/pasivas;
- registrar las pruebas manuales satisfactorias y actualizar la documentación de cierre.
```

No se realizó el commit.

## ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Sistema de habilidades/modificadores y combate a distancia de Dark Moon

ETAPA CERRADA:
AR1.2 — Alcance, grafo y cierre funcional de habilidades de Arco

ESTADO:
Cerrada

COMMIT BASE:
6fd2536d63ac623dbc8f402d3da1fcaded4edffd

HEAD FINAL VERIFICADO:
6fd2536d63ac623dbc8f402d3da1fcaded4edffd

GIT STATUS FINAL:
Después de aplicar el incremental funcional y el documental sobre una extracción fresca, `git status --short` muestra 247 archivos tracked modificados. Contrastando con `git diff -w --numstat`, el cierre contiene 26 archivos con diferencias semánticas reales respecto de HEAD: 22 funcionales del incremental ya validado por el usuario y 4 documentales de cierre. No hay eliminaciones ni temporales de QA incluidos.

DOCUMENTO DE ENTREGA:
docs/habilidades/entregas/ENTREGA_AR1_2.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md
- docs/combate/PLAN_MAESTRO_COMBATE_A_DISTANCIA_Y_DEFENSAS_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md

OBJETIVO QUE SE COMPLETÓ:
Cerrar las habilidades de Arco con alcance canónico correcto, árbol genérico legible, probabilidad final visible, disponibilidad canónica de barra, feedback de munición, desgloses de pasivas y una versión de Disparo evasivo que también funciona como herramienta de movilidad sobre casillas libres.

ARQUITECTURA HEREDADA:
Las habilidades con `usaAlcanceArma=true` consumen el alcance general ya resuelto; los atributos internos siguen usando `atributoHabilidad`. El SMC continúa siendo el único resolutor de modificadores. La barra consume disponibilidad calculada por `SistemaHabilidadesJugador` y no replica reglas. Phaser recibe probabilidad, proyectiles, impactos y desplazamientos ya decididos y solo los representa. `modificacion` es relación específica/continua y `sinergia` relación contextual/punteada. El árbol usa nivel para Y y conectividad para X sin excepciones por maestría.

ARCHIVOS CLAVE:
- src/juego/habilidades/SistemaHabilidadesJugador.js: disponibilidad canónica, selección, probabilidad y ejecución de habilidades.
- src/juego/habilidades/MotorAtaqueArmaHabilidad.js: ejecución de habilidad de arma con objetivo real o posición libre.
- src/entidad/destructible/combatiente/Combatiente.js: alcance canónico y desglose de su resolución.
- src/interfaz/graficos/PlanificadorEventosVisuales.js: integra desplazamiento táctico como movimiento concurrente de la habilidad.
- src/interfaz/graficos/phaser/reproductores/ReproductorHabilidadesArmaDistanciaPhaser.js: compone ráfaga, estela y simultaneidad visual sin recalcular gameplay.

DEPENDENCIAS Y VERSIONES:
Ninguna nueva. Phaser 4.2.1 y la configuración Electron existente permanecen sin cambios.

PRUEBAS CLAVE SUPERADAS:
- validación técnica del incremental: sintaxis JS, JSON, imports, contratos, hashes y ZIP correctos;
- Disparo evasivo acepta enemigo y suelo libre transitable, rechaza obstáculos y conserva munición/desplazamiento canónicos;
- probabilidad final llega a Phaser, la barra refleja disponibilidad canónica y la falta de munición produce feedback de mapa;
- pasivas/modificadores aparecen mediante los desgloses canónicos correspondientes;
- el usuario aplicó el incremental funcional y confirmó que las pruebas manuales fueron correctas.

PROBLEMAS O RIESGOS PENDIENTES:
- Los iconos definitivos de las habilidades activas de Arco quedan como ajuste visual separado a cargo del usuario.
- El ZIP de base conserva ruido CRLF; antes del commit debe revisarse el diff semántico para no incluir cambios de EOL ajenos.

DECISIONES APROBADAS:
- alcance general de arma y alcance interno de habilidad son conceptos distintos;
- Arcos conserva 17 sinergias y el árbol se organiza genéricamente por conectividad;
- Disparo múltiple usa una ráfaga visual más separada y Disparo potente una estela reforzada;
- Disparo evasivo es de objetivo libre y puede usarse para movilidad;
- disparo y salto son simultáneos en presentación sin alterar el orden canónico;
- disponibilidad de barra y munición se resuelven en sistemas canónicos, no en UI;
- la falta de munición puede mostrarse como feedback temporal en el mapa;
- las fuentes de pasivas deben aparecer en desgloses producidos por la misma resolución canónica.

DECISIONES QUE SIGUEN ABIERTAS:
Ninguna de AR1.2.

SIGUIENTE ETAPA RECOMENDADA:
CD2 — Resistencias negativas

OBJETIVO DE LA SIGUIENTE ETAPA:
Generalizar de forma controlada resistencias elementales y resistencias a efectos por debajo de cero, definiendo límites y vulnerabilidad y verificando la regresión de Maldiciones/estados sin crear fórmulas paralelas.

PRIMEROS ARCHIVOS A REVISAR:
- docs/combate/PLAN_MAESTRO_COMBATE_A_DISTANCIA_Y_DEFENSAS_DARK_MOON.md
- src/juego/modificadores/SistemaModificadoresCombatiente.js
- src/juego/combate/SistemaCombate.js

NO MODIFICAR SIN NUEVA APROBACIÓN:
- separación entre alcance general y atributo interno de habilidad;
- contrato canónico de disponibilidad/munición de la barra;
- semántica `modificacion` continua / `sinergia` punteada;
- organización genérica del árbol sin casos por maestría o ID;
- orden canónico disparo → impacto/muerte → desplazamiento de Disparo evasivo.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Las resistencias negativas deben quedar resueltas por contratos canónicos únicos, con límites explícitos, sin duplicación entre jugador/enemigos/UI, con regresión de daño, Maldiciones, estados, persistencia y presentación validada antes de avanzar.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
fix(habilidades): cerrar ajustes funcionales de AR1.2

- preservar la probabilidad final de impacto hasta Phaser y reflejar disponibilidad canónica en la barra;
- reforzar la presentación de Disparo múltiple y Disparo potente sin alterar su resolución;
- convertir Disparo evasivo en objetivo libre y reproducir disparo y salto como una maniobra visual concurrente;
- mostrar feedback de munición insuficiente y exponer desgloses canónicos de Alcance/pasivas;
- registrar las pruebas manuales satisfactorias y actualizar la documentación de cierre.

----------------- FIN DEL ENLACE -----------------
