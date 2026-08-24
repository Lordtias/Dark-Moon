# ENTREGA — AUD2-COR1: corrección de trazas de Arma, Secundaria y DPT

## 1. Estado de cierre

- **Correctivo:** AUD2-COR1 — trazas canónicas de Arma, Secundaria y costes por fase.
- **Estado:** cerrado tras la validación manual explícita del usuario.
- **Rama:** `main`.
- **Commit base y HEAD verificado:** `85bcb679fdf2572699f59b5134fd5a0b44ecacf8`.
- **Incremental funcional aprobado:** `Dark-Moon-AUD2-correccion-modal-arma-incremental.zip`.
- **Dependencias nuevas:** ninguna.
- **Commit y push:** no realizados.

Este documento cierra únicamente el correctivo posterior a AUD2. No sustituye ni reescribe la entrega histórica `ENTREGA_AUD2_PRESENTACION_CANONICA.md`.

## 2. Problema corregido

La consulta ya recibía las resoluciones canónicas de Daño Físico, Daño Mágico y Afinidad dentro de los componentes de una fuente de arma. Sin embargo, el modal de Arma/Secundaria las reducía a una única referencia global y repetía el rango final dentro de un componente único.

Como consecuencia, una fuente global real podía perder su identidad en la presentación y el detalle mostraba información redundante.

## 3. Resultado funcional aprobado

`ConsultaPresentacionPersonaje` conserva las trazas entregadas por el cálculo y define el orden completo del modal. La interfaz continúa representando filas ya preparadas, sin recalcular daño ni decidir el orden.

Para una fuente con un único componente, el modal muestra:

```text
Valor final
→ capas globales de daño activas, si existen
→ multiplicador de golpe
→ escalado por atributo
→ rango base/local
```

No repite el mismo rango bajo una fila llamada `Resultado final`.

Cuando existen fuentes globales, se muestran por separado y con sus fuentes reales, siempre de resultado a base:

```text
Daño físico global final +25%
→ Afijo o pasiva +15%
→ Afijo o pasiva +10%
→ Daño físico global base 0%
```

En un componente elemental, Afinidad se presenta antes de Daño Mágico, porque son las capas externas de la construcción descendente. El multiplicador del golpe y el rango local continúan debajo de ellas.

El valor final no cambió de fórmula. Por ejemplo, la comprobación manual aprobada del arma física mostró:

```text
4–7 base → +10% Destreza → ×112% de Tensión controlada = 4,9–8,6
```

## 4. Coste por fase y DPT

El mismo incremental conserva la resolución completa de cada fase temporal. Un modificador declarativo sobre `costoFaseAccion` puede afectar preparación o ejecución sin depender de que el arma use dos fases visibles.

El sufijo configurado `De carga rápida` permanece genérico: se aplica por condiciones canónicas de familia, tipo de acción y fase, no por el nombre visible del arma. En un arco con preparación base `63` y reducción de `25%`, el detalle muestra:

```text
Costo de preparación 47
→ Redondeo canónico 47
→ De carga rápida -25%
→ Costo base de preparación 63
```

No se agregó una pasiva ficticia ni se cambió la ecuación de DPT.

## 5. Archivos funcionales aprobados

El incremental funcional fue acumulativo sobre el commit base y contiene cuatro archivos completos:

### Reemplazados

- `src/interfaz/personaje/ConsultaPresentacionPersonaje.js`
  - conserva y ordena trazas de daño global por componente;
  - elimina el rango final redundante de un único componente;
  - presenta las trazas de coste por fase de DPT.
- `src/juego/acciones/CostosAccionCompuesta.js`
  - expone la resolución canónica completa del coste de una fase.
- `src/juego/combate/CalculadorDPS.js`
  - conserva la resolución de fase dentro del resultado de DPT.
- `src/entidad/destructible/combatiente/ConfiguracionAtaque.js`
  - utiliza la misma resolución de fase para ataques simples y compuestos.

### Agregados y eliminados

Ninguno.

## 6. Validaciones registradas

| Prueba | Resultado | Estado |
|---|---|---|
| Sintaxis de `ConsultaPresentacionPersonaje.js` | Correcta | Correcto |
| Daño físico con dos fuentes globales | Resultado `+25%`, fuentes y base preservadas en orden descendente | Correcto |
| Daño mágico y afinidad elemental | Afinidad, Daño Mágico, golpe y base ordenados sin recalcular | Correcto |
| Arma física sin daño global | Sin sección global vacía ni fila de rango duplicada | Correcto |
| Crítico dual | Total y dos desgloses por mano conservados | Correcto |
| Nueve resistencias | Valores finales sin regresión | Correcto |
| Arco con `De carga rápida -25%` | Preparación `63 → 47`, con traza y base visibles | Correcto |
| Prueba manual del usuario | Modal de Arma validado explícitamente | Correcto |

Las pruebas visuales y de juego se registran como validadas por el usuario. Las demás son comprobaciones reproducibles ejecutadas sobre el incremental funcional.

## 7. Compatibilidad e impacto

- **Web:** compatible; no se agregaron dependencias ni APIs del navegador.
- **Electron:** compatible; no se modificó su integración.
- **Persistencia:** sin cambios; se siguen persistiendo fuentes canónicas, no resultados derivados ni trazas.
- **Combate y balance:** sin cambio en las fórmulas de daño, crítico, resistencias, velocidad o DPT.
- **Documentos maestros:** sin cambios; el correctivo materializa el contrato ya aprobado de presentación canónica.

## 8. Riesgos y restricciones confirmadas

- No existe un riesgo funcional conocido dentro de este correctivo tras la validación manual aprobada.
- No se agregaron casos especiales por ID o nombre visible.
- La interfaz sigue sin resolver modificadores ni reconstruir ecuaciones.
- No se modificaron resistencias, persistencia, contenido JSON, estilos ni dependencias.
- No se realizaron commit ni push.

## 9. Incremental documental

Este segundo incremental contiene exclusivamente:

- agregar `docs/habilidades/entregas/ENTREGA_AUD2_CORRECCION_MODAL_ARMA.md`.

No incluye código productivo, dependencias, `.git`, archivos temporales ni ruido de finales de línea.

## 10. Conventional Commit propuesto

```text
fix(interfaz): preservar trazas canónicas en el detalle de arma

- muestra fuentes de daño físico, mágico y afinidad en orden final a base;
- elimina el rango final redundante de componentes únicos;
- conserva la resolución de coste por fase para DPT y ataques simples;
- verifica crítico dual y resistencias sin regresiones;
- documenta el correctivo AUD2-COR1 validado manualmente.
```

## 11. ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Plan Maestro — Habilidades pasivas y modificadores canónicos.

ETAPA CERRADA:
AUD2-COR1 — corrección de trazas de Arma, Secundaria y DPT.

ESTADO:
Cerrada.

COMMIT BASE:
`85bcb679fdf2572699f59b5134fd5a0b44ecacf8`

HEAD FINAL VERIFICADO:
`85bcb679fdf2572699f59b5134fd5a0b44ecacf8` antes del commit que realizará el usuario.

GIT STATUS FINAL:
La copia de origen conserva ruido heredado amplio de CRLF/LF. Ignorando finales de línea, este cierre agrega únicamente `docs/habilidades/entregas/ENTREGA_AUD2_CORRECCION_MODAL_ARMA.md`. No hay cambios en staging, commit ni push realizados por el asistente.

DOCUMENTO DE ENTREGA:
`docs/habilidades/entregas/ENTREGA_AUD2_CORRECCION_MODAL_ARMA.md`

DOCUMENTOS MAESTROS ACTUALIZADOS:
- Sin cambios: el contrato de presentación ya estaba aprobado; se corrigió su aplicación.

OBJETIVO QUE SE COMPLETÓ:
Hacer que Arma y Secundaria presenten las trazas canónicas de daño sin perder sus fuentes ni repetir el rango final, y conservar el desglose de costes por fase para DPT.

ARQUITECTURA HEREDADA:
El cálculo canónico resuelve valores y trazas. `ConsultaPresentacionPersonaje` define valor, unidad, operación y orden. El panel y el modal solo representan el contrato recibido.

ARCHIVOS CLAVE:
- `src/interfaz/personaje/ConsultaPresentacionPersonaje.js`: detalle descendente de daño y DPT.
- `src/juego/acciones/CostosAccionCompuesta.js`: resolución canónica de coste por fase.
- `src/juego/combate/CalculadorDPS.js`: DPT con fases resueltas.
- `src/entidad/destructible/combatiente/ConfiguracionAtaque.js`: mismo contrato de fase para ataques simples y compuestos.

DEPENDENCIAS Y VERSIONES:
Ninguna dependencia nueva.

PRUEBAS CLAVE SUPERADAS:
- fuentes físicas, mágicas y elementales presentadas en orden;
- sin rango duplicado para componente único;
- crítico dual y nueve resistencias sin regresión;
- `De carga rápida` aplicado exclusivamente a preparación;
- pruebas manuales aprobadas por el usuario.

PROBLEMAS O RIESGOS PENDIENTES:
- Ninguno conocido dentro de este alcance.

DECISIONES APROBADAS:
- la consulta entrega orden, tipo de operación y formato; el panel no infiere ni recalcula;
- Arma y Secundaria muestran rango final, nunca media;
- DPT usa coste temporal y puede desglosar fases;
- los porcentajes se presentan siempre como porcentajes.

DECISIONES QUE SIGUEN ABIERTAS:
- Definir el siguiente hito funcional a partir del commit que realice el usuario.

SIGUIENTE ETAPA RECOMENDADA:
Por definir.

OBJETIVO DE LA SIGUIENTE ETAPA:
Definir un hito independiente con nueva propuesta aprobada.

PRIMEROS ARCHIVOS A REVISAR:
- `docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md`
- `docs/habilidades/entregas/ENTREGA_AUD2_PRESENTACION_CANONICA.md`
- `docs/habilidades/entregas/ENTREGA_AUD2_CORRECCION_MODAL_ARMA.md`

NO MODIFICAR SIN NUEVA APROBACIÓN:
- fórmula canónica de daño, DPT y costes duales;
- responsabilidad de `ConsultaPresentacionPersonaje` sobre orden, unidad y operación;
- resolución de modificadores, resistencias y persistencia.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Alcance aprobado, incremental funcional validado por el usuario, documentación de cierre e incremental documental aplicados, y SHA confirmado por el usuario.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
`fix(interfaz): preservar trazas canónicas en el detalle de arma`

----------------- FIN DEL ENLACE -----------------
