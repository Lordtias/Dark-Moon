# Entrega — Aplicación y persistencia

## Base

- Rama local: `main`.
- Commit base: `83ca2967f14a6fbc025b5b649996a505dc1dd28e`.
- La copia utilizada conserva `.git` y parte del ZIP completo entregado para esta continuación.

## Alcance aprobado

Esta entrega corrige dos responsabilidades locales sin modificar reglas jugables:

1. la presentación DOM deja de guardar o eliminar directamente el estado durable del jugador;
2. la compuerta de entrada jugable y su medición de fluidez salen de `ControladorPartida` hacia un coordinador de aplicación dedicado.

No incluye infraestructura común de JSON/almacenamiento ni separación de herramientas de prueba. Tampoco modifica el backend Canvas 2D ni los grandes módulos de presentación.

## Arquitectura resultante

### Persistencia durable

`EstadoPartida` es la autoridad que solicita guardar o eliminar el snapshot durable del jugador.

- `IntegracionHabilidadesDom` recibe `alSolicitarGuardadoJugador` y no importa `PersistenciaJugador`.
- `PresentacionMapaActivoDom` solamente propaga ese callback.
- `ControladorPartida` conecta la solicitud con `EstadoPartida.guardarEstadoDurable()`.
- al confirmarse una derrota, `ControladorPartida` solicita `EstadoPartida.eliminarEstadoDurable()` antes de delegar la presentación.
- `AdaptadorDerrotaDom` solamente muestra el modal y navega al menú; no lee ni escribe `localStorage`.

La persistencia propia de la configuración de la barra permanece fuera de este cambio porque no es el estado durable del personaje y será tratada junto a la infraestructura común en el trabajo posterior.

### Entrada jugable

Se agrega `src/aplicacion/CoordinadorEntradaJugable.js`.

Este coordinador conserva el flujo ya existente:

```text
disponible
  ↓
resolviendo
  ↓
si consume turno: esperando_presentacion
  ↓
disponible
```

También conserva:

- descarte de entradas concurrentes;
- tokens por versión de mapa;
- invalidación al reemplazar el mapa;
- espera del punto seguro de presentación;
- liberación ante error lógico, error de preparación o error visual;
- `MedidorFluidezPartida` y el formato público de su resumen.

`ControladorPartida` sigue validando que exista un mapa activo y sigue siendo quien decide qué lógica ejecutar.

## Archivos

### Agregado

- `src/aplicacion/CoordinadorEntradaJugable.js`
- `docs/phaser/entregas/ENTREGA_DEUDA_ESTRUCTURAL_LOCAL_B.md`

### Modificados

- `src/aplicacion/ControladorPartida.js`
- `src/partida/EstadoPartida.js`
- `src/interfaz/habilidades/IntegracionHabilidadesDom.js`
- `src/interfaz/dom/PresentacionMapaActivoDom.js`
- `src/interfaz/derrota/AdaptadorDerrotaDom.js`
- `README.md`

### Eliminados

Ninguno.

## Dependencias

No se agregaron ni instalaron dependencias. Se mantienen las versiones existentes del repositorio.

## Persistencia

No cambia ninguna clave, versión ni formato de snapshot. La diferencia es únicamente quién solicita las operaciones existentes de guardado y eliminación.

## Validación automática

Resultados obtenidos:

- 239 módulos JavaScript comprobados con `node --check`: correcto;
- imports relativos faltantes: 0;
- ciclos ES detectados: 0;
- importación real de 6 módulos afectados: correcta;
- prueba determinista de `CoordinadorEntradaJugable`: correcta para acción sin turno, espera visual, entrada concurrente descartada, invalidación por cambio de mapa, error lógico, error de procesamiento y error al consultar la espera visual;
- dependencias de `src/interfaz` hacia `PersistenciaJugador`: 0;
- eliminación durable mediante `EstadoPartida` con almacenamiento simulado: correcta;
- orden de derrota comprobado con doble de prueba: eliminar durable antes de presentar;
- solicitud de guardado desde `IntegracionHabilidadesDom` comprobada mediante callback inyectado: correcta;
- servidor HTTP local en puerto 8891: `index.html`, `game.js`, `CoordinadorEntradaJugable.js`, `ControladorPartida.js`, `EstadoPartida.js` y Phaser 4.2.1 respondieron HTTP 200.

El primer intento de esa comprobación HTTP utilizó el puerto 8765 y no inició porque ya existía un servidor anterior ocupándolo. No fue un fallo de Dark Moon; la prueba se repitió en 8891 y terminó correctamente.

No se ejecutó Electron porque el ZIP no contiene `node_modules` y, por restricción de la metodología, no se instalaron dependencias. `electron/main.js` conserva sintaxis válida y el protocolo `darkmoon://app/index.html` no fue modificado.

## Pruebas manuales solicitadas

1. iniciar una partida nueva y cambiar de ciudad a mazmorra y volver;
2. aprender/mejorar una habilidad y recargar para comprobar que el jugador se conserva;
3. asignar habilidades en la barra y comprobar su persistencia;
4. atacar, moverse, esperar y usar habilidades mientras hay animaciones, intentando introducir otra acción durante la reproducción;
5. abrir inventario/equipamiento y ejecutar consumibles o cambios de equipo;
6. morir y comprobar que aparece el modal de derrota; volver al menú y confirmar que `Continuar` ya no recupera al personaje derrotado;
7. revisar la consola durante todos los casos.

## Criterio de cierre

Esta entrega se considera cerrada únicamente después de la validación automática y la aprobación manual del flujo de entrada, guardado y derrota. No habilita todavía el siguiente trabajo de infraestructura común.
