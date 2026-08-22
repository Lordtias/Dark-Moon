# ENTREGA — Balance de escalados globales de daño y efectos

## 1. Estado de cierre

- Repositorio recibido: `Dark-Moon(3).zip`.
- Rama verificada: `main`.
- Commit base y HEAD verificado: `8d3a2b3b4f4565fb37cd978607d34f31e0d23ecd`.
- Dependencias nuevas: ninguna.
- Persistencia: sin migraciones ni cambios de contrato.
- Estrategia aplicada: Fase A funcional aprobada por el usuario y Fase B exclusivamente documental.

El ZIP de base conserva diferencias heredadas de CRLF/LF. La comparación semántica contra `HEAD`, ignorando finales de línea, identifica siete archivos funcionales de la Fase A. Esta entrega no modifica ninguno de ellos: documenta el estado aprobado y el ajuste de compatibilidad de `Brutal` incorporado por el usuario.

## 2. Objetivo completado

Medir en combate real el impacto de Daño Físico, Daño Mágico, Daño de Habilidad, afinidades y potencias de efecto para calibrar porcentajes, pesos y rarezas sin alterar los contratos canónicos cerrados.

La conclusión es que la arquitectura ya separaba correctamente los ejes. El ajuste necesario fue reducir los techos activos de afinidad y potencia específica; no se activaron rarezas ni se cambiaron pesos.

## 3. Decisiones aprobadas y calibración final

| Grupo | G1 | G2 | G3 | Peso | Rarezas | Resultado real |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Ígneo, Gélido, Fulgurante, Tóxico | +4–6% | +7–9% | +10–12% | 550 | Mágico / Raro | +50% directo con cuatro fuentes |
| Incandescente, Virulento, Entorpecedor, Sobrecargado | +4–6% | +7–9% | +10–13% | 450 | Mágico / Raro | +50% a +52,63% de potencia específica efectiva |

Se mantuvieron sin cambio los pesos, las rarezas permitidas y los valores de `Marcial`, `Místico`, `Enfocado` y `Catalítico`.

`raro` y `unico` siguen deshabilitados. En 2.000 objetos deterministas por perfil se midió:

| Perfil | Común | Mágico | Raro | Único |
| --- | ---: | ---: | ---: | ---: |
| Bastón maestro | 72,45% | 27,55% | 0% | 0% |
| Collar magistral | 71,50% | 28,50% | 0% | 0% |

Durante la validación el usuario agregó `varita` a `familiasExcluidas` de `Brutal`. El ajuste es correcto y queda incluido como corrección de compatibilidad del generador: Varita no posee componente físico que pueda aprovechar daño físico local porcentual.

## 4. Medición canónica realizada

El informe agregado a `balance.html` crea combatientes, equipa objetos reales y usa los motores canónicos; no calcula una fórmula paralela. La disponibilidad usa el generador de objetos real con semilla fija.

| Recorrido | Resultado | Estado |
| --- | --- | --- |
| Marcial G3 en Espada de acero templado | 13 → 14,8; +13,85% esperado | Correcto, techo Raro controlado |
| Místico G3 en Incinerar G3 | 44 → 48; +9,09% directo; Quemadura intacta | Correcto |
| Enfocado G3 en Incinerar G3 | 44 → 49; +11,36% directo; Quemadura intacta | Correcto |
| Afinidad Ígnea pasiva | 44 → 49; +11,36% directo; Quemadura intacta | Correcto |
| Afinidad Ígnea máxima activa | 44 → 66; +50% directo; Quemadura intacta | Correcto |
| Catalítico G3 | Quemadura 5,54 → 6,02; +8,66%; directo intacto | Correcto, techo Raro controlado |
| Potencia específica de Quemadura / Envenenamiento | 5,54 → 8,42; +51,99% | Correcto |
| Potencia de Ralentización | factor 1,76 → 2,16; +52,63% de intensidad efectiva | Correcto |
| Potencia de Electrización | factor 1,28 → 1,42; +50% de intensidad efectiva | Correcto |
| Congelamiento / Aturdimiento con Catalítico | 300 → 300 / 90 → 90 de duración | Correcto: no escalan |
| Supresión temporal | 44 → 39; -11,36% de daño directo | Correcto |
| Techo combinado Raro | 44 → 79; +79,55% | Informativo: no entra al botín activo |

Ralentización y Electrización se miden respecto de la distancia desde `×1`: el contrato multiplicativo amplifica la intensidad añadida, no el factor neutro completo.

## 5. Archivos funcionales aprobados

Estos archivos pertenecen al incremental funcional ya aplicado y validado. No se incluyen en el ZIP documental:

- `balance.html`
- `src/config/objetos/afijos/Prefijos.json`
- `src/herramientas/balance/AnalizadorBalanceCombate.js`
- `src/herramientas/balance/AnalizadorBalanceJuego.js`
- `src/herramientas/balance/AnalizadorBalanceRegresion.js`
- `src/herramientas/balance/BalanceAplicacion.js`
- `src/herramientas/balance/ObjetivosBalance.json`

## 6. Documentación de este incremental

Archivos modificados o agregados por el cierre:

- `docs/combate/PLAN_MAESTRO_COMBATE_A_DISTANCIA_Y_DEFENSAS_DARK_MOON.md`
- `docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md`
- `docs/combate/entregas/ENTREGA_BALANCE_ESCALADOS_GLOBALES.md`

No se modifica el documento visual porque no hubo cambio de interfaz, representación ni recurso gráfico. No se elimina ningún archivo.

## 7. Validaciones registradas

### Ejecutadas por el asistente en Fase A

- `node --check` correcto para los analizadores y la aplicación de balance modificados.
- JSON válido para `Prefijos.json` y `ObjetivosBalance.json`.
- Ejecución reproducible de `lineaBase()` correcta: 14 recorridos de ejes, 13 Correctos, 1 Informativo, 0 Incorrectos; disponibilidad global: 34 comprobaciones, 0 Incorrectos.
- El informe de efectos existente conserva 0 Incorrectos.
- El ZIP funcional fue listado y contrastado byte a byte contra sus siete archivos fuente.

La regresión integral continúa informando 10 resultados Incorrectos heredados, fuera del alcance de esta etapa. No se ocultaron ni se cambiaron durante el balance de escalados.

### Validadas por el usuario

El usuario confirmó explícitamente que las pruebas manuales de la Fase A fueron satisfactorias. No se recibió un detalle adicional de casos individuales, por lo que esta entrega no atribuye pasos específicos no informados.

## 8. Compatibilidad e impacto

- Web: compatible; no se agregan dependencias ni APIs externas.
- Electron: compatible por arquitectura; esta fase no modifica Electron.
- Persistencia: sin cambios. Se mantienen fuentes canónicas y no se persisten resultados derivados nuevos.
- Contratos: se conservan la separación daño directo/efectos, Daño de Habilidad como capa exterior única y Daño Físico limitado a componentes físicos de armas.

## 9. Riesgos y pendientes

- La activación de Raro/Único requiere una etapa explícita de botín y balance; no se anticipa aquí.
- El techo combinado Raro (+79,55%) es informativo y deberá revisarse antes de habilitar esa rareza.
- Los 10 resultados Incorrectos de la regresión integral permanecen como deuda preexistente no relacionada con este cierre.
- Se recomienda una futura etapa de balance integral de armas, habilidades, recursos y arquetipos. No se inicia automáticamente.

## 10. Comprobación de restricciones

- sin cambios funcionales en esta Fase B;
- sin contratos canónicos nuevos ni motores paralelos;
- sin migraciones de guardado;
- sin dependencias, instalaciones, commit ni push;
- sin `.patch` ni `.mjs`;
- sin modificar Raro/Único;
- sin presentar las pruebas manuales del usuario como ejecutadas por el asistente.

## 11. Conventional Commit propuesto

```text
feat(combate): balancear escalados globales de daño y efectos

- mide los ejes globales con Player, equipo, motores canónicos y el generador de objetos;
- calibra afinidades directas y potencias específicas dentro de los techos activos aprobados;
- conserva pesos, contratos y Raro/Único deshabilitados;
- excluye Varita del afijo Brutal por compatibilidad con su ausencia de daño físico;
- actualiza el balanceador y cierra la documentación de combate y modificadores.
```

## 12. ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Plan Maestro de combate a distancia y defensas de Dark Moon

ETAPA CERRADA:
Balance de escalados globales de daño y efectos

ESTADO:
Cerrada con pendientes

COMMIT BASE:
8d3a2b3b4f4565fb37cd978607d34f31e0d23ecd

HEAD FINAL VERIFICADO:
8d3a2b3b4f4565fb37cd978607d34f31e0d23ecd

GIT STATUS FINAL:
`git status --porcelain` muestra 189 archivos trackeados modificados por el ZIP y 1 documento no trackeado de entrega. El ZIP conserva ruido CRLF/LF heredado; ignorando finales de línea, existen 9 cambios trackeados semánticos: 7 funcionales aprobados y 2 documentos maestros. El documento de entrega es el único archivo nuevo. El incremental documental contiene únicamente sus 3 documentos.

DOCUMENTO DE ENTREGA:
docs/combate/entregas/ENTREGA_BALANCE_ESCALADOS_GLOBALES.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/combate/PLAN_MAESTRO_COMBATE_A_DISTANCIA_Y_DEFENSAS_DARK_MOON.md
- docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md
- Sin cambios en docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md

OBJETIVO QUE SE COMPLETÓ:
Medir y calibrar los escalados globales de daño directo y potencia de efectos con los motores y el generador reales, sin alterar contratos ni activar rarezas futuras.

ARQUITECTURA HEREDADA:
`SistemaModificadoresCombatiente` sigue siendo el resolutor común. `ResolutorEscaladoDanio` aplica Daño Físico/Mágico/tipo, `MotorDanioHabilidad` aplica Daño de Habilidad una vez y `MotorEfectosHabilidad` resuelve Potencia de Efectos más potencia específica. El balanceador consume esas rutas, no las duplica.

ARCHIVOS CLAVE:
- src/herramientas/balance/AnalizadorBalanceCombate.js: recorridos reales y disponibilidad determinista de escalados globales.
- src/herramientas/balance/ObjetivosBalance.json: referencias, muestras y techos aprobados.
- src/config/objetos/afijos/Prefijos.json: valores calibrados y exclusión de Varita en Brutal.
- balance.html: presentación del informe de escalados, afijos y rarezas.

DEPENDENCIAS Y VERSIONES:
Ninguna dependencia nueva.

PRUEBAS CLAVE SUPERADAS:
- 14 recorridos de escalado: 13 Correctos, 1 Informativo y 0 Incorrectos.
- 2.000 muestras por bastón/collar: Común/Mágico activos y Raro/Único en 0%.
- pruebas manuales de Fase A confirmadas satisfactorias por el usuario.

PROBLEMAS O RIESGOS PENDIENTES:
- 10 resultados Incorrectos heredados de la regresión integral.
- techo combinado Raro informado, pero no habilitado ni balanceado para botín productivo.
- balance integral posterior de armas, habilidades, recursos y arquetipos.

DECISIONES APROBADAS:
- afinidades activas: +4–6 / +7–9 / +10–12 por grado;
- potencias específicas activas: +4–6 / +7–9 / +10–13 por grado;
- afinidad especializada activa entre +40% y +50% y potencia específica efectiva entre +45% y +55%;
- Raro y Único permanecen deshabilitados y los pesos se conservan;
- Congelamiento y Aturdimiento no escalan con Potencia de Efectos;
- Brutal excluye Varita por ausencia de componente físico.

DECISIONES QUE SIGUEN ABIERTAS:
- diseño, activación y balance productivo de Raro/Único;
- potencia específica de efectos futuros;
- balance integral de daño, recursos y arquetipos.

SIGUIENTE ETAPA RECOMENDADA:
Balance integral de armas, habilidades, recursos y arquetipos

OBJETIVO DE LA SIGUIENTE ETAPA:
Usar el balanceador ya ampliado para comparar daño esperado, área, control, Maná, tiempo, alcance y dependencia de equipo entre armas, habilidades y arquetipos; proponer cambios numéricos sólo donde exista evidencia reproducible.

PRIMEROS ARCHIVOS A REVISAR:
- src/herramientas/balance/AnalizadorBalanceJuego.js
- src/herramientas/balance/AnalizadorBalanceCombate.js
- src/herramientas/balance/ObjetivosBalance.json
- src/config/objetos/Armas.json
- src/config/habilidades/Habilidades.json

NO MODIFICAR SIN NUEVA APROBACIÓN:
- separación entre daño directo y efectos;
- Daño de Habilidad como capa exterior aplicada una sola vez;
- Daño Físico global limitado al componente físico de armas;
- resolución genérica danoTipo/potenciaEfecto sin motores por elemento o efecto;
- Raro/Único y sus contratos de botín;
- persistencia de resultados derivados.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Las comparaciones reproducibles deben identificar equilibrio o desvíos por categoría y arquetipo, con cambios numéricos aprobados que mantengan contratos, disponibilidad de botín y compatibilidad web/Electron.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
feat(combate): balancear escalados globales de daño y efectos

- mide los ejes globales con Player, equipo, motores canónicos y el generador de objetos;
- calibra afinidades directas y potencias específicas dentro de los techos activos aprobados;
- conserva pesos, contratos y Raro/Único deshabilitados;
- excluye Varita del afijo Brutal por compatibilidad con su ausencia de daño físico;
- actualiza el balanceador y cierra la documentación de combate y modificadores.

----------------- FIN DEL ENLACE -----------------
