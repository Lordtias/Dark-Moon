# PLAN MAESTRO — LIMPIEZA ESTRUCTURAL DE DARK MOON

**Estado:** plan rector de seis etapas pequeñas y seguras.

**Propósito:** ordenar responsabilidades, retirar solapamientos comprobados y
conservar la lógica canónica existente. No autoriza reescrituras generales ni
cambios de gameplay por sí mismo.

## Principios permanentes

- Una sola lógica canónica para movimiento, combate, muerte, experiencia,
  botín, persistencia y modificadores.
- Las capas visuales representan resultados; no crean reglas ni recalculan
  datos de combate.
- Toda extracción mantiene las APIs públicas hasta que sus consumidores estén
  comprobados.
- Cada etapa se entrega primero como incremental funcional para pruebas del
  usuario y luego como incremental documental de cierre.
- No se eliminan archivos o rutas sin comprobar primero que no tienen
  consumidores productivos, dinámicos o de depuración.

## Etapas y estado

### 1. Frontera canónica de consultas para UI — cerrada

- Retirar cálculos de `PanelPersonaje` y `PanelHabilidadesMaestrias`.
- Entregar valores y desgloses resueltos mediante consultas de presentación.
- No cambiar fórmulas, balance, persistencia ni diseño visual.

Quedó cerrada como **AUD2 — presentación canónica de Personaje y
Habilidades**, incluidos sus correctivos posteriores. La interfaz recibe el
orden, operación y unidad desde la consulta canónica.

### 2. Ordenamiento de aplicación y partida — cerrada documentalmente

- Reducir responsabilidades de `Aplicacion.js` y `ControladorPartida.js`.
- Separar arranque/carga, transiciones de mapa y coordinación de comandos.
- Mantener APIs públicas para evitar regresiones.

La etapa queda documentada en
`docs/mantenimiento/entregas/ENTREGA_LIM_2_ORDENAMIENTO_APLICACION_PARTIDA.md`.

### 3. Descomposición interna de combate y estadísticas — siguiente

- Ordenar `EstadisticasDerivadas`, `SistemaCombate`,
  `SistemaCombateJugador` y sus contratos.
- Mantener una única fórmula canónica de daño, impacto, dispersión, defensa y
  DPT.
- No alterar balance ni contratos de modificadores.

### 4. Descomposición de habilidades, tiempo y efectos — pendiente

- Separar selección, ejecución y presentación de Habilidades.
- Delimitar coordinación temporal, efectos temporales, zonas y estados
  tácticos.
- Preservar carga de arco, estados y eventos ya cerrados.

### 5. Botín, generación, herramientas y balance — pendiente

- Ordenar `SistemaBotin`, generación procedimental y validadores.
- Registrar accesos claros para herramientas de depuración.
- Revisar `balance.html` como aplicación independiente, sin contaminar el
  juego.

### 6. Interfaz Phaser/DOM y cierre — pendiente

- Separar modelos de vista, construcción DOM, eventos y reproducción Phaser
  donde todavía estén mezclados.
- Eliminar únicamente código que quede comprobablemente sin consumidores tras
  cada etapa.
- Completar documentación final, inventario de responsabilidades y pruebas de
  regresión.

## Dependencias entre etapas

La etapa 3 no modifica ni sustituye la frontera de consultas de la etapa 1 ni
los coordinadores extraídos en la etapa 2. Debe consumir sus contratos tal como
estén cerrados.

Las etapas 4 a 6 requieren análisis independiente y aprobación explícita antes
de cualquier modificación.
