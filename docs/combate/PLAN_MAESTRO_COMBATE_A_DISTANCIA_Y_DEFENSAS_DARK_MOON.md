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
- condiciones: `familiaArma=arco`, `tipoAccion=ataque`, `faseAccion=preparacion`.

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

Las habilidades actuales continúan usando su cálculo canónico de impacto. La previsualización consume ese mismo desglose para objetivos individuales o múltiples.

El contrato queda abierto a que una habilidad futura declare preparación y política de munición independientemente. No se agregan ahora habilidades de arco ni excepciones por ID de habilidad.

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

- **CD1 — Preparación, Dispersión y Penetración:** estados tácticos, ataque preparado en fases, arco 60/40, Dispersión, preview de impacto, Penetración y afijos asociados.
- **CD2 — Resistencias negativas:** generalización controlada de resistencias elementales y de efectos por debajo de cero, con límites, vulnerabilidad y regresión de Maldiciones/estados.
- **Balance posterior:** revisar daño esperado de arcos únicamente con evidencia del nuevo sistema ya estabilizado; CD1 conserva el daño base anterior.
