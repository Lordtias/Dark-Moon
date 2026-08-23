# ENTREGA — Panel Personaje: daño y desglose canónico

## 1. Estado de cierre

- Base de verdad funcional: `Dark-Moon(5).zip` sobre `main`.
- Commit base y HEAD verificado: `72b04079f6d98311f6191a946fc2e12b368cb725`.
- Dependencias nuevas: ninguna.
- Estrategia aplicada: cuatro incrementales funcionales A1–A4 y este incremental documental de cierre.
- Estado: cerrado tras la confirmación explícita del usuario de que aplicó A4 y sus pruebas manuales fueron satisfactorias el 23/08/2026.

El ZIP de base presenta ruido heredado de CRLF/LF. La revisión semántica, ignorando finales de línea, identifica cinco archivos funcionales de la Fase A. Esta Fase B no los modifica: solo registra el estado aprobado.

## 2. Objetivo completado

Reorganizar la sección `Daño` del Panel Personaje para priorizar el resultado final, exponer el promedio final de Arma y Secundaria y hacer legible el desglose canónico de cada fuente sin crear cálculos ni motores de presentación.

El rediseño de la pantalla de Habilidades no forma parte de este cierre. Queda como la próxima etapa recomendada y requiere su análisis visual previo.

## 3. Arquitectura conservada

```text
ConfiguracionAtaque
    ↓ fuentes de ataque y multiplicador de mano
EstadisticasDerivadas + SistemaModificadoresCombatiente
    ↓ resultado y desglose canónicos por fuente
PanelPersonaje
    ↓ representación HTML/CSS
ModalDetalleEstadistica
```

`PanelPersonaje` consume los campos ya resueltos de cada fuente: `minimoLocal`, `maximoLocal`, `bonoAtributo`, `multiplicadorAtributo`, `multiplicadorGolpe`, `resolucionMultiplicadorDanioFuente`, `rangosComponentes`, `minimo`, `maximo` y `promedio`.

No se cambió `ConfiguracionAtaque`, `EstadisticasDerivadas`, `SistemaModificadoresCombatiente`, `ResolutorEscaladoDanio` ni `SistemaCombate`.

## 4. Alcance funcional aprobado

### Daño agrupado

La sección `Daño` queda organizada como:

```text
Daño final
- Daño medio
- DPS

Daño de armas
- Arma
- Secundaria

Daños globales
- Daño Físico
- Daño Mágico
- Daño de Habilidad
```

`Arma` y `Secundaria` muestran el promedio final canónico de su fuente activa. La secundaria:

- se oculta con arma de dos manos;
- queda apagada con `--.-` si el objeto equipado no participa con daño;
- no provoca que la interfaz calcule o invente una fuente.

### Desglose por ranura

El modal de Arma o Secundaria conserva este orden:

1. rango final;
2. rango base/local;
3. aporte de atributo ofensivo cuando existe;
4. factor efectivo de mano secundaria cuando es distinto de `×1`;
5. modificadores canónicos de fuente y componente;
6. componentes finales cuando hay más de uno.

`Marcial`, `Místico`, `Enfocado` y los objetivos de daño por tipo se formatean como porcentajes cuando el contrato canónico los declara como daño porcentual. Esto corrige la lectura visual de `Marcial +12` a `Marcial +12%` sin cambiar su multiplicador canónico `1.12`.

La penalización de mano secundaria se presenta desde `resolucionMultiplicadorDanioFuente.resultado`. Por tanto:

- `0.5` muestra `Penalización de mano secundaria -50%`;
- un futuro `0.6` mostrará `-40%`;
- `1` no muestra fila;
- un valor mayor a `1` se presenta como bonificación.

No existe un `-50%` fijo en la interfaz. La conversión de multiplicador a porcentaje es exclusivamente de presentación del resultado canónico efectivo.

### Daño medio

El detalle de `Daño medio` presenta solo los promedios finales por fuente activa. No vuelve a listar Fuerza u otro aporte primario que ya está incorporado dentro de esos promedios.

## 5. Archivos funcionales aprobados

Estos archivos pertenecen a los incrementales funcionales A1–A4 ya aplicados y validados por el usuario. No se incluyen en este ZIP documental:

- `assets/estilos/paneles/panel-personaje.css`
- `index.html`
- `src/config/idiomas/en.json`
- `src/config/idiomas/es.json`
- `src/interfaz/PanelPersonaje.js`

No se agregaron ni eliminaron archivos funcionales.

## 6. Documentación de este incremental

- `docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
- `docs/habilidades/entregas/ENTREGA_PANEL_PERSONAJE_DANIO.md`

## 7. Validaciones registradas

### Ejecutadas por el asistente en Fase A

- sintaxis correcta de `PanelPersonaje.js`;
- JSON ES/EN válido e importación de la interfaz correcta;
- casos deterministas con dos espadas, Fuerza 13, daño físico local, componente de Fuego y `Marcial`;
- verificación de que el motor canónico produce Fuerza `+7.5%`, Marcial `×1.12` y mano secundaria `×0.5`;
- comprobación de que el panel muestra `Marcial +12%`, no repite Fuerza en `Daño medio` y no muta la salida canónica;
- comprobación dinámica de la penalización desde `resultado`: `0.5 → -50%`, `0.6 → -40%`, `1 → sin fila`, `1.2 → bonificación +20%`;
- cada ZIP funcional fue listado, probado y contrastado contra sus archivos fuente.

### Validadas por el usuario

El usuario confirmó explícitamente que aplicó A4 y que las pruebas manuales fueron satisfactorias. Esta entrega no atribuye pasos manuales adicionales no detallados por el usuario.

## 8. Compatibilidad e impacto

- Web: compatible; no se agregan dependencias ni APIs externas.
- Electron: compatible; la Fase B no modifica Electron.
- Persistencia: sin cambios; no se persisten estadísticas derivadas ni desgloses.
- Contratos: sin cambios; el panel continúa leyendo el resultado canónico del ataque actual.
- Habilidades: sin cambios funcionales ni visuales en este cierre.

## 9. Riesgos y pendientes

- La próxima etapa deberá rediseñar la pantalla de Habilidades con análisis visual previo. La decisión ya aprobada es retirar las sinergias visuales de atributos generales y conservar solo relaciones directas de modificación específica.
- La composición exacta, navegación y representación de esa nueva pantalla aún no fueron propuestas ni implementadas.
- El balance de dos armas puede variar `multiplicadorManoSecundaria`; la presentación ya seguirá el resultado canónico efectivo sin requerir cambios de UI.

## 10. Comprobación de restricciones

- sin cambios funcionales en esta Fase B;
- sin motores, consultas ni ecuaciones paralelas;
- sin migraciones de guardado;
- sin dependencias, instalaciones, commit ni push;
- sin `.patch` ni `.mjs`;
- sin reabrir HP6 ni avanzar automáticamente al rediseño de Habilidades;
- sin presentar pruebas manuales del usuario como ejecutadas por el asistente.

## 11. Conventional Commit propuesto

```text
feat(interfaz): reorganizar daño y desglose del personaje

- agrupa daño final, fuentes de arma y bonificaciones globales en el Panel Personaje;
- expone el promedio final y el desglose canónico de Arma y Secundaria;
- presenta porcentajes de daño, componentes finales y penalización dinámica de mano secundaria;
- evita repetir aportes de atributos ya incorporados en Daño medio;
- actualiza traducciones y documentación de la presentación canónica.
```

## 12. ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Panel Personaje y presentación de Habilidades de Dark Moon

ETAPA CERRADA:
Panel Personaje — daño y desglose canónico

ESTADO:
Cerrada

COMMIT BASE:
72b04079f6d98311f6191a946fc2e12b368cb725

HEAD FINAL VERIFICADO:
72b04079f6d98311f6191a946fc2e12b368cb725 antes del commit final del usuario.

GIT STATUS FINAL:
El ZIP de base conserva ruido CRLF/LF heredado. Ignorando finales de línea, la Fase A contiene cinco archivos funcionales aprobados y la Fase B contiene dos documentos actualizados y un documento de entrega nuevo. El incremental documental contiene únicamente esos tres documentos.

DOCUMENTO DE ENTREGA:
docs/habilidades/entregas/ENTREGA_PANEL_PERSONAJE_DANIO.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md

OBJETIVO QUE SE COMPLETÓ:
Reorganizar la lectura de Daño y exponer el promedio y desglose final de cada arma desde los resultados canónicos, incluida la penalización dinámica de mano secundaria.

ARQUITECTURA HEREDADA:
`ConfiguracionAtaque` define fuentes y multiplicadores de mano; `EstadisticasDerivadas` y `SistemaModificadoresCombatiente` resuelven los valores; `PanelPersonaje` solo los representa. No crear cálculos alternativos para tooltips, rangos, atributos, componentes ni penalizaciones.

ARCHIVOS CLAVE:
- src/interfaz/PanelPersonaje.js: presenta el resumen y el detalle sin recalcular estadísticas.
- src/entidad/destructible/combatiente/ConfiguracionAtaque.js: declara la fuente secundaria y su multiplicador base en ataque dual.
- src/entidad/destructible/combatiente/EstadisticasDerivadas.js: conserva el resultado y desglose canónico de cada fuente.
- src/interfaz/habilidades/PanelHabilidadesMaestrias.js: primer consumidor a analizar para el próximo rediseño visual.
- src/interfaz/habilidades/OrganizadorArbolHabilidades.js: origen de las relaciones visuales actuales de habilidades.

DEPENDENCIAS Y VERSIONES:
Ninguna dependencia nueva.

PRUEBAS CLAVE SUPERADAS:
- sintaxis, JSON e importación de los archivos funcionales modificados;
- dos armas con Fuerza, daño local, componente elemental y Marcial;
- porcentaje dinámico de la mano secundaria desde el resultado canónico;
- pruebas manuales de A4 declaradas satisfactorias por el usuario.

PROBLEMAS O RIESGOS PENDIENTES:
- el rediseño de Habilidades continúa pendiente de análisis y aprobación visual;
- no se deben conservar sinergias visuales de atributos generales cuando se implemente esa etapa;
- no hay riesgo funcional conocido en el Panel Personaje tras la validación manual.

DECISIONES APROBADAS:
- el valor por ranura es el promedio final canónico;
- la secundaria sin daño usa `--.-` apagado y la de arma de dos manos se oculta;
- Daño medio y DPS pertenecen a Daño final;
- el detalle usa rango final, fuente local, atributo, modificadores y componentes canónicos;
- Marcial y los demás objetivos de daño porcentual muestran `%`;
- la penalización de secundaria usa el resultado efectivo canónico y no un `-50%` fijo;
- el próximo rediseño de Habilidades conservará solo relaciones directas de modificación específica.

DECISIONES QUE SIGUEN ABIERTAS:
- composición visual y flujo de navegación exactos para la nueva pantalla de Habilidades;
- tratamiento visual detallado de las relaciones directas restantes.

SIGUIENTE ETAPA RECOMENDADA:
Rediseño de pantalla de Habilidades — propuesta visual A

OBJETIVO DE LA SIGUIENTE ETAPA:
Analizar y proponer una pantalla más clara que exponga habilidades y sus relaciones directas de modificación específica, sin nodos o sinergias visuales que representen atributos generales. No implementar hasta aprobar la propuesta visual y el flujo resultante.

PRIMEROS ARCHIVOS A REVISAR:
- src/interfaz/habilidades/PanelHabilidadesMaestrias.js
- src/interfaz/habilidades/OrganizadorArbolHabilidades.js
- assets/estilos/paneles/habilidades-maestrias.css
- src/config/habilidades/Habilidades.json
- src/config/habilidades/ProgresoHabilidades.json

NO MODIFICAR SIN NUEVA APROBACIÓN:
- SistemaModificadoresCombatiente y sus contratos;
- progreso, puntos y persistencia de habilidades;
- ConfiguracionHabilidadEfectiva y ejecución canónica de habilidades;
- significado jugable de relaciones existentes;
- reglas de combate, daño y efectos.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
La propuesta aprobada debe permitir reconocer con claridad las habilidades y solo sus modificaciones directas, conservar acciones de aprender/mejorar/barra, funcionar en web y Electron y no alterar progresión, persistencia ni reglas canónicas.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
feat(interfaz): reorganizar daño y desglose del personaje

- agrupa daño final, fuentes de arma y bonificaciones globales en el Panel Personaje;
- expone el promedio final y el desglose canónico de Arma y Secundaria;
- presenta porcentajes de daño, componentes finales y penalización dinámica de mano secundaria;
- evita repetir aportes de atributos ya incorporados en Daño medio;
- actualiza traducciones y documentación de la presentación canónica.

----------------- FIN DEL ENLACE -----------------
