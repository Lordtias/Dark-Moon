# Plan Maestro — Combate a distancia y defensas de Dark Moon

## 1. Objetivo

Este documento define el contrato canónico para preparaciones tácticas de combate, acciones divididas en fases, Dispersión, previsualización de impacto y Penetración de Armadura.

No crea un motor paralelo de combate. La dirección obligatoria continúa siendo:

```text
Entrada
→ lógica canónica
→ resultado canónico
→ estado/evento visual
→ Phaser o HTML representa
```

`Descanso` fue utilizado durante el diseño únicamente como ejemplo de un posible consumidor futuro de estados tácticos. **No forma parte de esta implementación ni se incorpora como contenido jugable.**

## 2. Estados tácticos canónicos

`SistemaEstadosTacticosCombatiente` mantiene estados transitorios de combate que no son Auras, Maldiciones ni estados temporales por duración.

Un estado táctico:

- tiene ID canónico, nombre, descripción, icono, etiquetas y datos propios;
- puede permanecer activo hasta una condición explícita de retirada;
- no debe ser persistido como resultado derivado;
- puede ser mostrado por HUD sin convertirlo en Aura;
- no contiene fórmulas de combate ni lógica de presentación.

La primera utilización productiva es la preparación de un ataque con arco: `Flecha cargada`.

El contrato queda abierto a futuras armas preparables, canalizaciones u otros estados tácticos sin introducir condicionales por nombre visible.

## 3. Acciones compuestas en fases

Una acción puede declarar que su coste base se divide en fases. Para el ataque preparado actual se utilizan:

- `preparacion`;
- `ejecucion`.

El arma conserva un único `costoAtaque`. La familia define la proporción base y el resolutor fracciona ese coste conservando el total.

Configuración productiva actual:

| Familia | Preparación | Ejecución |
| --- | ---: | ---: |
| arco | 60% | 40% |

Referencias futuras de diseño, **no implementadas como familias productivas**:

- ballesta: 75% / 25%;
- arma de fuego: 90% / 10%.

Cada fase pasa por `SistemaModificadoresCombatiente` mediante el objetivo `costoFaseAccion` y el contexto `tipoAccion`, `faseAccion`, `familiaArma` y `tipoAtaque`.

Esto permite que una Pasiva, Aura, afijo u otra fuente canónica modifique solamente la preparación sin alterar la ejecución. Una fase puede resolverse a coste `0`; en ese caso no se registra avance temporal para esa fase y no se modifica el contrato global de `SistemaTiempo`.

## 4. Preparación del arco

Los arcos declaran `requierePreparacionAtaque: true`.

Flujo:

```text
Atacar sin preparación
→ validar arma + quiver + munición compatible
→ activar estado táctico "Flecha cargada"
→ resolver fase preparación
→ avanzar su coste temporal

Atacar con preparación válida
→ abrir selector
→ navegar/cancelar sin perder preparación

Confirmar
→ revalidar preparación y recursos
→ retirar preparación
→ consumir munición si la acción lo indica
→ resolver ataque canónico
→ resolver fase ejecución
```

La preparación se conserva al mover, esperar o cancelar el selector. Se invalida al cambiar/desequipar el arma o quiver que la originaron, o cuando deja de existir munición compatible.

La flecha se consume al confirmar el disparo y se pierde independientemente de acierto, fallo o crítico.

El contrato de recursos deja separadas las decisiones `requiere munición` y `consume munición`, para que futuras habilidades puedan decidir su política sin asumir que toda habilidad asociada a un arco consume una flecha.

## 5. Dispersión

### 5.1 Definición

`dispersion` es un objetivo modificable canónico de la fuente de ataque.

- `0%` = sin pérdida por distancia;
- valores negativos = pérdida máxima de Precisión al alcanzar el límite de alcance;
- cuanto más cerca de `0%`, mejor.

Rango técnico inicial permitido: `-50% ... 0%`. Los arcos actuales utilizan valores más conservadores.

### 5.2 Valores naturales iniciales

No constituyen un rebalanceo completo; son valores iniciales coherentes para introducir la mecánica:

| Arco | Tier | Dispersión | Penetración de Armadura |
| --- | ---: | ---: | ---: |
| Arco corto | I | -24% | 4% |
| Arco recurvo | II | -20% | 7% |
| Arco compuesto | III | -16% | 10% |

La mejora por Tier representa mayor estabilidad y capacidad de perforación sin modificar todavía el daño físico base.

### 5.3 Aplicación por distancia

La distancia usa la geometría canónica de cuadrícula (Chebyshev).

La Dispersión no altera la Precisión permanente del personaje. Se aplica a la Precisión contextual del intento:

```text
inicio = alcanceEfectivo × 0,5

si distancia <= inicio:
  dispersionAplicada = 0

si distancia > inicio:
  progreso = limitar((distancia - inicio) / (alcanceEfectivo - inicio), 0, 1)
  dispersionAplicada = dispersionFinal × progreso

precisionContextual = precisionFuente × (1 + dispersionAplicada / 100)
```

La `precisionContextual` alimenta la misma ecuación canónica de impacto que utilizará la resolución real.

## 6. Previsualización canónica de impacto

La interfaz no simula combate ni tira RNG para mostrar el porcentaje.

`SistemaCombate` expone una consulta pura de desglose de probabilidad. Para una fuente con Dispersión, esa consulta incorpora:

- Precisión de la fuente ya resuelta;
- Dispersión final;
- distancia;
- alcance efectivo;
- Evasión;
- niveles;
- límites canónicos de probabilidad.

El número mostrado es la **probabilidad final exacta** que utilizaría el siguiente intento en ese contexto.

Reglas visuales:

- entero sin decimales;
- formato `68%`;
- tamaño 11 px, equivalente al feedback actual de daño;
- mismo color del selector que representa la acción;
- se muestra sobre un objetivo válido que realmente requiera tirada de impacto;
- habilidades de área muestran el porcentaje individual de cada enemigo afectado.

Phaser recibe el valor resuelto y solamente lo representa.

## 7. Penetración de Armadura

`penetracionArmadura` es un objetivo modificable canónico y pertenece a cada fuente de ataque.

La Armadura continúa siendo un rating y conserva su fórmula actual. Primero se calcula la mitigación normal que produce contra el daño físico entrante. Luego la Penetración resta **puntos porcentuales** a esa mitigación:

```text
mitigacionBase = formulaActualArmadura(armadura, danioFisicoEntrante)
mitigacionEfectiva = mitigacionBase - penetracionArmadura / 100
```

La mitigación efectiva puede ser negativa. En ese caso existe vulnerabilidad física y el daño aumenta.

Límite aprobado:

```text
mitigacionEfectiva >= -50%
```

Por lo tanto la vulnerabilidad física aportada por este mecanismo no puede aumentar un componente por encima de 150% del daño posterior al bloqueo.

La Penetración se resuelve por fuente, por lo que dos armas pueden conservar valores distintos.

## 8. Afijos iniciales

### De estabilidad

- ámbito: local del objeto;
- familia: arco;
- objetivo práctico: mejorar `dispersion` hacia 0.

Rangos iniciales:

- grado I: +3 a +5;
- grado II: +5 a +7;
- grado III: +7 a +10.

### Perforante

- ámbito: local del objeto;
- armas físicas;
- excluye `varita` y `baston` mediante filtros de familia;
- aumenta `penetracionArmadura`.

Rangos iniciales:

- grado I: +2 a +3;
- grado II: +4 a +5;
- grado III: +6 a +8.

### De carga rápida

- el afijo pertenece al arco pero su efecto es del `portador`;
- objetivo: `costoFaseAccion`;
- operación: porcentaje sobre total;
- condiciones: `familiaArma=arco`, `tipoAccion=ataque|habilidad`, `faseAccion=preparacion`;
- por lo tanto afecta tanto la carga del ataque básico como la preparación de habilidades de arma sin modificar su fase de ejecución.

Rangos iniciales:

- grado I: -12% a -8%;
- grado II: -18% a -13%;
- grado III: -25% a -19%.

Estos números son valores iniciales de contenido, no una pasada general de balance.

## 9. Presentación en Personaje y Objetos

El Panel Personaje incorpora:

- `Dispersión`;
- `Penetración de Armadura`.

Los detalles de objetos y comparación exponen las mismas propiedades sin recalcularlas en interfaz.

`Flecha cargada` aparece en el área favorable del HUD junto a Auras, pero conserva su clase semántica de estado táctico. No es registrada en `SistemaEfectosTemporales`.

## 10. Persistencia

Los estados tácticos de preparación son transitorios y no se persisten.

No se cambia la versión de guardado. Se persisten solamente las fuentes canónicas ya previstas por el proyecto; al cargar una partida no se reconstruye una flecha previamente preparada.

## 11. Compatibilidad con habilidades

Las habilidades que no dependen de un arma continúan usando su cálculo canónico de impacto y daño. La previsualización consume ese mismo desglose para objetivos individuales o múltiples.

AR1 activa el contrato de **habilidad basada en arma**. Una habilidad puede declarar preparación, política de munición, cantidad de proyectiles, factor de daño del arma, contexto semántico y desplazamiento posterior. La resolución física no se duplica: obtiene la fuente real del arma equipada y delega impacto, crítico, bloqueo, Armadura, Penetración y daño al mismo `SistemaCombate`.

AR1.1 separa explícitamente tres conceptos que no deben deducirse entre sí: `requiereMunicion`, `consumeMunicion` y `cantidadMunicion` describen inventario/requisitos, mientras `cantidadProyectiles` describe cuántas resoluciones visuales/físicas produce la ejecución. Una habilidad puede por contrato no requerir munición; en ese caso la validación de su preparación no vuelve a imponer el quiver/requisito del ataque básico. Si requiere munición, la cantidad se valida al preparar y nuevamente al ejecutar, y solo se descuenta si `consumeMunicion=true`.

AR1.2 fija además el origen del alcance para ataques de arma por habilidad. Si `ataqueArma.usaAlcanceArma=true`, la configuración efectiva consume `Combatiente.alcanceAtaque`, que ya resuelve el alcance del arma equipada y `OBJETIVOS_MODIFICADOR.ALCANCE_ATAQUE`. No se vuelve a interpretar ese mismo valor como `atributoHabilidad.alcance`. Las habilidades con alcance propio mantienen el atributo específico de habilidad.

La preparación comparte un único estado `preparacion_accion` entre ataque básico y habilidades de arma. Preparar otra acción reemplaza la anterior y vuelve a pagar el tiempo de preparación, pero no consume munición porque las flechas se descuentan únicamente cuando se ejecuta el disparo. Estados tácticos de otra clase, como concentración, pueden coexistir con esa preparación.

Las habilidades productivas iniciales de Arco son:

| Habilidad | Nivel de maestría | Contrato principal |
| --- | ---: | --- |
| Disparo múltiple | 2 | 2/3/4 proyectiles; 60/50/45% del daño de arma por proyectil; preparación ×1,15/1,30/1,45 |
| Disparo potente | 5 | 1 proyectil; 160/185/210% del daño de arma; preparación ×1,80/1,70/1,60 |
| Francotirador | 7 | activa el estado táctico `Apuntando` |
| Disparo evasivo | 10 | 1 proyectil al 65/75/85%; objetivo enemigo o casilla libre válida; desplazamiento de hasta 2 casillas en dirección opuesta |

`cantidadProyectiles`, `factorDanioArma` y `distanciaDesplazamiento` pasan a ser atributos productivos de habilidad porque ya poseen consumidores reales. `maximoProyectilesSimultaneos` permanece reservado.

### 11.1 Estados tácticos como fuente de modificadores

`SistemaEstadosTacticosCombatiente` puede almacenar modificadores declarativos. `ProveedorModificadoresEstadosTacticos` los entrega al `SistemaModificadoresCombatiente`, que continúa siendo el único resolutor. El SMC no reconoce nombres de estados.

Las políticas usan `TIPOS_EVENTO_ESTADO_TACTICO` como registro canónico (`movimiento`, `espera`, `accion`, `consumo`, `danio_recibido`, `habilidad_ejecutada`, `accion_ejecutada`). Un valor desconocido falla al validar/activar el estado. Las interrupciones por acción se procesan solo después de un resultado realmente exitoso; intentar una acción inválida no elimina una concentración que nunca llegó a ser interrumpida por un hecho jugable.

`Apuntando` aporta Precisión, probabilidad de crítico y Dispersión únicamente cuando el contexto de la acción declara la etiqueta semántica `disparo_concentrado`. Se conserva al reemplazar preparaciones, se consume al ejecutar un disparo compatible y se interrumpe por movimiento, espera, interacción/consumo, otra habilidad incompatible o daño hostil. Disparo múltiple declara un contexto diferente y por ello no recibe sus bonificaciones.

### 11.2 Alcance de habilidades basadas en arma

El alcance de `Disparo múltiple`, `Disparo potente` y `Disparo evasivo` no es un atributo interno independiente: deriva del ataque actual del combatiente. La cadena canónica es arma equipada → configuración de ataque → `Combatiente.alcanceAtaque` → modificadores generales de alcance → `ConfiguracionHabilidadEfectiva` → geometría/selector. Así `Ojo de halcón` o cualquier futuro modificador general de `alcanceAtaque` afecta tanto al ataque básico como a las habilidades de Arco sin duplicar reglas.

Una propiedad futura que exista únicamente dentro de una habilidad —por ejemplo una cantidad de objetivos atravesados si se aprobara ese contenido— deberá registrarse como atributo específico de habilidad en vez de reutilizar `penetracionArmadura`, que continúa siendo una estadística general del ataque.

### 11.3 Desplazamiento táctico

El desplazamiento causado por habilidades se resuelve mediante un contrato independiente de la representación. Declara:

- regla espacial: `paso_a_paso`, `trayectoria_libre` o `destino_unicamente`;
- forma visual: `movimiento`, `dash`, `salto` o `teletransporte`.

La forma visual no concede permisos espaciales. Phaser dispone de representación explícita para las cuatro formas: movimiento normal, `dash` continuo y rápido, `salto` con arco corto y `teletransporte` con desaparición/reposicionamiento/aparición. Tener una representación no habilita por sí solo una regla espacial. Disparo evasivo utiliza `paso_a_paso + salto`: intenta dos casillas en dirección opuesta a la casilla elegida, puede recorrer 2/1/0 según bloqueo y notifica cada paso real a las zonas. Su selección es `libre`: admite enemigo o suelo vacío transitable dentro de alcance y línea de visión. Una ejecución sobre suelo vacío consume la munición declarada y genera proyectil/maniobra, pero no inventa tirada de impacto, daño, hostilidad ni experiencia. El orden canónico continúa siendo disparo → impacto/muerte cuando existe objetivo → desplazamiento → cierre temporal; la presentación puede reproducir proyectil y salto de forma concurrente porque ambos resultados ya fueron decididos por dominio.

### 11.4 Disponibilidad y feedback de recursos

La barra de habilidades no decide si una acción es utilizable. `SistemaHabilidadesJugador` expone una consulta de disponibilidad que reutiliza contratos canónicos de requisitos de lanzador, Maná, configuración de ataque y munición. La UI recibe el resultado y únicamente atenúa la ranura o muestra el motivo; no inspecciona directamente el arma, quiver ni inventario para replicar reglas.

La falta de munición sigue siendo un rechazo del gameplay. Cuando el rechazo corresponde específicamente a munición insuficiente, el resultado puede transportar `feedbackMapa` con el mismo mensaje canónico. `ProcesadorResultadoAccion` entrega ese texto al renderizador y Phaser lo presenta temporalmente cerca del jugador. El feedback no consume turno, no cambia la disponibilidad y no constituye una segunda validación. El ataque básico y las habilidades de arma comparten este principio.

### 11.5 Probabilidad final de habilidades

La previsualización de una habilidad hostil conserva la misma `probabilidadImpactoFinal` calculada por el motor que resolvería el disparo. En habilidades de arma, el desglose incluye la Dispersión dependiente de distancia cuando corresponda. El valor viaja por `SistemaHabilidadesJugador` → estado visual → adaptador de escena → Phaser; ninguna capa de presentación recalcula Precisión, Evasión o Dispersión. Una casilla libre usada por Disparo evasivo no muestra porcentaje porque no existe una tirada contra objetivo.

## 12. Resistencias negativas

La generalización de resistencias elementales y resistencias a efectos por debajo de cero queda **fuera de esta implementación** y será un bloque posterior.

La única defensa negativa incorporada aquí es la mitigación física efectiva derivada de Penetración de Armadura, limitada a -50%.

## 13. Decisión de daño base de arcos

La incorporación de Penetración agrega una nueva fuente de daño efectivo, especialmente contra objetivos con Armadura baja o media, además de neutralizar parte de la mitigación contra Armadura alta.

Por lo tanto el daño físico base de `arco_corto`, `arco_recurvo` y `arco_compuesto` **no se modifica en esta implementación**. Ajustarlo simultáneamente impediría distinguir el efecto real de la nueva Penetración.

La decisión debe revisarse durante una etapa explícita de balance, comparando daño esperado, distancia, coste temporal completo, preparación y defensa objetivo.

## 14. Contratos que deben conservarse

- una sola fórmula de impacto;
- una sola fórmula de Armadura;
- `SistemaModificadoresCombatiente` como resolutor común;
- no calcular Dispersión, Penetración o probabilidad en Phaser/HTML;
- no convertir estados tácticos en Auras falsas;
- no introducir familias futuras inexistentes en configuración productiva;
- no persistir resultados derivados;
- no identificar armas o habilidades por nombre visible.

## 15. Roadmap inmediato

- **CD1 — Preparación, Dispersión y Penetración:** cerrada; estados tácticos, ataque preparado en fases, arco 60/40, Dispersión, preview de impacto, Penetración y afijos asociados.
- **UI-I1 — Normalización visual:** cerrada; iconografía ilustrada sin pixelado ni halos artificiales.
- **AR1 — Habilidades activas de Arco:** incorpora ataques de arma mediante habilidad, estados tácticos como fuente SMC, preparación compartida y desplazamiento táctico.
- **AR1.1 — Cierre técnico de Arco:** completa la independencia de munición, valida eventos tácticos, evita interrupciones por acciones fallidas, completa las formas visuales de desplazamiento y generaliza relaciones de árbol para cualquier maestría.
- **AR1.2 — Corrección de alcance y grafo:** consume `Combatiente.alcanceAtaque` en habilidades de arma, distingue modificación específica de sinergia general y distribuye el árbol horizontalmente desde la conectividad real; su ajuste final preserva probabilidad final hasta Phaser, centraliza disponibilidad de barra/munición, expone desgloses de Alcance y convierte Disparo evasivo en herramienta de objetivo libre con simultaneidad visual de disparo y salto.
- **CD2 — Resistencias negativas:** permanece como siguiente bloque de combate; generalización controlada de resistencias elementales y de efectos por debajo de cero, con límites, vulnerabilidad y regresión de Maldiciones/estados.
- **Balance posterior:** revisar daño esperado de arcos únicamente con evidencia del nuevo sistema ya estabilizado; CD1 y AR1 conservan el daño base anterior.
