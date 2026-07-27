# ENTREGA — ETAPA 7 ESPECIAL

## Normalización arquitectónica y eliminación de nombres temporales por etapa

### Repositorio y referencia

- Repositorio: `https://github.com/Lordtias/Dark-Moon.git`
- Rama objetivo: `main`
- Commit base obligatorio: `354e93b94d6bf9eb84ca6a853a25c410d0660c3c`
- HEAD público observado durante la revisión: `ea875089d5d67c55f00ec9c9b6968ce59391a717`
- Estado de la entrega: archivos preparados, sin commit y sin push.

El commit de ETAPA 7 existe como descendiente directo del HEAD público observado, pero no estaba apuntado por `main`. Esta entrega debe aplicarse sobre una copia local cuyo HEAD sea exactamente `354e93b`.

## Objetivo cumplido

La arquitectura deja de identificar componentes por el momento histórico en que fueron incorporados. El ciclo de habilidades pasa a estar formado por componentes canónicos y funcionales:

- `ControladorPartida` administra también la vida de la integración de habilidades.
- `SistemaHabilidadesJugador` contiene la política definitiva de barra manual.
- `IntegracionHabilidadesJugador` coordina motor, interfaz, entrada, observación y persistencia.
- `DepuradorMagiaHabilidades` publica una única fachada funcional en `darkMoonDebug.magia`.
- La barra, el selector visual, el observador y la hoja de estilos usan identificadores funcionales.

No se alteraron daños, costes, Maná, tiempos, experiencia, requisitos, grados, balance ni reglas de catalizadores.

## Inventario inicial

### Archivos JavaScript nombrados por etapa

- `src/aplicacion/ControladorPartidaEtapa7.js`
- `src/juego/maestrias/DepuradorEtapa4.js`
- `src/juego/habilidades/DepuradorEtapa5.js`
- `src/juego/habilidades/DepuradorEtapa6.js`
- `src/juego/habilidades/DepuradorEtapa7.js`
- `src/juego/habilidades/InstaladorEtapa5.js`
- `src/juego/habilidades/IntegracionHabilidadesEtapa5.js`
- `src/juego/habilidades/IntegracionHabilidadesEtapa7.js`
- `src/juego/habilidades/SistemaHabilidadesJugadorEtapa7.js`

### Referencias activas adicionales encontradas

- importación por alias de `ControladorPartidaEtapa7` desde `Aplicacion.js`;
- publicación separada de `darkMoonDebug.etapa5`, `.etapa6` y `.etapa7`;
- alias globales `darkMoonDebugEtapa5`, `darkMoonDebugEtapa6` y `darkMoonDebugEtapa7`;
- símbolo interno `darkMoon.etapa7.observadorProgresoMagico`;
- `data-barra-habilidades="etapa7"`;
- clases CSS `selector-habilidad-etapa7` y `selector-habilidad-invalido-etapa7`;
- identificador DOM `estilosHabilidadesMaestriasEtapa7`;
- mensajes de consola identificados como ETAPA 5;
- comentarios vigentes que describían la instalación dinámica anterior.

## Clasificación aplicada

### Integrados

#### `ControladorPartidaEtapa7.js`

Su única responsabilidad era destruir la integración anterior y crear una nueva después de activar el mapa. Ese comportamiento definitivo se incorporó a `src/aplicacion/ControladorPartida.js`.

#### `SistemaHabilidadesJugadorEtapa7.js`

La subclase anulaba la autoasignación e incorporaba restauración, vaciado y desasignación. Esa política definitiva se integró en `src/juego/habilidades/SistemaHabilidadesJugador.js`.

### Renombrado

- Origen: `src/juego/habilidades/IntegracionHabilidadesEtapa7.js`
- Destino: `src/juego/habilidades/IntegracionHabilidadesJugador.js`

La coordinación de una integración por mapa es una responsabilidad permanente. Se conserva con nombre funcional y ciclo de destrucción idempotente.

### Consolidados

Los cuatro depuradores históricos se reemplazan por:

`src/juego/habilidades/DepuradorMagiaHabilidades.js`

API consolidada:

```text
darkMoonDebug.magia.progreso
darkMoonDebug.magia.persistencia
darkMoonDebug.magia.habilidades
darkMoonDebug.magia.barra
darkMoonDebug.magia.catalizadores
darkMoonDebug.magia.interfaz
darkMoonDebug.magia.arquitectura
darkMoonDebug.magia.validarTodo()
```

La fachada resuelve la aplicación, el controlador, el juego y la integración activos en cada llamada. No retiene referencias a mapas destruidos.

### Eliminados

- `ControladorPartidaEtapa7.js`
- `DepuradorEtapa4.js`
- `DepuradorEtapa5.js`
- `DepuradorEtapa6.js`
- `DepuradorEtapa7.js`
- `InstaladorEtapa5.js`
- `IntegracionHabilidadesEtapa5.js`
- `IntegracionHabilidadesEtapa7.js`
- `SistemaHabilidadesJugadorEtapa7.js`

No se conservan adaptadores ni alias de compatibilidad porque no existen guardados ni consumidores antiguos que deban mantenerse.

## Arquitectura anterior

```text
Aplicacion
└─ ControladorPartidaEtapa7
   └─ ControladorPartida
      └─ IntegracionHabilidadesEtapa7
         ├─ SistemaHabilidadesJugadorEtapa7
         │  └─ SistemaHabilidadesJugador
         ├─ BarraHabilidades
         ├─ PanelHabilidadesMaestrias
         ├─ ControladorEntradaHabilidades
         ├─ ObservadorProgresoMagico
         ├─ DepuradorEtapa5
         ├─ DepuradorEtapa6
         └─ DepuradorEtapa7

game.js
└─ DepuradorEtapa4
```

Además permanecían en el árbol el instalador y la integración dinámica anteriores.

## Arquitectura final

```text
game.js
├─ Aplicacion
└─ DepuradorMagiaHabilidades
   └─ darkMoonDebug.magia

Aplicacion
└─ ControladorPartida
   ├─ Juego
   └─ IntegracionHabilidadesJugador
      ├─ SistemaHabilidadesJugador
      ├─ BarraHabilidades
      ├─ PanelHabilidadesMaestrias
      ├─ ControladorEntradaHabilidades
      ├─ ObservadorProgresoMagico
      └─ PersistenciaBarraHabilidades

Jugador
└─ ProgresoMagicoJugador
   └─ única fuente de verdad de maestrías, XP, puntos y grados
```

## Archivos completos incluidos

### Creados

- `src/juego/habilidades/IntegracionHabilidadesJugador.js`
- `src/juego/habilidades/DepuradorMagiaHabilidades.js`
- `docs/magia/ENTREGA_ETAPA_7_ESPECIAL.md`
- `docs/magia/VALIDACION_MANUAL_ETAPA_7_ESPECIAL.md`
- `docs/magia/RESULTADOS_VALIDACION_ETAPA_7_ESPECIAL.md`
- `docs/magia/PROMPT_ETAPA_8.md`
- `docs/magia/Plan_Maestro_Magia_Habilidades_Maestrias_Dark_Moon_v1.9.docx`

### Modificados y entregados completos

- `game.js`
- `habilidades-maestrias.css`
- `src/aplicacion/Aplicacion.js`
- `src/aplicacion/ControladorPartida.js`
- `src/interfaz/habilidades/BarraHabilidades.js`
- `src/interfaz/habilidades/PanelHabilidadesMaestrias.js`
- `src/juego/habilidades/ControladorEntradaHabilidades.js`
- `src/juego/habilidades/EstadoSesionHabilidades.js`
- `src/juego/habilidades/ObservadorProgresoMagico.js`
- `src/juego/habilidades/PersistenciaBarraHabilidades.js`
- `src/juego/habilidades/SistemaHabilidadesJugador.js`
- `src/juego/maestrias/ContextoProgresoMagico.js`

## Resumen por archivo

- `game.js`: publica una única fachada `darkMoonDebug.magia` y conserva `darkMoonAplicacion`.
- `Aplicacion.js`: vuelve a depender del controlador canónico.
- `ControladorPartida.js`: crea y destruye una única integración funcional por mapa.
- `SistemaHabilidadesJugador.js`: incorpora la barra manual y elimina la política de autoasignación.
- `IntegracionHabilidadesJugador.js`: coordina motor, barra, panel, teclado, observación, efectos y guardado.
- `DepuradorMagiaHabilidades.js`: consolida progreso, persistencia, habilidades, catalizadores, barra, interfaz y arquitectura.
- `EstadoSesionHabilidades.js`: elimina la utilidad obsoleta de primera ranura libre.
- `ObservadorProgresoMagico.js`: usa un símbolo funcional estable.
- `PersistenciaBarraHabilidades.js`: elimina mensajes vinculados a una etapa histórica.
- `BarraHabilidades.js`: normaliza dataset y clases del selector.
- `PanelHabilidadesMaestrias.js`: conserva el panel completo y normaliza el ID funcional de su hoja de estilos.
- `ControladorEntradaHabilidades.js`: normaliza el prefijo de consola.
- `habilidades-maestrias.css`: normaliza selectores y encabezado activo.
- `ContextoProgresoMagico.js`: documenta la integración explícita vigente sin instaladores.

## Conservación de comportamiento

- La integración se destruye antes que el `Juego` anterior.
- Se limpian intervalo, observador de progreso, suscripción del sistema, teclado, barra y panel.
- La destrucción es idempotente.
- La barra sigue guardando exactamente diez IDs o `null`.
- Aprender no autoasigna.
- Quitar no desaprende ni reduce grado.
- `ProgresoMagicoJugador` sigue siendo la única fuente de progreso.
- La ejecución sigue pasando por un único `SistemaHabilidadesJugador`.
- El lanzamiento no depende del arma.
- Dos varitas no crean una segunda ejecución.
- Los contratos de catalizadores se conservan sin modificar combate ni catálogos.

## Riesgos controlados

- **Cambio de mapa:** destrucción anterior al cambio y referencia única en el controlador.
- **Listeners duplicados:** sin instalador dinámico ni segunda integración.
- **Intervalos duplicados:** intervalo cancelado y puesto en `null` al destruir.
- **Autoasignación accidental:** utilidad y llamadas retiradas del sistema canónico.
- **Depurador obsoleto tras cambio de mapa:** resolución dinámica del contexto activo.
- **Persistencia inválida:** validación contra catálogo, grado aprendido y duplicados.
- **Doble consumo:** no se modifican preparación, confirmación ni recompensa.

## Instalación

Usar `APLICAR_SANEAMIENTO_ARQUITECTONICO.ps1` desde la raíz de esta entrega. Ver `INSTRUCCIONES_APLICACION.md`.

## Conventional Commit propuesto

```text
refactor(habilidades): eliminar componentes temporales por etapa

- integrar el ciclo de habilidades en ControladorPartida
- incorporar la política definitiva de barra en SistemaHabilidadesJugador
- renombrar la integración por su responsabilidad funcional
- consolidar la depuración de magia, habilidades y catalizadores
- eliminar instaladores, subclases y APIs globales temporales
- normalizar identificadores activos de interfaz y observación
- conservar balance, persistencia y ejecución actuales

BREAKING CHANGE: los comandos darkMoonDebug.etapaN se reemplazan por darkMoonDebug.magia.
```

No se realizó commit ni push.
