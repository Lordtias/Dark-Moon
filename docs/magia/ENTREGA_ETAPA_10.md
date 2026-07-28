# ENTREGA ETAPA 10 — Habilidades intermedias y geometría reutilizable

## 1. Estado de la entrega

- Repositorio: `https://github.com/Lordtias/Dark-Moon.git`
- Rama solicitada: `main`
- Commit base verificado: `5e0a0ad624d2baab574bae60aadb9a69eb51744e`
- Mensaje del commit base: `fix(habilidades): otorgar recompensas por enemigos derrotados`
- HEAD de la copia de trabajo al finalizar: `5e0a0ad624d2baab574bae60aadb9a69eb51744e`
- Commit realizado: ninguno.
- Push realizado: ninguno.
- Etapa posterior iniciada: ninguna.

La implementación se realizó sobre una copia de trabajo Git limpia creada desde el historial incluido en `Dark-Moon-9A.zip`. El ZIP original convirtió finales de línea a CRLF, pero la comparación ignorando finales de línea confirmó que su contenido coincidía con el commit base. La copia de implementación usa archivos LF y permanece sin commit.

## 2. Objetivo cumplido

Quedaron jugables las cuatro habilidades intermedias:

- Explosión ígnea;
- Nova de escarcha;
- Cadena de rayos;
- Nube tóxica.

Las cuatro:

- requieren nivel 3 de su maestría;
- admiten exactamente tres grados;
- consumen Maná y tiempo una sola vez por lanzamiento;
- conceden experiencia de maestría una sola vez y en proporción al Maná consumido;
- pueden afectar varios objetivos mediante una geometría configurable;
- reutilizan los motores canónicos de impacto, crítico, daño, resistencias, efectos temporales, tiempo, recompensas, experiencia general y botín;
- no requieren un arma concreta para lanzarse.

Nube tóxica no crea todavía una zona persistente. En esta etapa aplica envenenamiento a los objetivos presentes dentro del área al momento del lanzamiento. La persistencia espacial queda expresamente reservada para una futura ETAPA 10A.

## 3. División aplicada

### Bloque 10.1 — Configuración y contrato

`Habilidades.json` ahora diferencia:

- el tipo de objetivo seleccionado;
- el patrón usado para alcanzar la selección;
- la forma final de impacto.

Formas implementadas:

- `individual`;
- `radio`;
- `cadena`.

El contrato permite agregar más adelante formas como línea, cono, cruz o anillo sin crear un motor por habilidad.

### Bloque 10.2 — Visualización genérica

La escena gráfica recibe listas independientes de:

- casillas seleccionables;
- casillas afectadas;
- objetivos afectados;
- recorrido ordenado.

Canvas muestra el rango, el área, los objetivos y los saltos sin conocer nombres de habilidades.

### Bloque 10.3 — Mecánicas

El sistema resuelve una lista ordenada de objetivos. Cada objetivo obtiene su propia tirada de impacto, crítico, resistencia, daño y efectos, mientras que Maná, tiempo y experiencia de maestría se procesan una sola vez por ejecución.

## 4. Comportamiento por habilidad

### Explosión ígnea

- Selección: casilla libre a distancia.
- Forma: radio alrededor de la casilla elegida.
- Contenido: daño de Fuego a cada objetivo.
- Radio: 1 en grados 1 y 2; 2 en grado 3.
- Cada objetivo resuelve impacto, crítico y resistencia de manera independiente.

### Nova de escarcha

- Selección: centrada automáticamente en el jugador.
- Forma: radio alrededor del lanzador.
- Contenido: daño de Frío y ralentización de movimiento.
- Radio: 1 en grados 1 y 2; 2 en grado 3.

### Cadena de rayos

- Selección: enemigo primario.
- Forma: cadena determinista.
- Contenido: daño de Rayo y electrización temporal.
- Máximo de objetivos: 2, 3 y 4 según el grado.
- El daño disminuye por salto mediante `factorDanioPorSalto`.
- No golpea dos veces al mismo objetivo.
- Los empates se resuelven por distancia, coordenada Y y coordenada X.

### Nube tóxica

- Selección: casilla libre a distancia.
- Forma: radio alrededor de la casilla elegida.
- Contenido: solamente efecto periódico de Veneno.
- No necesita un componente de daño directo.
- Radio: 1 en grados 1 y 2; 2 en grado 3.
- No permanece sobre el mapa después del lanzamiento.

## 5. Archivos modificados y nuevos

### Modificados

#### `src/config/magia/Habilidades.json`

- incrementa la versión del catálogo de 3 a 4;
- activa las cuatro habilidades intermedias;
- declara sus tres grados, costes, alcance, daño, efectos y geometría;
- mantiene requisito 3 y máximo 3;
- no agrega configuraciones paralelas.

#### `src/juego/habilidades/ValidadorConfiguracionEjecucionHabilidades.js`

- normaliza `individual` como forma por defecto para habilidades existentes;
- valida radio, cadena, cantidad máxima, alcance de salto y factor por salto;
- admite habilidades con solo daño, daño más efectos o solamente efectos;
- rechaza grados sin contenido ejecutable.

#### `src/juego/habilidades/SistemaHabilidadesJugador.js`

- reemplaza la resolución de un único objetivo por un plan de múltiples objetivos;
- prevalidación completa antes de consumir recursos;
- Maná, tiempo y experiencia de maestría una vez por lanzamiento;
- impacto, crítico, daño, resistencia y efectos por objetivo;
- preserva el resolutor canónico de derrotas de `Juego`;
- expone la vista previa completa para interfaz y depuración.

#### `src/juego/habilidades/MotorDanioHabilidad.js`

- agrega una resolución canónica de impacto sin daño directo;
- permite que una habilidad de solo efectos use precisión y evasión sin inventar daño ficticio;
- Nube tóxica utiliza esta vía y no puede realizar crítico porque no posee daño directo.

#### `src/juego/habilidades/DepuradorMagiaHabilidades.js`

- incorpora las cuatro habilidades intermedias a las validaciones;
- permite preparar de forma reproducible una habilidad y un grado para pruebas;
- expone catálogo, geometría, objetivos, recorrido y ejecución activa.

#### `src/interfaz/Renderizador.js`

- conserva selector, rango, área, objetivos y recorrido como estado visual genérico.

#### `src/interfaz/graficos/AdaptadorEscenaJuego.js`

- transforma el estado de habilidades al contrato plano del backend gráfico;
- distingue el modo visual `habilidad` de combate e interacción.

#### `src/interfaz/graficos/RenderizadorCanvas2D.js`

- dibuja rango de lanzamiento;
- dibuja área afectada;
- dibuja recorrido de cadena;
- destaca objetivos afectados;
- mantiene el selector válido o inválido existente.

### Nuevo de producción

#### `src/juego/habilidades/GeometriaHabilidades.js`

Responsabilidad única:

- evaluar la selección mediante el sistema canónico de alcance;
- calcular casillas seleccionables;
- calcular formas individual, radio y cadena;
- ordenar objetivos de forma determinista;
- devolver la misma vista previa que luego utiliza la ejecución.

No conoce nombres concretos de habilidades ni aplica daño, efectos, tiempo o recompensas.

### Nuevo de documentación

#### `docs/magia/ENTREGA_ETAPA_10.md`

Registra la implementación, instalación, arquitectura, pruebas, resultados, comandos y riesgos.

## 6. Arquitectura anterior

```text
SistemaHabilidadesJugador
├─ selecciona una casilla
├─ encuentra un objetivo
├─ resuelve un daño
├─ aplica efectos a ese objetivo
├─ consume Maná y tiempo
└─ concede experiencia de maestría

Renderizador
└─ muestra una única casilla seleccionada
```

## 7. Arquitectura final

```text
Habilidades.json
└─ selección + forma de impacto + contenido por grado

GeometriaHabilidades
├─ individual
├─ radio
└─ cadena

SistemaHabilidadesJugador
├─ calcula un plan completo
├─ prevalida todos los objetivos
├─ consume Maná una vez
├─ resuelve cada objetivo con motores canónicos
├─ consume tiempo una vez
└─ concede experiencia de maestría una vez

Juego
└─ ResolutorDerrotasJugador
   ├─ experiencia general por enemigo
   ├─ botín por enemigo
   └─ protección contra duplicados

Renderizador / Adaptador / Canvas
├─ rango
├─ área
├─ objetivos
├─ recorrido
└─ selector
```

No se creó un motor de Explosión, Nova, Cadena o Nube. Tampoco se creó un motor alternativo de recompensas, efectos, combate o tiempo.

## 8. Instalación y reemplazo

Desde la raíz del repositorio local:

```bash
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short
```

La rama esperada es `main` y el commit base utilizado fue:

```text
5e0a0ad624d2baab574bae60aadb9a69eb51744e
```

Si existen cambios locales, conservarlos y comparar antes de reemplazar archivos. No ejecutar `git reset`, `git clean`, `git checkout` ni `git restore` masivo.

Copiar el paquete manteniendo las rutas. Reemplazar completamente los ocho archivos modificados y agregar los dos archivos nuevos. No eliminar archivos.

Después de copiar:

```bash
git status --short
git diff --check
git diff --stat
git diff -- src/config/magia/Habilidades.json
git diff -- src/juego/habilidades/GeometriaHabilidades.js
git diff -- src/juego/habilidades/SistemaHabilidadesJugador.js
git diff -- src/interfaz/graficos/RenderizadorCanvas2D.js
```

Estado esperado:

```text
 M src/config/magia/Habilidades.json
 M src/interfaz/Renderizador.js
 M src/interfaz/graficos/AdaptadorEscenaJuego.js
 M src/interfaz/graficos/RenderizadorCanvas2D.js
 M src/juego/habilidades/DepuradorMagiaHabilidades.js
 M src/juego/habilidades/MotorDanioHabilidad.js
 M src/juego/habilidades/SistemaHabilidadesJugador.js
 M src/juego/habilidades/ValidadorConfiguracionEjecucionHabilidades.js
?? docs/magia/ENTREGA_ETAPA_10.md
?? src/juego/habilidades/GeometriaHabilidades.js
```

## 9. Validación realizada

### Entorno

- carga de módulos ES en Chromium;
- partida real creada desde la interfaz y clases activas del juego;
- DOM real de barra, paneles y registro;
- backend Canvas real con escena y dimensiones activas;
- CSS local inyectado en el documento de prueba debido a que la política del navegador del entorno bloqueaba servir el repositorio mediante una URL local;
- no se utilizó Node.js, `node:test`, paquetes ni dependencias instaladas.

Los sprites externos no se evaluaron píxel por píxel porque el navegador de automatización no podía cargar rutas locales de recursos. La lógica visual, el DOM, las dimensiones Canvas y el contrato completo de escena sí fueron comprobados.

### Matriz de las doce ejecuciones

| Habilidad | Grado | Maná | Tiempo | Objetivos esperados | Área o recorrido | Resultado |
|---|---:|---:|---:|---:|---:|---|
| Explosión ígnea | 1 | 6 | 105 | 4 | 9 casillas | aprobado |
| Explosión ígnea | 2 | 8 | 102 | 4 | 9 casillas | aprobado |
| Explosión ígnea | 3 | 10 | 100 | 4 | 25 casillas | aprobado |
| Nova de escarcha | 1 | 6 | 110 | 4 | 9 casillas | aprobado |
| Nova de escarcha | 2 | 8 | 108 | 4 | 9 casillas | aprobado |
| Nova de escarcha | 3 | 10 | 105 | 4 | 25 casillas | aprobado |
| Cadena de rayos | 1 | 5 | 95 | 2 | 2 saltos | aprobado |
| Cadena de rayos | 2 | 7 | 92 | 3 | 3 saltos | aprobado |
| Cadena de rayos | 3 | 9 | 90 | 4 | 4 saltos | aprobado |
| Nube tóxica | 1 | 6 | 100 | 4 | 9 casillas | aprobado |
| Nube tóxica | 2 | 8 | 98 | 4 | 9 casillas | aprobado |
| Nube tóxica | 3 | 10 | 95 | 4 | 25 casillas | aprobado |

En las doce pruebas:

- el resultado informó exactamente el Maná configurado;
- la experiencia de maestría ganada coincidió con el Maná consumido;
- el tiempo consumido coincidió con el grado;
- cada objetivo obtuvo una resolución separada;
- Nova, Cadena y Nube dejaron sus efectos temporales activos en todos los objetivos impactados;
- Nube registró `danio: null` y un efecto periódico por objetivo.

### Crítico y resistencias

- Explosión grado 1, misma tirada y resistencia efectiva 0 %: 11 de daño.
- Explosión grado 1, misma tirada y resistencia efectiva 75 %: 2 de daño.
- Tirada no crítica: 11 de daño.
- Tirada crítica forzada: 16 de daño.
- Resultado: aprobado.

### Casos fallidos

| Caso | Motivo obtenido | Maná, tiempo o XP consumidos | Resultado |
|---|---|---|---|
| Sin Maná | `MANA_INSUFICIENTE` | no | aprobado |
| Área sin objetivo válido | `OBJETIVO_INVALIDO` | no | aprobado |
| Casilla fuera de alcance | `FUERA_DE_ALCANCE` | no | aprobado |
| Maestría por debajo de 3 | `NIVEL_MAESTRIA_INSUFICIENTE` | no | aprobado |
| Intento de grado 4 | `GRADO_MAXIMO_ALCANZADO` | no | aprobado |

### Armas y potencia de Habilidad

- Con varita equipada: potencia de Habilidad 8 %.
- Sin arma ni secundaria: potencia de Habilidad 0 %.
- Explosión se ejecutó correctamente sin arma.
- El resultado utilizó 0 % de potencia después de retirar la varita.
- Resultado: aprobado.

### Recompensas por derrota

#### Daño directo con Explosión

- cuatro enemigos derrotados;
- experiencia general aumentó;
- botín en el suelo aumentó;
- dos llamadas posteriores al resolutor devolvieron `cantidadProcesada: 0`;
- experiencia y botín permanecieron estables.

#### Daño periódico con Nube tóxica

- cuatro enemigos afectados sin daño directo;
- cuatro muertes por efecto periódico;
- experiencia general y botín aumentaron;
- dos llamadas posteriores al resolutor devolvieron `cantidadProcesada: 0`;
- experiencia y botín permanecieron estables.

#### Regresión de ataque normal

- enemigo derrotado mediante ataque natural;
- experiencia general aumentó una sola vez;
- botín aumentó una sola vez;
- una llamada posterior procesó cero derrotas.

### Regresiones de habilidades básicas

- Ascua grado 1 impactó un objetivo y causó daño.
- Aguijón tóxico grado 1 causó daño directo y dejó activo `danio_periodico`.
- `darkMoonDebug.magia.validarTodo()` devolvió `aprobado: true`.
- Sigue existiendo una integración, un sistema, una barra, un panel, una entrada y un sistema temporal de efectos activos.

### Interfaz

Durante la selección de Explosión grado 3:

- 81 casillas seleccionables en el mapa concreto de prueba;
- 25 casillas de área;
- tres objetivos visibles dentro del área;
- modo de escena `habilidad`;
- selector válido;
- ranura marcada como seleccionada;
- Canvas activo de 672 × 384 en la prueba final.

Después de confirmar:

- la selección visual se limpió;
- la Vida del objetivo disminuyó;
- el texto y el ancho de la barra de Maná coincidieron con el modelo después del coste y la regeneración temporal;
- nivel, experiencia y puntos permanecieron visibles;
- el resultado produjo mensajes normalizables por el registro.

Cadena grado 3 entregó al renderizador un recorrido ordenado de cuatro pasos, idéntico al usado por la ejecución.

## 10. Comandos deterministas para consola

### 10.1 Contratos generales

```javascript
const validacion = darkMoonDebug.magia.validarTodo();
console.table(
  Object.entries(validacion.resultados).map(([sistema, resultado]) => ({
    sistema,
    aprobado: resultado.aprobado,
  })),
);
console.assert(validacion.aprobado, "Fallaron contratos del sistema mágico.");
```

### 10.2 Preparar una habilidad y un grado

Con una partida activa:

```javascript
function prepararHabilidad({ idHabilidad, grado, ranura = 1 }) {
  const dbg = darkMoonDebug.magia;
  const juego = darkMoonAplicacion.controladorPartida.juego;
  const jugador = juego.jugador ?? juego.player;

  const preparada = dbg.progreso.prepararHabilidadParaPrueba({
    idHabilidad,
    grado,
  });
  console.assert(preparada.exito, "No se pudo preparar la habilidad.");

  dbg.barra.vaciar();
  dbg.barra.asignar(ranura, idHabilidad);
  dbg.habilidades.establecerManaActualParaPrueba(
    jugador.manaMaximo ?? jugador.manaMaxima ?? 99,
  );
  dbg.habilidades.configurarTiradasDeterministas({
    impacto: Array(12).fill(1),
    critico: Array(12).fill(100),
  });
  dbg.habilidades.seleccionarPorRanura(ranura);
  return dbg.habilidades.obtenerSeleccion();
}
```

Ejemplos:

```javascript
prepararHabilidad({ idHabilidad: "explosion_ignea", grado: 3 });
prepararHabilidad({ idHabilidad: "nova_escarcha", grado: 3 });
prepararHabilidad({ idHabilidad: "cadena_rayos", grado: 3 });
prepararHabilidad({ idHabilidad: "nube_toxica", grado: 3 });
```

### 10.3 Comprobar rango, área y objetivos

Después de seleccionar la habilidad, mover el selector desde el juego o fijar una casilla conocida:

```javascript
const vista = darkMoonDebug.magia.habilidades.fijarSelector(10, 8);
console.table({
  puedeEjecutar: vista.geometria.puedeEjecutar,
  seleccionables: vista.casillasSeleccionables.length,
  casillasAfectadas: vista.casillasAfectadas.length,
  objetivosAfectados: vista.objetivosAfectados.length,
  saltos: vista.recorrido.length,
});
console.table(vista.objetivosAfectados);
console.table(vista.recorrido);
```

Para Nova, la posición se corrige automáticamente a la del jugador.

### 10.4 Confirmar y comprobar recursos

```javascript
const dbg = darkMoonDebug.magia;
const antes = dbg.habilidades.obtenerInstantaneaEjecucion();
const resultado = dbg.habilidades.confirmar();
const despues = dbg.habilidades.obtenerInstantaneaEjecucion();

console.log(resultado);
console.assert(resultado.exito, resultado.mensaje);
console.assert(
  resultado.experienciaMaestria.experienciaGanada === resultado.manaConsumido,
  "La experiencia de maestría no coincide con el Maná consumido.",
);
console.table({
  manaInformado: resultado.manaConsumido,
  costoTemporal: resultado.costoTemporal,
  objetivos: resultado.cantidadObjetivos,
  impactos: resultado.cantidadImpactos,
  criticos: resultado.cantidadCriticos,
  tiempoAntes: antes.tiempoActual,
  tiempoDespues: despues.tiempoActual,
});
```

La diferencia neta de Maná visible puede ser menor que el coste informado si durante el avance temporal se produce regeneración. El campo `manaConsumido` registra el coste atómico antes de esa regeneración.

### 10.5 Crítico determinista

```javascript
darkMoonDebug.magia.habilidades.configurarTiradasDeterministas({
  impacto: [1, 1, 1, 1],
  critico: [1, 100, 100, 100],
});
```

El primer objetivo debe informar `critico: true` y los restantes `false`.

### 10.6 Sin Maná

```javascript
darkMoonDebug.magia.habilidades.establecerManaActualParaPrueba(0);
const antes = darkMoonDebug.magia.habilidades.obtenerInstantaneaEjecucion();
const resultado = darkMoonDebug.magia.habilidades.confirmar();
const despues = darkMoonDebug.magia.habilidades.obtenerInstantaneaEjecucion();

console.assert(!resultado.exito, "La ejecución debió fallar.");
console.assert(resultado.motivo === "MANA_INSUFICIENTE", resultado.motivo);
console.assert(antes.manaActual === despues.manaActual, "Cambió el Maná.");
console.assert(antes.tiempoActual === despues.tiempoActual, "Cambió el tiempo.");
```

### 10.7 Recompensas únicas

Después de provocar una muerte:

```javascript
const juego = darkMoonAplicacion.controladorPartida.juego;
const antes = {
  experiencia: juego.jugador.experienciaTotal,
  botin: juego.interactuables.length,
};
const repeticion1 = juego.sistemaCombateJugador.resolverDerrotasPendientes();
const medio = {
  experiencia: juego.jugador.experienciaTotal,
  botin: juego.interactuables.length,
};
const repeticion2 = juego.sistemaCombateJugador.resolverDerrotasPendientes();
const despues = {
  experiencia: juego.jugador.experienciaTotal,
  botin: juego.interactuables.length,
};

console.assert(repeticion1.cantidadProcesada === 0, repeticion1);
console.assert(repeticion2.cantidadProcesada === 0, repeticion2);
console.assert(medio.experiencia === despues.experiencia, "XP duplicada.");
console.assert(medio.botin === despues.botin, "Botín duplicado.");
console.log({ antes, medio, despues });
```

### 10.8 Restaurar tiradas aleatorias

```javascript
darkMoonDebug.magia.habilidades.restaurarTiradasAleatorias();
```

## 11. Riesgos y decisiones pendientes

1. **Balance provisional.** Los valores de Maná, daño, tiempo, duración, radios y saltos son una primera configuración funcional. Deben revisarse junto con el balance global del juego.
2. **Radio de cuadrícula.** La forma `radio` utiliza distancia de cuadrícula compatible con movimiento en ocho direcciones. Un radio 1 ocupa hasta 3 × 3 y un radio 2 hasta 5 × 5, descontando paredes o límites.
3. **Objetivos destructibles.** El sistema canónico actual considera los objetos destructibles dentro de `juego.objetivos`, como ya ocurría con habilidades básicas. Por eso un área o una cadena puede incluir un destructible si está dentro de la geometría. Separar categorías de objetivo requerirá un contrato explícito futuro, no condiciones por nombre de habilidad.
4. **Persistencia espacial.** No existe todavía una entidad de zona temporal sobre el mapa. Debe implementarse de forma genérica en ETAPA 10A para Nube tóxica persistente, Muro de fuego, suelo congelado, trampas y habilidades físicas que dejen áreas activas.
5. **Nuevas formas.** Línea, cono, cruz y anillo no se implementaron porque ninguna habilidad de esta etapa permite validarlas de extremo a extremo. La arquitectura queda preparada para incorporarlas en `GeometriaHabilidades`.
6. **Recursos gráficos.** Las habilidades siguen sin iconos definitivos. La barra utiliza el fallback textual existente.

## 12. Comprobación de restricciones

- archivos `.patch` creados: ninguno;
- archivos `.mjs` creados: ninguno;
- Node.js utilizado: no;
- `node:test` utilizado: no;
- dependencias instaladas: ninguna;
- librerías, runtimes o frameworks instalados: ninguno;
- commit realizado: no;
- push realizado: no;
- etapa posterior iniciada: no;
- archivos de producción con `Etapa10`, `ETAPA_10` o equivalentes: ninguno;
- instaladores temporales en producción: ninguno;
- motores duplicados de habilidades, daño, efectos o recompensas: ninguno detectado;
- `git diff --check`: sin errores;
- validación JSON: correcta;
- carga de módulos en Chromium: correcta.

## 13. Conventional Commit propuesto

Título:

```text
feat(habilidades): incorporar habilidades intermedias configurables
```

Descripción completa:

```text
feat(habilidades): incorporar habilidades intermedias configurables

- activar Explosión ígnea, Nova de escarcha, Cadena de rayos y Nube tóxica
- agregar tres grados y requisito de maestría 3 a cada habilidad intermedia
- incorporar geometrías genéricas individual, radio y cadena
- separar rango de selección de la forma final de impacto
- resolver múltiples objetivos con daño, crítico, resistencias y efectos canónicos
- admitir habilidades de solo efectos sin generar daño directo ficticio
- consumir Maná, tiempo y experiencia de maestría una vez por lanzamiento
- mostrar rango, área, objetivos y recorrido en la capa Canvas
- ampliar el depurador con preparación determinista por habilidad y grado
- conservar recompensas únicas mediante ResolutorDerrotasJugador
- dejar las zonas persistentes del mapa fuera de esta etapa
```
