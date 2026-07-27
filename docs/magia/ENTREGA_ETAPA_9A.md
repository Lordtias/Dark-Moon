# ENTREGA ETAPA 9A — Recompensas por derrotas causadas con habilidades

## Estado de la entrega

- Repositorio: `https://github.com/Lordtias/Dark-Moon.git`
- Rama solicitada: `main`
- Commit base y HEAD remoto verificado: `78797ada47cacd5814ed07a8b51bf9cf78ff4bd6c`
- Mensaje del commit base: `feat(combate): incorporar enemigos y afijos elementales`
- Commit realizado: ninguno.
- Push realizado: ninguno.
- Etapa posterior iniciada: ninguna.

La red del entorno no permitió clonar el repositorio (`Could not resolve host: github.com`). Por ese motivo, los cambios se entregan como archivos completos de reemplazo y no fueron aplicados sobre una copia Git local. El HEAD se verificó directamente en GitHub antes de preparar los archivos.

## Objetivo corregido

Al derrotar a un enemigo con una habilidad, el jugador ahora recibe las mismas consecuencias jugables que al derrotarlo con un ataque normal:

- experiencia general;
- botín;
- mensaje de derrota;
- mensajes de subida de nivel y puntos de atributo;
- retiro del enemigo de la agenda temporal.

La experiencia de maestría continúa siendo independiente y se sigue concediendo por una ejecución efectiva según el Maná consumido.

También se contemplan las muertes que suceden durante el avance temporal por un efecto periódico aplicado por el jugador.

## Archivos de producción

### Archivo nuevo

`src/juego/combate/ResolutorDerrotasJugador.js`

Responsabilidad única:

- detectar enemigos derrotados todavía no recompensados;
- retirarlos del sistema temporal;
- generar botín;
- calcular y conceder experiencia general;
- construir los mensajes de progresión;
- impedir recompensas duplicadas mediante una marca por instancia de enemigo;
- permitir reintento si una excepción interrumpe la resolución antes de completarla.

### Archivo completo para reemplazar

`src/juego/combate/SistemaCombateJugador.js`

Cambios:

- delega la resolución de una muerte al nuevo resolutor;
- conserva el flujo del ataque normal;
- expone `resolverDerrotasPendientes()` para que `Juego` procese muertes producidas por otras fuentes del jugador;
- deja de mantener una segunda implementación de botín y experiencia.

### Archivo completo para reemplazar

`src/juego/Juego.js`

Cambios:

- recoge derrotas inmediatamente antes del avance temporal, cubriendo daño directo de habilidades;
- vuelve a recoger derrotas después del avance temporal, cubriendo daño periódico;
- combina los mensajes de derrota con el resultado original de la acción;
- fuerza actualización visual cuando se procesó una derrota.

## Arquitectura anterior

```text
Ataque normal
└─ SistemaCombateJugador
   ├─ daño
   ├─ retiro temporal
   ├─ botín
   └─ experiencia general

Habilidad
└─ SistemaHabilidadesJugador
   ├─ daño
   ├─ cierre temporal
   └─ experiencia de maestría

Efecto periódico
└─ CoordinadorTiempoPartida
   ├─ daño periódico
   └─ retiro temporal
```

La experiencia general y el botín estaban incrustados únicamente en el ataque normal.

## Arquitectura final

```text
Ataque normal ───────────────┐
Habilidad directa ───────────┼─> ResolutorDerrotasJugador
Efecto periódico del jugador ┘   ├─ retiro temporal
                                 ├─ botín
                                 ├─ experiencia general
                                 ├─ progresión de nivel
                                 └─ protección contra duplicados

Ejecución efectiva de habilidad ─> experiencia de maestría
```

No se creó un motor alternativo de daño, botín, progresión ni efectos temporales.

## Instalación y reemplazo

Antes de copiar los archivos, desde la raíz de tu repositorio ejecutá:

```bash
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short
```

La rama debe ser `main`. El SHA esperado al preparar esta entrega era:

```text
78797ada47cacd5814ed07a8b51bf9cf78ff4bd6c
```

Si el HEAD cambió, compará primero los tres archivos afectados y no reemplaces a ciegas.

Copiá el contenido del paquete manteniendo las rutas:

1. Agregar `src/juego/combate/ResolutorDerrotasJugador.js`.
2. Reemplazar completamente `src/juego/combate/SistemaCombateJugador.js`.
3. Reemplazar completamente `src/juego/Juego.js`.

No se elimina ningún archivo.

Después de copiar:

```bash
git status --short
git diff --check
git diff --stat
git diff -- src/juego/Juego.js
git diff -- src/juego/combate/SistemaCombateJugador.js
git diff -- src/juego/combate/ResolutorDerrotasJugador.js
```

El estado esperado es equivalente a:

```text
 M src/juego/Juego.js
 M src/juego/combate/SistemaCombateJugador.js
?? src/juego/combate/ResolutorDerrotasJugador.js
```

## Pruebas manuales dentro del juego

Ejecutar sobre una partida nueva o un estado que pueda descartarse.

1. **Ataque normal mortal**
   - Debe mostrar derrota, experiencia general y botín cuando corresponda.
   - La recompensa debe aparecer una sola vez.

2. **Ascua mortal**
   - Debe bajar la Vida visual del enemigo a cero.
   - Debe entregar experiencia general.
   - Debe entregar experiencia de maestría de Fuego.
   - Debe mostrar derrota y botín cuando corresponda.

3. **Esquirla de hielo, Chispa y Aguijón tóxico mortales**
   - Repetir el criterio anterior para Frío, Rayo y Veneno.

4. **Habilidad que no mata**
   - Debe entregar experiencia de maestría por ejecución efectiva.
   - No debe entregar experiencia general ni botín.

5. **Muerte por daño periódico**
   - Aplicar Aguijón tóxico sin matar con el impacto inicial.
   - Dejar al enemigo con Vida suficiente para morir en un tick posterior.
   - Al morir por el tick debe entregar experiencia general y botín una sola vez.

6. **Subida de nivel mediante habilidad**
   - Dejar al personaje cerca del siguiente nivel.
   - Matar con una habilidad.
   - Verificar nivel, experiencia restante, punto de atributo y punto universal.

7. **Ausencia de duplicación**
   - Después de una muerte, esperar varios turnos.
   - La experiencia total y la cantidad de botín no deben volver a aumentar por ese enemigo.

8. **Destructible no enemigo**
   - Destruir un objeto del mapa con un ataque compatible.
   - No debe conceder experiencia ni botín de enemigo.

9. **Flujo visual completo**
   - Confirmar barra de Vida enemiga, desaparición o estado de derrota, mensajes, panel del personaje, barra de experiencia, botín en suelo y continuidad del turno.

## Comandos deterministas para la consola del navegador

### 1. Contratos previos

Con una partida activa:

```javascript
const validacionBase = darkMoonDebug.magia.validarTodo();
console.table(
  Object.entries(validacionBase.resultados).map(([sistema, resultado]) => ({
    sistema,
    aprobado: resultado.aprobado,
  })),
);
console.assert(validacionBase.aprobado, "Fallaron contratos mágicos previos.");
```

### 2. Muerte directa con Ascua

Precondiciones: Ascua aprendida y un enemigo vivo dentro del alcance de la habilidad.

```javascript
(() => {
  const app = globalThis.darkMoonAplicacion;
  const dbg = globalThis.darkMoonDebug.magia;
  const juego = app?.controladorPartida?.juego;
  const jugador = juego?.player ?? juego?.jugador;

  console.assert(juego && jugador, "Iniciá una partida antes de probar.");

  const enemigo = dbg.habilidades
    .obtenerEnemigosVivos()
    .sort((a, b) =>
      Math.max(Math.abs(a.x - jugador.x), Math.abs(a.y - jugador.y)) -
      Math.max(Math.abs(b.x - jugador.x), Math.abs(b.y - jugador.y)),
    )[0];

  console.assert(enemigo, "No hay enemigos vivos.");

  const asignaciones = dbg.barra.obtenerAsignaciones();
  let ranuraAscua = asignaciones.indexOf("ascua") + 1;
  if (ranuraAscua === 0) {
    dbg.barra.asignar(1, "ascua");
    ranuraAscua = 1;
  }
  dbg.habilidades.establecerManaActualParaPrueba(
    jugador.manaMaximo ?? jugador.manaMaxima ?? 999,
  );
  dbg.habilidades.configurarTiradasDeterministas({
    impacto: [1],
    critico: [100],
  });

  const antes = {
    experienciaGeneral: jugador.experiencia,
    experienciaGeneralTotal: jugador.experienciaTotal,
    nivel: jugador.nivel,
    experienciaMaestria:
      dbg.habilidades.obtenerInstantaneaEjecucion().maestrias.fuego
        .experienciaTotal,
    interactuables: juego.interactuables.length,
  };

  enemigo.vidaActual = 1;
  dbg.habilidades.seleccionarPorRanura(ranuraAscua);
  const seleccion = dbg.habilidades.fijarSelector(enemigo.x, enemigo.y);
  console.assert(seleccion.exito !== false, seleccion.mensaje);

  const resultado = dbg.habilidades.confirmar();
  const despues = {
    experienciaGeneral: jugador.experiencia,
    experienciaGeneralTotal: jugador.experienciaTotal,
    nivel: jugador.nivel,
    experienciaMaestria:
      dbg.habilidades.obtenerInstantaneaEjecucion().maestrias.fuego
        .experienciaTotal,
    interactuables: juego.interactuables.length,
  };

  console.assert(enemigo.estaDestruido, "Ascua no derrotó al enemigo.");
  console.assert(
    despues.experienciaGeneralTotal > antes.experienciaGeneralTotal,
    "No aumentó la experiencia general total.",
  );
  console.assert(
    despues.experienciaMaestria > antes.experienciaMaestria,
    "No aumentó la experiencia de maestría de Fuego.",
  );
  console.assert(
    resultado.mensaje?.includes("puntos de experiencia"),
    "El resultado no informó la experiencia general.",
  );

  const experienciaTrasMuerte = jugador.experienciaTotal;
  const segundaResolucion =
    juego.sistemaCombateJugador.resolverDerrotasPendientes();
  console.assert(
    segundaResolucion.cantidadProcesada === 0,
    "La misma derrota se procesó más de una vez.",
  );
  console.assert(
    jugador.experienciaTotal === experienciaTrasMuerte,
    "La experiencia general se duplicó.",
  );

  dbg.habilidades.restaurarTiradasAleatorias();
  console.table({ antes, despues });
  console.log(resultado);
  return { antes, despues, resultado, segundaResolucion };
})();
```

### 3. Habilidad efectiva que no mata

Precondiciones: un enemigo vivo dentro del alcance. El comando limita temporalmente el daño para garantizar que sobreviva con al menos 1 de Vida y restaura el método original al terminar.

```javascript
(() => {
  const dbg = globalThis.darkMoonDebug.magia;
  const juego = globalThis.darkMoonAplicacion.controladorPartida.juego;
  const jugador = juego.player ?? juego.jugador;
  const enemigo = dbg.habilidades.obtenerEnemigosVivos()[0];

  console.assert(enemigo, "No hay enemigos vivos.");

  const asignaciones = dbg.barra.obtenerAsignaciones();
  let ranuraAscua = asignaciones.indexOf("ascua") + 1;
  if (ranuraAscua === 0) {
    dbg.barra.asignar(1, "ascua");
    ranuraAscua = 1;
  }

  dbg.habilidades.establecerManaActualParaPrueba(
    jugador.manaMaximo ?? jugador.manaMaxima ?? 999,
  );
  dbg.habilidades.configurarTiradasDeterministas({
    impacto: [1],
    critico: [100],
  });

  const experienciaGeneralAntes = jugador.experienciaTotal;
  const maestriaAntes =
    dbg.habilidades.obtenerInstantaneaEjecucion().maestrias.fuego
      .experienciaTotal;
  const recibirDanioOriginal = enemigo.recibirDanio;

  enemigo.recibirDanio = function recibirDanioSinMatar(cantidad, ...resto) {
    const permitido = Math.min(
      Math.max(0, Math.floor(cantidad)),
      Math.max(0, this.vidaActual - 1),
    );
    return recibirDanioOriginal.call(this, permitido, ...resto);
  };

  let resultado;
  try {
    dbg.habilidades.seleccionarPorRanura(ranuraAscua);
    dbg.habilidades.fijarSelector(enemigo.x, enemigo.y);
    resultado = dbg.habilidades.confirmar();
  } finally {
    enemigo.recibirDanio = recibirDanioOriginal;
    dbg.habilidades.restaurarTiradasAleatorias();
  }

  const experienciaGeneralDespues = jugador.experienciaTotal;
  const maestriaDespues =
    dbg.habilidades.obtenerInstantaneaEjecucion().maestrias.fuego
      .experienciaTotal;

  console.assert(enemigo.estaVivo, "La prueba necesitaba que sobreviviera.");
  console.assert(
    experienciaGeneralDespues === experienciaGeneralAntes,
    "Se entregó experiencia general sin una derrota.",
  );
  console.assert(
    maestriaDespues > maestriaAntes,
    "No aumentó la experiencia de maestría.",
  );

  console.log(resultado);
  return {
    experienciaGeneralAntes,
    experienciaGeneralDespues,
    maestriaAntes,
    maestriaDespues,
  };
})();
```

### 4. Muerte por efecto periódico de Aguijón tóxico

Precondiciones: Aguijón tóxico aprendido y un enemigo vivo dentro de alcance. El impacto inicial se limita para que no mate; después se restaura el daño normal y se esperan acciones hasta el siguiente tick mortal. Ejecutar en una partida descartable.

```javascript
(() => {
  const dbg = globalThis.darkMoonDebug.magia;
  const juego = globalThis.darkMoonAplicacion.controladorPartida.juego;
  const jugador = juego.player ?? juego.jugador;
  const enemigo = dbg.habilidades.obtenerEnemigosVivos()[0];

  console.assert(enemigo, "No hay enemigos vivos.");

  const asignaciones = dbg.barra.obtenerAsignaciones();
  let ranuraVeneno = asignaciones.indexOf("aguijon_toxico") + 1;
  if (ranuraVeneno === 0) {
    const ranuraLibre = asignaciones.findIndex((id) => !id) + 1 || 1;
    dbg.barra.asignar(ranuraLibre, "aguijon_toxico");
    ranuraVeneno = ranuraLibre;
  }

  dbg.habilidades.establecerManaActualParaPrueba(
    jugador.manaMaximo ?? jugador.manaMaxima ?? 999,
  );
  dbg.habilidades.configurarTiradasDeterministas({
    impacto: [1],
    critico: [100],
  });

  const recibirDanioOriginal = enemigo.recibirDanio;
  enemigo.recibirDanio = function recibirDanioSinMatar(cantidad, ...resto) {
    const permitido = Math.min(
      Math.max(0, Math.floor(cantidad)),
      Math.max(0, this.vidaActual - 1),
    );
    return recibirDanioOriginal.call(this, permitido, ...resto);
  };

  const experienciaAntes = jugador.experienciaTotal;
  let resultadoLanzamiento;
  try {
    dbg.habilidades.seleccionarPorRanura(ranuraVeneno);
    dbg.habilidades.fijarSelector(enemigo.x, enemigo.y);
    resultadoLanzamiento = dbg.habilidades.confirmar();
  } finally {
    enemigo.recibirDanio = recibirDanioOriginal;
    dbg.habilidades.restaurarTiradasAleatorias();
  }

  const efectos = dbg.habilidades.obtenerEfectosActivos(enemigo);
  console.assert(enemigo.estaVivo, "El impacto inicial no debía matar.");
  console.assert(efectos.length > 0, "No quedó un efecto periódico activo.");
  console.assert(
    jugador.experienciaTotal === experienciaAntes,
    "Se entregó experiencia general antes de la muerte.",
  );

  enemigo.vidaActual = 1;
  const resultadosEspera = [];
  for (let intento = 0; intento < 30 && enemigo.estaVivo; intento++) {
    const resultadoEspera = juego.esperarTurno();
    resultadosEspera.push(resultadoEspera);
    if (resultadoEspera.turnoConsumido === false) {
      console.warn(
        "La espera fue bloqueada. Resolvé el estado indicado y repetí la prueba.",
        resultadoEspera,
      );
      break;
    }
  }

  console.assert(!enemigo.estaVivo, "El efecto periódico no derrotó al enemigo.");
  console.assert(
    jugador.experienciaTotal > experienciaAntes,
    "La muerte periódica no entregó experiencia general.",
  );

  const experienciaTrasMuerte = jugador.experienciaTotal;
  const repetida = juego.sistemaCombateJugador.resolverDerrotasPendientes();
  console.assert(
    repetida.cantidadProcesada === 0 &&
      jugador.experienciaTotal === experienciaTrasMuerte,
    "La muerte periódica se recompensó más de una vez.",
  );

  return {
    resultadoLanzamiento,
    efectos,
    resultadosEspera,
    experienciaAntes,
    experienciaDespues: jugador.experienciaTotal,
    repetida,
  };
})();
```

### 5. Protección contra duplicados

Después de matar a un enemigo con una habilidad:

```javascript
(() => {
  const juego = globalThis.darkMoonAplicacion.controladorPartida.juego;
  const jugador = juego.player ?? juego.jugador;
  const experienciaAntes = jugador.experienciaTotal;

  const primera = juego.sistemaCombateJugador.resolverDerrotasPendientes();
  const segunda = juego.sistemaCombateJugador.resolverDerrotasPendientes();

  console.assert(
    primera.cantidadProcesada === 0 && segunda.cantidadProcesada === 0,
    "Quedó una derrota ya recompensada pendiente.",
  );
  console.assert(
    jugador.experienciaTotal === experienciaAntes,
    "Una derrota volvió a conceder experiencia.",
  );

  return { experienciaAntes, experienciaDespues: jugador.experienciaTotal };
})();
```

### 6. Verificación estructural desde la instancia real

```javascript
(() => {
  const juego = globalThis.darkMoonAplicacion.controladorPartida.juego;
  const combate = juego.sistemaCombateJugador;
  const resolutor = combate.resolutorDerrotasJugador;

  const comprobaciones = {
    existeResolutor: resolutor?.constructor?.name === "ResolutorDerrotasJugador",
    combateDelegaDerrotas:
      typeof combate.resolverDerrotasPendientes === "function",
    juegoCierraResultados:
      typeof juego.finalizarResultadoAccionJugador === "function",
    juegoCierraAcciones: typeof juego.finalizarAccionJugador === "function",
    marcaIdempotente: resolutor?.enemigosProcesados instanceof WeakSet,
  };

  console.table(comprobaciones);
  console.assert(
    Object.values(comprobaciones).every(Boolean),
    "La integración de derrotas no está completa.",
  );
  return comprobaciones;
})();
```

## Validaciones realizadas en esta entrega

Se completaron sin Node.js ni dependencias externas:

- inspección del flujo real de imports y llamadas entre `Juego`, combate, habilidades, coordinador temporal, botín y progresión;
- comprobación de balance de llaves, paréntesis y corchetes en los tres archivos completos;
- comprobación de cierre de cadenas, plantillas y comentarios mediante análisis léxico local;
- comprobación de las rutas importadas por el archivo nuevo contra módulos ya utilizados por el código base;
- comprobación de presencia de los puntos de integración para daño directo y daño periódico;
- comprobación de ausencia de `.mjs`, `.patch`, `node:test` y referencias a Node.js;
- comprobación de ausencia de nombres de etapa en rutas y archivos de producción.

Resultado de validación estática: aprobado.

No fue posible ejecutar el juego en un navegador dentro de este entorno porque no se obtuvo una copia completa del repositorio: la clonación fue bloqueada por resolución DNS. Por lo tanto, las pruebas manuales de interfaz y los comandos de consola quedan expresamente pendientes de ejecución sobre tu copia local. No se declaran falsamente como aprobadas.

## Criterios comprobados por flujo

- El ataque normal conserva una única recompensa.
- Una muerte directa por habilidad es recogida antes de avanzar el tiempo.
- Una muerte por efecto periódico es recogida al regresar del coordinador temporal.
- El mismo objeto enemigo no puede ser recompensado dos veces.
- La experiencia de maestría no fue movida ni reemplazada.
- Los destructibles que no son `Enemigo` no entran al resolutor.
- Botín y experiencia general usan las funciones canónicas existentes.

## Riesgos pendientes

1. La comprobación visual completa debe realizarse en tu navegador local.
2. El modelo actual no conserva una atribución histórica de la última fuente de daño dentro de `Destructible`. La solución recompensa enemigos derrotados detectados durante el cierre de una acción del jugador. En el juego actual no se identificó fuego amigo ni daño ambiental autónomo contra enemigos; si se incorpora en el futuro, convendrá registrar explícitamente la fuente de la muerte.
3. Si `main` cambió después del SHA verificado, debe hacerse una integración manual antes de reemplazar los archivos.

## Ausencia de nombres de etapa en producción

Los archivos de producción entregados se llaman:

```text
src/juego/Juego.js
src/juego/combate/SistemaCombateJugador.js
src/juego/combate/ResolutorDerrotasJugador.js
```

Ninguno contiene `Etapa9`, `Etapa9A`, `ETAPA_9A` ni nombres temporales equivalentes en su ruta o nombre de clase.

## Restricciones confirmadas

- No se creó `.patch`.
- No se creó `.mjs`.
- No se utilizó Node.js.
- No se utilizó `node:test`.
- No se instalaron dependencias, librerías, runtimes ni frameworks.
- Los archivos de producción se entregan completos.
- No se realizó commit.
- No se realizó push.
- No se inició la ETAPA 10.
