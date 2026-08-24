# ENTREGA — AUD2: presentación canónica de Personaje y Habilidades

## 1. Estado de cierre

- **Etapa:** AUD2 — presentación canónica de Personaje y Habilidades.
- **Estado:** cierre documental preparado tras la aprobación explícita del usuario de las pruebas funcionales.
- **Rama:** `main`.
- **Commit base y HEAD de la copia recibido:** `7221764d4126d25f3043e79ced6121b20a15bbd4`.
- **Incrementales funcionales aprobados:** `Dark-Moon-AUD1-consulta-presentacion-corregida-funcional.zip` y `Dark-Moon-AUD2-velocidades-critico-dual-funcional.zip`.
- **Dependencias nuevas:** ninguna.
- **Commit y push:** no realizados; este cierre entrega documentación y propone el commit que debe hacer el usuario.

La copia heredada contiene ruido amplio de CRLF/LF. Ignorando únicamente los finales de línea, la Fase A queda limitada a 14 archivos modificados y 2 agregados. Este incremental de Fase B no contiene código productivo.

## 2. Objetivo completado

Restituir una frontera clara entre las resoluciones canónicas y los paneles: la consulta de presentación conoce el valor, el desglose, el tipo de dato, la unidad y el orden; el panel solo muestra ese contrato.

El cierre cubre los valores y desgloses jugables del Panel Personaje, el detalle efectivo de Habilidades, la lectura de daño por mano, DPT, coste dual, porcentajes comerciales y Crítico dual. No cambia las ecuaciones de daño, tiempo, progreso, persistencia ni el resultado de combate.

## 3. Arquitectura cerrada

```text
Fuentes canónicas + SistemaModificadoresCombatiente
                ↓
EstadisticasDerivadas / ConfiguracionAtaque / ConfiguracionHabilidadEfectiva
                ↓
ConsultaPresentacionPersonaje / ConsultaPresentacionHabilidades
                ↓
PanelPersonaje / PanelHabilidadesMaestrias / ModalDetalleEstadistica
```

`ConsultaPresentacionPersonaje` es el contrato único de lectura para el Panel Personaje. Incluye identidad, progreso, recursos, atributos, valores visibles, pasivas, efectos y `detalles`.

Cada fila de `detalles` contiene:

- `tipo`: base, atributo, bonificación, penalización, multiplicador, límite o información;
- `operacion`: la operación que produjo la fila;
- `unidad`: puntos, porcentaje, rango de daño, DPT, velocidad con coste o texto;
- valor y, cuando aplica, valor antes y después;
- orden de presentación definitivo.

El modal siempre va de resultado a base: valor final arriba, modificaciones en orden inverso al de aplicación y base al final. La UI no ordena filas, no suma, no resta, no convierte multiplicadores decimales ni vuelve a resolver modificadores.

`ConsultaPresentacionHabilidades` entrega al detalle de Habilidades la `ConfiguracionHabilidadEfectiva` ya resuelta para el grado visible. El panel la describe, pero no aplica modificadores ni decide el orden de sus valores.

## 4. Alcance funcional aprobado

### Panel completo y formatos

Los valores y desgloses jugables mostrados por el Panel Personaje provienen de su consulta: atributos, combate, daño, afinidades, potencia de efectos, resistencias, suerte, pasivas y efectos. La unidad del contrato decide el formato de cada valor.

- Un multiplicador `×1,20` se presenta como `+20%`.
- `Ajuste comercial` se entrega al panel en puntos porcentuales, aunque comercio conserve internamente su variación decimal.
- El objetivo `ajusteComercial` y el nuevo `recargoTemporalDual` aceptan solamente `sumar`; por eso sus porcentajes se acumulan de forma directa.

### Daño y crítico

- `Arma` y `Secundaria` muestran el rango final mínimo–máximo, no una media.
- El modal `Daño medio` lista solo los rangos finales de las fuentes activas. Su construcción ya se explica en los modales individuales.
- El Crítico mostrado para duales es la suma directa de las probabilidades finales de Arma y Secundaria.
- El combate conserva tiradas y límites independientes por mano. El total es una lectura de panel, no una nueva tirada conjunta.
- El modal de Crítico separa Arma y Secundaria, con crítico final, modificadores del portador, aportes globales, ajuste local, afijos locales y base de cada fuente.

### DPT y velocidades

DPT significa **daño bruto medio por turno temporal**. No predice impacto, crítico, Armadura o Bloqueo del objetivo y no se expresa como segundos.

La ecuación mostrada por la consulta es:

```text
daño medio × tiempo de referencia ÷ coste temporal efectivo = DPT
```

Las velocidades individuales usan el mismo formato que el detalle del objeto y agregan la equivalencia de coste:

```text
Arma · Espada larga          1,11 ataques/s (90)
Secundaria · Daga de hierro  1,43 ataques/s (70)
```

Para dos armas, la fórmula canónica es:

```text
coste base dual = redondear(coste mayor + recargo temporal)
recargo temporal = coste menor × recargo dual final%
```

Con costes `90` y `70`, y recargo de `30%`, el resultado es `90 + (70 × 30%) = 111`. No se suman ambos costes completos: el diseño usa el arma más lenta como base y recarga solo una proporción de la más rápida. Una fuente `-15` sobre `recargoTemporalDual` convierte `30%` en `15%`, por lo que el coste pasa a `90 + (70 × 15%) = 101` tras redondeo. El recargo no puede bajar de `0%`.

## 5. Archivos funcionales aprobados

### Reemplazados

- `assets/estilos/paneles/panel-personaje.css`
- `src/config/idiomas/en.json`
- `src/config/idiomas/es.json`
- `src/entidad/destructible/combatiente/Combatiente.js`
- `src/entidad/destructible/combatiente/ConfiguracionAtaque.js`
- `src/entidad/destructible/combatiente/EstadisticasDerivadas.js`
- `src/interfaz/PanelPersonaje.js`
- `src/interfaz/Renderizador.js`
- `src/interfaz/dom/FabricaInterfazPartidaDom.js`
- `src/interfaz/habilidades/PanelHabilidadesMaestrias.js`
- `src/interfaz/personaje/ModalDetalleEstadistica.js`
- `src/juego/combate/CalculadorDPS.js`
- `src/juego/modificadores/ContratosModificadoresCombatiente.js`
- `src/juego/modificadores/SistemaModificadoresCombatiente.js`

### Agregados

- `src/interfaz/personaje/ConsultaPresentacionPersonaje.js`
- `src/interfaz/habilidades/ConsultaPresentacionHabilidades.js`

### Eliminados

Ninguno.

## 6. Incremental documental

Este ZIP contiene exclusivamente:

- reemplazar `docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md`;
- reemplazar `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`;
- agregar `docs/habilidades/entregas/ENTREGA_AUD2_PRESENTACION_CANONICA.md`.

No incluye los 16 archivos funcionales aprobados, dependencias, `.git`, archivos temporales ni cambios de finales de línea ajenos a los documentos incluidos.

## 7. Validaciones registradas

| Prueba | Resultado | Estado |
|---|---|---|
| Sintaxis de los JavaScript modificados de AUD2 | Correcta | Correcto |
| JSON de traducciones | Válido | Correcto |
| Archivo AUD2 | Listado, extraído y contrastado con los archivos fuente | Correcto |
| DPT dual 90/70 con recargo 30% | Coste 111 y velocidades/costes coherentes | Correcto |
| Recargo dual modificable | Solo acepta `sumar`; `-15` da 15% y coste 101 | Correcto |
| Crítico dual | 7% + 15% = 22%, con detalle separado por mano | Correcto |
| Crítico con fuentes locales | Arma 11% + Secundaria 17% = total 28% | Correcto |
| Pruebas manuales funcionales | Aprobadas explícitamente por el usuario | Correcto |

Las pruebas manuales se registran como validadas por el usuario. No se atribuyen al asistente pruebas visuales o de juego que no ejecutó.

## 8. Compatibilidad e impacto

- **Web:** compatible; no se agregan APIs ni dependencias.
- **Electron:** compatible; no se modifica su integración.
- **Persistencia:** sin cambios. Se siguen persistiendo fuentes canónicas, no resultados derivados, DPT ni desgloses.
- **Balance y combate:** sin cambio de fórmula existente; el recargo dual se expone como objetivo modificable explícito y solo se interpreta en `ConfiguracionAtaque`.

## 9. Riesgos y pendientes

- No hay riesgo funcional conocido dentro del alcance aprobado tras las pruebas manuales aprobadas.
- Futuros formatos de estadística deben ampliar la consulta con una unidad explícita; el panel no debe inferirla.
- No modificar sin nueva aprobación la fórmula dual, la regla de Crítico por fuente, el contrato de unidades/orden ni la responsabilidad de las consultas.

## 10. Comprobación de restricciones

- sin motor de cálculo paralelo en la interfaz;
- sin cambio de progresión, guardado, balance general ni dependencia;
- sin commit ni push durante el cierre documental;
- sin archivos funcionales dentro de este incremental documental;
- sin presentar validación manual del usuario como ejecución del asistente.

## 11. Conventional Commit propuesto

```text
feat(interfaz): centralizar presentación canónica del personaje

- incorpora consultas de presentación para Personaje y detalle efectivo de Habilidades;
- entrega al panel valores, unidades, operaciones y orden de desglose ya resueltos;
- expone DPT, coste dual, velocidades y Crítico dual sin cálculo en la interfaz;
- permite modificar el recargo temporal dual mediante puntos porcentuales sumables;
- documenta el contrato visual y las pruebas funcionales aprobadas.
```

## 12. ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Plan Maestro — Habilidades pasivas y modificadores canónicos.

ETAPA CERRADA:
AUD2 — presentación canónica de Personaje y Habilidades.

ESTADO:
Cerrada.

COMMIT BASE:
`7221764d4126d25f3043e79ced6121b20a15bbd4`

HEAD FINAL VERIFICADO:
`7221764d4126d25f3043e79ced6121b20a15bbd4` antes del commit final del usuario.

GIT STATUS FINAL:
En la copia auditada, `git status --short` informa 196 rutas: ruido heredado de CRLF/LF más el alcance de esta etapa. Ignorando finales de línea, la Fase A contiene 14 modificaciones funcionales y 2 archivos nuevos; la Fase B contiene 2 documentos modificados y este documento nuevo. No hay archivos en staging, ni commit ni push.

DOCUMENTO DE ENTREGA:
`docs/habilidades/entregas/ENTREGA_AUD2_PRESENTACION_CANONICA.md`

DOCUMENTOS MAESTROS ACTUALIZADOS:
- `docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`

OBJETIVO QUE SE COMPLETÓ:
Hacer que las consultas de presentación entreguen el valor, la unidad, la operación y el orden de todo desglose del personaje, incluidos daño, DPT, duales y Crítico por mano.

ARQUITECTURA HEREDADA:
Las ecuaciones y el `SistemaModificadoresCombatiente` resuelven valores; `ConsultaPresentacionPersonaje` y `ConsultaPresentacionHabilidades` los preparan para lectura; los paneles y el modal solo representan el contrato recibido.

ARCHIVOS CLAVE:
- `src/interfaz/personaje/ConsultaPresentacionPersonaje.js`: contrato tipado y ordenado de todo el Panel Personaje.
- `src/interfaz/habilidades/ConsultaPresentacionHabilidades.js`: frontera de detalle efectivo de Habilidades.
- `src/entidad/destructible/combatiente/ConfiguracionAtaque.js`: coste dual y resolución del recargo temporal.
- `src/juego/combate/CalculadorDPS.js`: cálculo canónico de DPT por turno temporal.
- `src/entidad/destructible/combatiente/EstadisticasDerivadas.js`: resumen de Crítico por fuente para presentación.

DEPENDENCIAS Y VERSIONES:
Ninguna dependencia nueva.

PRUEBAS CLAVE SUPERADAS:
- sintaxis, JSON y auditoría del incremental funcional;
- coste dual 90/70 con recargo 30% y con reducción del recargo;
- velocidades presentadas con su coste de referencia;
- Crítico dual total y detalle por mano;
- pruebas manuales aprobadas explícitamente por el usuario.

PROBLEMAS O RIESGOS PENDIENTES:
- Ninguno conocido dentro de este alcance.

DECISIONES APROBADAS:
- la consulta, no el panel, define orden, operación y formato semántico del desglose;
- los porcentajes se muestran como porcentajes, nunca como multiplicadores decimales;
- Arma y Secundaria muestran rango final; Daño medio solo lista esos rangos;
- DPT explica coste temporal y velocidades con coste; no usa segundos;
- el coste dual es coste mayor más recargo del menor;
- Crítico dual totaliza las manos y el modal conserva sus desgloses separados.

DECISIONES QUE SIGUEN ABIERTAS:
- La siguiente etapa funcional del proyecto debe definirse mediante una nueva propuesta aprobada.

SIGUIENTE ETAPA RECOMENDADA:
Por definir.

OBJETIVO DE LA SIGUIENTE ETAPA:
Definir un hito independiente a partir del commit que realice el usuario después de aplicar este incremental documental.

PRIMEROS ARCHIVOS A REVISAR:
- `docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
- `docs/habilidades/entregas/ENTREGA_AUD2_PRESENTACION_CANONICA.md`

NO MODIFICAR SIN NUEVA APROBACIÓN:
- `ConsultaPresentacionPersonaje` como dueño de orden, unidad y operación de los desgloses;
- fórmula de coste dual y el objetivo `recargoTemporalDual`;
- tiradas independientes de Crítico por mano;
- ecuaciones canónicas, modificadores, progreso y persistencia.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Debe definirse y aprobarse antes de implementar el próximo alcance.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
`feat(interfaz): centralizar presentación canónica del personaje`

- incorpora consultas de presentación para Personaje y detalle efectivo de Habilidades;
- entrega al panel valores, unidades, operaciones y orden de desglose ya resueltos;
- expone DPT, coste dual, velocidades y Crítico dual sin cálculo en la interfaz;
- permite modificar el recargo temporal dual mediante puntos porcentuales sumables;
- documenta el contrato visual y las pruebas funcionales aprobadas.

----------------- FIN DEL ENLACE -----------------
