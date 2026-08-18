# ENTREGA HP6 — Árbol genérico de habilidades y estados compactos en HUD

**Base:** `bc33b5d90f8ea8d451a80b594bde9889cf9bfbdc`
**Rama:** `main`
**Estado:** Cerrada. Validación técnica y pruebas manuales aprobadas por el usuario el 18/08/2026.
**Fecha:** 18/08/2026

## 1. Alcance implementado

HP6 transforma la presentación de Habilidades sin cambiar reglas jugables ni balance:

- árbol de habilidades genérico para todas las maestrías;
- nodos formados únicamente por icono y `grado/máximo`;
- orden automático por `requisitoNivelMaestria`;
- conexiones solo cuando existen relaciones inferibles de datos canónicos;
- modal contextual de detalle para Pasiva, Aura, Maldición y Ofensiva;
- aprender/mejorar desde el detalle y gestión de barra para habilidades activas;
- valores efectivos de activas mediante `ConfiguracionHabilidadEfectiva`;
- aumento del tamaño visual de iconos en árbol, detalle y barra rápida;
- Auras/Maldiciones activas en HUD con turnos de referencia restantes;
- retirada de la representación persistente de Aura/Maldición sobre el Player, conservando feedback transitorio;
- i18n y actualización documental.

HP6 no modifica balance, XP, puntos, persistencia, fórmulas de combate, `SistemaModificadoresCombatiente`, `SistemaEfectosTemporales` ni `ObservadorCambiosEstadoJugador`.

## 2. Organizador genérico

Se incorpora:

`src/interfaz/habilidades/OrganizadorArbolHabilidades.js`

El organizador recibe maestría, habilidades y definiciones de progreso. No contiene ningún condicional de magia/físico, de familia concreta ni de ID de habilidad.

La prueba estructural sobre el catálogo actual produce:

- Fuego/Frío/Rayo/Veneno: 11 nodos y 7 niveles visuales; las relaciones se derivan únicamente de vínculos concretos y de modificadores de `danoHabilidad` hacia activas que producen daño real;
- cada maestría física actual: 5 nodos, 5 niveles y 0 relaciones.

Las maestrías físicas no reciben eje, tronco ni conexiones artificiales para rellenar visualmente el espacio. Cuando se agregue futuro contenido, el mismo algoritmo lo incorporará.

## 3. Relaciones

Se utilizan únicamente datos ya existentes y no se agregan dependencias de aprendizaje:

- `condiciones.idHabilidad` → relación Pasiva → habilidad concreta;
- modificador con `objetivo = danoHabilidad` + `condiciones.maestriaHabilidad` → relación punteada hacia cada habilidad activa de esa maestría que realmente produzca daño directo o daño periódico canónico.

La comprobación de daño usa `configuracionEjecucion.habilidades`, porque el catálogo de progresión no conserva la ejecución de las activas. La definición del modificador de la pasiva sigue leyendo su configuración de progreso.

Esto deja, por ejemplo, `Afinidad Glacial` conectada con Esquirla de hielo, Nova de escarcha y Ráfaga glacial, pero no con Velo Glacial, Ceguera, Lentitud ni Vulnerabilidad Glacial. El mismo criterio se aplica a Fuego, Rayo y Veneno; Nube tóxica cuenta como ofensiva dañina por su daño periódico real.

No se agregaron requisitos `habilidad → habilidad` ni campos nuevos de progresión.

## 4. Nodo del árbol

Cada nodo muestra únicamente:

- icono;
- `gradoActual/gradoMaximo`.

Estados visuales:

- no aprendida: opacidad reducida;
- bloqueada por nivel: atenuación mayor;
- grado máximo: marco destacado;
- asignada a barra: acento periférico discreto.

La ventana de Habilidades pasa a ocupar aproximadamente `97vw × 96vh` y el árbol utiliza la altura restante. El scroll no es la estrategia principal del catálogo actual.

## 5. Modal contextual

El clic sobre cualquier nodo abre el detalle. La clasificación se deriva de datos:

- `tipo = pasiva` → Pasiva;
- efecto etiquetado `aura` → Aura;
- efecto etiquetado `maldicion` → Maldición;
- activa restante → Ofensiva.

La auditoría del catálogo actual clasifica:

- 64 Pasivas;
- 16 Auras;
- 12 Maldiciones;
- 12 Ofensivas;
- total: 104.

### Pasiva

Muestra modificadores y, si la configuración lo declara, la habilidad o maestría a la que aplica.

### Aura

Muestra magnitudes, radio, afectados, duración y datos de ejecución pertinentes. No muestra `Daño base: —`.

### Maldición

Muestra magnitud o bloqueo, probabilidad base, duración y resistencia cuando corresponda, además de ejecución.

### Ofensiva

Muestra solo los bloques presentes: daño directo, efectos periódicos, zona, geometría y ejecución. Una habilidad como Nube tóxica no recibe una fila falsa de daño directo.

Las activas usan `crearConfiguracionHabilidadEfectiva()` para que coste, tiempo, alcance, geometría, efectos y daño reflejen los valores canónicos actuales.

## 6. Acciones desde el detalle

Desde el modal se puede:

- aprender;
- mejorar;
- elegir punto específico/universal cuando ambos existen;
- asignar habilidad activa aprendida a la barra;
- quitarla de la barra.

`ProgresoHabilidadesJugador` y `SistemaHabilidadesJugador` continúan ejecutando las operaciones reales. La presentación no consume puntos ni escribe la barra directamente.

## 7. Tamaños visuales

Presentación objetivo:

- nodo del árbol: 72×72 px;
- icono principal del modal: 96×96 px;
- barra rápida: 56×56 px;
- Aura/Maldición activa en HUD: 48×48 px.

Existen reducciones responsive para viewports pequeños, manteniendo tamaños superiores o equivalentes a los anteriores.

La implementación base de HP6 no redimensionó los PNG. En el ajuste correctivo posterior al commit `d526797646348ac44000f823da3a1e9de22c0cc4` se normalizaron los seis iconos que aún estaban en 1254×1254 a **128×128**, sin cambiar rutas ni el contrato `Habilidades.json.icono`.

## 8. Auras y Maldiciones en HUD

Se agregan dos grupos sobre experiencia/barra rápida:

- Auras: izquierda;
- Maldiciones: derecha.

Cada estado consulta `Juego.obtenerEfectosTemporales(player)` y reutiliza el icono de la habilidad que referencia su `efectoId`. No se agrega un catálogo visual paralelo.

El contador visible usa:

`ceil((venceEn - tiempoActual) / TIEMPO_REFERENCIA)`

Esto es únicamente presentación de tiempo canónico; no existe `setInterval`, reloj visual ni duración duplicada.

## 9. Representación persistente del Player

`AdaptadorEscenaJuego` transporta las etiquetas de los efectos al contrato visual. `CompositorEntidadesPhaser` omite únicamente la representación **persistente** cuando:

- entidad visual = Player;
- efecto contiene etiqueta `aura` o `maldicion`.

Los eventos visuales mantienen sus etiquetas y `ReproductorEstadosTemporalesPhaser` conserva entrada y pulsos transitorios aunque el persistente esté suprimido.

En enemigos y otros combatientes no se aplica esta supresión.

## 10. Archivos principales

Nuevo:

- `src/interfaz/habilidades/OrganizadorArbolHabilidades.js`
- `docs/habilidades/entregas/ENTREGA_HP6.md`

Modificados principalmente:

- `src/interfaz/habilidades/PanelHabilidadesMaestrias.js`
- `assets/estilos/paneles/habilidades-maestrias.css`
- `src/interfaz/dom/HudPartidaDom.js`
- `src/interfaz/dom/FabricaInterfazPartidaDom.js`
- `src/interfaz/Renderizador.js`
- `index.html`
- `assets/estilos/pantallas/interfaz-partida.css`
- `assets/estilos/base/style.css`
- `src/interfaz/graficos/AdaptadorEscenaJuego.js`
- `src/interfaz/graficos/PlanificadorEventosVisuales.js`
- `src/interfaz/graficos/phaser/CompositorEntidadesPhaser.js`
- `src/interfaz/graficos/phaser/reproductores/ReproductorEstadosTemporalesPhaser.js`
- `src/config/idiomas/es.json`
- `src/config/idiomas/en.json`
- Plan Maestro de habilidades;
- Diseño Maestro Visual.

## 11. Validaciones reproducibles ejecutadas

- base `main`, HEAD y `origin/main` = `bc33b5d90f8ea8d451a80b594bde9889cf9bfbdc`;
- árbol limpio antes de comenzar con `git -c core.autocrlf=true status`;
- 38 JSON válidos;
- 772 imports relativos revisados, 0 faltantes;
- sintaxis de JS modificados validada con `node --check`;
- 104 habilidades clasificadas sin ambigüedad: 64/16/12/12;
- organizador aplicado a las 16 maestrías sin ramas físicas/mágicas;
- maestrías físicas actuales verificadas con 0 relaciones artificiales;
- no se modificaron PNG de habilidades;
- no se agregaron dependencias.

La ejecución headless con Chromium no pudo certificarse en el entorno de trabajo por limitaciones del proceso gráfico/DBus. No se registra como prueba superada.

## 12. Pruebas manuales requeridas

1. Abrir Habilidades y recorrer maestrías mágicas y físicas.
2. Confirmar que las físicas con pocas habilidades no presentan líneas/ejes inventados.
3. Confirmar orden descendente visual por requisito de maestría.
4. Revisar nodo no aprendido, bloqueado, aprendido, máximo y asignado.
5. Abrir una Pasiva y validar campos/Aprender/Mejorar.
6. Abrir una Aura y comprobar ausencia de `Daño base —`.
7. Abrir una Maldición, especialmente Ceguera/Silencio, y validar probabilidad/duración/resistencia/efecto.
8. Abrir Ascua u otra Ofensiva y validar daño/Maná/tiempo/alcance.
9. Abrir Nube tóxica y comprobar que muestra efecto/zona sin daño directo falso.
10. Aprender `Ascua eficiente` y comprobar que el modal de Ascua refleja inmediatamente el Maná efectivo.
11. Asignar/reemplazar/quitar habilidades desde el flujo del modal.
12. Confirmar iconos mayores en árbol y barra rápida.
13. Aplicar un Aura al Player: debe aparecer a la izquierda del HUD con contador y no dejar persistente brillante sobre el Player; el feedback de activación debe mantenerse.
14. Aplicar una Maldición al Player: debe aparecer a la derecha del HUD con contador.
15. Avanzar tiempo y comprobar decremento/desaparición de contadores sin reloj paralelo.
16. Verificar que un enemigo afectado conserva su representación persistente.
17. Probar ES/EN y resoluciones reducidas.
18. Regresión básica: movimiento, ataque, habilidades, inventario/equipamiento, guardado/carga.

## 13. Cierre

El usuario informó el 18/08/2026 que las pruebas de HP6 fueron satisfactorias y dio la etapa por aprobada. Se incluyen en ese cierre los ajustes posteriores del grafo de Afinidades: no existen conexiones artificiales a Auras/Maldiciones y las pasivas de `danoHabilidad` solo apuntan a activas de la afinidad que producen daño real.

HP6 queda **Cerrada**. No se realizó commit ni push desde esta entrega. El commit final queda a cargo del usuario.

La prueba headless de Chromium que había quedado limitada por DBus/proceso gráfico no se reclasifica retroactivamente como ejecutada; el cierre se sustenta en la validación técnica reproducible y en la validación manual informada por el usuario.

## Ajustes correctivos posteriores al commit de cierre

Sobre `d526797646348ac44000f823da3a1e9de22c0cc4` se incorporan tres correcciones visuales sin alterar lógica jugable:

- los seis PNG de habilidades que seguían en 1254×1254 se normalizan a 128×128;
- se retira el título interno azul `Personaje` del contenido clonado, conservando únicamente el título del panel superpuesto;
- `PanelPersonaje` recibe también la configuración canónica de ejecución para resolver `efectoId → habilidad → icono`, por lo que Auras y Maldiciones activas como Manto Ígneo muestran su PNG real en `Efectos activos` en vez del fallback de letra.

No se cambia `SistemaEfectosTemporales`, persistencia, balance ni contratos de ejecución.

## 14. ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Plan Maestro de habilidades y pasivas de Dark Moon.

ETAPA CERRADA:
HP6 — Árbol genérico, estados en HUD y cierre.

ESTADO:
Cerrada.

COMMIT BASE:
`bc33b5d90f8ea8d451a80b594bde9889cf9bfbdc`

HEAD FINAL VERIFICADO:
`bc33b5d90f8ea8d451a80b594bde9889cf9bfbdc` antes del commit final del usuario.

GIT STATUS FINAL:
Árbol de trabajo con los cambios implementados de HP6 y sus ajustes posteriores; no se realizó commit desde esta entrega.

DOCUMENTO DE ENTREGA:
`docs/habilidades/entregas/ENTREGA_HP6.md`

DOCUMENTOS MAESTROS ACTUALIZADOS:
- `docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`

OBJETIVO QUE SE COMPLETÓ:
Cerrar la presentación del sistema de habilidades mediante un árbol genérico, detalle contextual, gestión de aprendizaje/barra y estados compactos de Aura/Maldición en HUD, conservando los contratos canónicos existentes.

ARQUITECTURA HEREDADA:
`OrganizadorArbolHabilidades` es genérico para todas las maestrías; `ConfiguracionHabilidadEfectiva` sigue siendo la fuente de valores efectivos; `ObservadorCambiosEstadoJugador` sigue siendo el único canal de invalidación; el HUD consume efectos temporales reales; no se agregan relaciones o dependencias ficticias.

ARCHIVOS CLAVE:
- `src/interfaz/habilidades/OrganizadorArbolHabilidades.js`: organiza nodos y relaciones gráficas a partir de datos canónicos.
- `src/interfaz/habilidades/PanelHabilidadesMaestrias.js`: representa árbol, modal y acciones.
- `src/interfaz/dom/HudPartidaDom.js`: presenta Auras/Maldiciones activas.
- `src/juego/habilidades/ConfiguracionHabilidadEfectiva.js`: mantiene los valores efectivos canónicos de activas.

DEPENDENCIAS Y VERSIONES:
Ninguna nueva.

PRUEBAS CLAVE SUPERADAS:
- árbol genérico y ausencia de conexiones ficticias en maestrías sin relaciones;
- modal contextual y acciones de aprender/mejorar/barra;
- Auras/Maldiciones activas en HUD y supresión del persistente correspondiente sobre Player;
- corrección de Afinidades para conectar solo con activas de la misma maestría que producen daño real;
- validación manual final declarada satisfactoria por el usuario.

PROBLEMAS O RIESGOS PENDIENTES:
- el balance fino de pasivas, auras, maldiciones, XP y puntos continúa como trabajo futuro ya documentado;
- los 104 iconos de habilidades quedan normalizados a 128×128 tras el ajuste correctivo posterior al cierre;
- la ejecución headless con Chromium no pudo certificarse en el entorno de trabajo por limitaciones DBus/proceso gráfico.

DECISIONES APROBADAS:
- un solo árbol genérico para todas las maestrías y habilidades;
- sin tratamiento especial para maestrías físicas;
- conexiones de afinidad de `danoHabilidad` únicamente hacia activas con daño real;
- modal específico por Pasiva/Aura/Maldición/Ofensiva;
- iconos de mayor tamaño solo por presentación;
- Auras/Maldiciones en HUD sin temporizador paralelo;
- sin cambios de balance ni persistencia.

DECISIONES QUE SIGUEN ABIERTAS:
Las decisiones de balance y contenido futuro enumeradas en el Plan Maestro.

SIGUIENTE ETAPA RECOMENDADA:
Por definir. El hito de habilidades/pasivas queda cerrado y no se avanza automáticamente.

OBJETIVO DE LA SIGUIENTE ETAPA:
Debe definirse mediante una nueva propuesta aprobada por el usuario.

PRIMEROS ARCHIVOS A REVISAR:
- `docs/habilidades/PLAN_MAESTRO_HABILIDADES_PASIVAS_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
- el documento maestro correspondiente al próximo hito que se defina.

NO MODIFICAR SIN NUEVA APROBACIÓN:
- `SistemaModificadoresCombatiente` y sus contratos;
- `ProgresoHabilidadesJugador` / `SistemaExperienciaMaestrias`;
- `SistemaEfectosTemporales` y semántica de Auras/Maldiciones;
- `ObservadorCambiosEstadoJugador`;
- balance, persistencia y reglas de combate/progresión.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Debe definirse en la propuesta de la nueva etapa antes de implementar.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
`feat(habilidades): incorporar árbol genérico y estados activos en HUD`

- reemplazar la lista de habilidades por un árbol genérico generado desde configuración y progreso;
- incorporar detalle contextual para Pasivas, Auras, Maldiciones y Ofensivas con aprendizaje, mejora y gestión de barra;
- aumentar el tamaño de presentación de iconos sin modificar sus archivos fuente;
- mostrar Auras y Maldiciones activas en HUD con duración derivada del tiempo canónico;
- retirar la representación persistente de Aura/Maldición sobre el Player conservando feedback transitorio;
- representar relaciones de pasivas únicamente cuando están respaldadas por datos canónicos y conectar Afinidades de daño solo con activas que producen daño real;
- validar manualmente HP6 y cerrar el hito de habilidades/pasivas.

----------------- FIN DEL ENLACE -----------------
