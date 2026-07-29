# ETAPA 12 — Balance y analizador

## Estado de la entrega

Esta entrega corresponde únicamente al **Bloque 12.1: analizador y línea base**.

No se considera terminada la ETAPA 12 completa. Los ajustes de daño, Maná, tiempos, enemigos, efectos y arquetipos quedan para los bloques siguientes y requerirán una propuesta previa y aprobación.

## Base verificada

- Ruta de trabajo: `/mnt/data/etapa12_trabajo`
- Rama de origen: `main`
- Commit base: `7a0f5ce8b423375ae5836919b2423d7fe71cfef5`
- Estado inicial del worktree limpio: sin cambios
- Commit o push realizado: ninguno

El ZIP recibido mostraba 156 archivos modificados por diferencias LF/CRLF. Se comprobó que no existían diferencias reales de contenido. Para trabajar sin mezclar esos cambios se creó un worktree limpio desde el mismo commit local.

## Objetivo cumplido en este bloque

Se incorporó una línea base reproducible para estudiar:

- progresión general de nivel 1 a 10;
- experiencia esperada por mapa;
- experiencia de maestría y acceso a nivel 3 y 6;
- Vida, Maná y regeneración por profesión y nivel;
- inventario de las doce habilidades y sus grados;
- inventario de armas y doble varita;
- relación teórica entre Constitución y resistencias a efectos;
- recarga teórica del arco;
- espera teórica de habilidades básicas;
- pociones de Maná teóricas.

Los escenarios teóricos están marcados como **no implementados** y no modifican una partida.

## Corrección aprobada

### Puntos universales iniciales

| Concepto | Valor anterior | Valor nuevo | Motivo |
|---|---:|---:|---|
| Puntos universales iniciales | 5 | 1 | El valor 5 era una prueba que quedó incorporada por error. |

Archivo:

```text
src/config/magia/Maestrias.json
```

La progresión resultante concede:

- nivel 1: 1 punto universal;
- nivel 3: 3 puntos universales acumulados;
- nivel 6: 6 puntos universales acumulados;
- nivel 10: 10 puntos universales acumulados.

## Arquitectura

### Antes

Existía `AnalizadorBalanceProgresion.js`, centrado en una estimación de experiencia por mapa.

### Después del Bloque 12.1

Se conserva ese analizador y se amplía su cálculo para utilizar:

- `FabricaEnemigos`, para obtener los datos reales de cada enemigo y variante;
- `SistemaProgresion`, para aplicar la recompensa y el redondeo real por enemigo.

Se agrega `AnalizadorBalanceJuego.js` como coordinador. No copia los motores del juego. Reúne resultados de:

- `SistemaProgresion`;
- `FabricaEnemigos`;
- `ProgresoMagicoJugador`;
- `EstadisticasDerivadas`;
- `CalculadorAtributosMagicos`;
- `SistemaCatalizadores`;
- `ConfiguracionAtaque`.

No se alteraron contratos de combate, daño, efectos, recompensas, tiempo ni habilidades.

## Línea base encontrada

### Progresión general

La ruta recomendada actual queda dentro del objetivo de entre 0,8 y 2,25 expediciones por nivel.

| Nivel | Mapa | XP necesaria | XP esperada por expedición | Enemigos estimados | Expediciones estimadas |
|---|---|---:|---:|---:|---:|
| 1 → 2 | Alcantarilla 1 | 20 | 18,50 | 5,51 | 1,08 |
| 2 → 3 | Cementerio 2 | 50 | 58,92 | 3,50 | 0,85 |
| 3 → 4 | Cementerio 3 | 88 | 68,50 | 5,29 | 1,28 |
| 4 → 5 | Casa del Guerrero 4 | 129 | 97,43 | 6,78 | 1,32 |
| 5 → 6 | Casa del Guerrero 5 | 175 | 109,45 | 8,19 | 1,60 |
| 6 → 7 | Fortaleza abandonada 6 | 224 | 178,12 | 7,73 | 1,26 |
| 7 → 8 | Fortaleza abandonada 7 | 276 | 197,50 | 8,60 | 1,40 |
| 8 → 9 | Sala de guerra 8 | 331 | 343,93 | 7,89 | 0,96 |
| 9 → 10 | Sala de guerra 9 | 388 | 370,60 | 8,58 | 1,05 |

Resultado inicial:

- expediciones mínimas estimadas: 0,85;
- expediciones máximas estimadas: 1,60;
- enemigos mínimos estimados para subir: 3,50;
- enemigos máximos estimados para subir: 8,60;
- los nueve tramos cumplen el objetivo configurado.

Esto todavía no demuestra que la dificultad sea correcta. Solo indica que la cantidad esperada de experiencia no presenta un bloqueo evidente.

### Experiencia de maestría

Se simuló con `ProgresoMagicoJugador`, registrando ejecuciones efectivas reales.

| Maestría | Ruta | Usos hasta nivel 3 | Usos de nivel 3 a 6 | Usos totales | Maná total |
|---|---|---:|---:|---:|---:|
| Fuego | grados iniciales | 32 | 46 | 78 | 372 |
| Fuego | grados máximos | 16 | 28 | 44 | 376 |
| Frío | grados iniciales | 32 | 46 | 78 | 372 |
| Frío | grados máximos | 16 | 28 | 44 | 376 |
| Rayo | grados iniciales | 48 | 55 | 103 | 371 |
| Rayo | grados máximos | 19 | 31 | 50 | 374 |
| Veneno | grados iniciales | 32 | 46 | 78 | 372 |
| Veneno | grados máximos | 16 | 28 | 44 | 376 |

Conclusión inicial sencilla:

- una habilidad cara necesita muchas menos acciones para subir la maestría;
- el Maná total necesario permanece casi igual: entre 371 y 376;
- por tanto, el sistema actual iguala el esfuerzo por **Maná gastado**, pero no por cantidad de acciones ni por cantidad de combates;
- el Bloque 12.2 deberá comprobar si regenerar ese Maná hace que el acceso a nivel 3 y 6 sea razonable o demasiado lento.

No se modificó todavía la fórmula de experiencia de maestría.

### Vida y Maná

Se generaron perfiles reproducibles usando los pesos de atributos de cada profesión. Los 27 puntos de creación se distribuyen de manera determinista y los puntos de nivel se colocan en el atributo de mayor peso.

| Profesión | Nivel | Vida | Maná | Regeneración por 100 | Básicas baratas | Avanzadas caras | Ataques con doble varita |
|---|---:|---:|---:|---:|---:|---:|---:|
| Guerrero | 1 | 50 | 12 | 1,0 | 6 | 0 | 6 |
| Guerrero | 3 | 62 | 16 | 1,0 | 8 | 1 | 8 |
| Guerrero | 6 | 80 | 22 | 1,0 | 11 | 1 | 11 |
| Guerrero | 10 | 104 | 30 | 1,0 | 15 | 1 | 15 |
| Rogue | 1 | 44 | 20 | 1,2 | 10 | 1 | 10 |
| Rogue | 3 | 54 | 26 | 1,2 | 13 | 1 | 13 |
| Rogue | 6 | 69 | 35 | 1,2 | 17 | 2 | 17 |
| Rogue | 10 | 89 | 47 | 1,2 | 23 | 2 | 23 |
| Mago | 1 | 36 | 39 | 1,5 | 19 | 2 | 19 |
| Mago | 3 | 44 | 55 | 1,5 | 27 | 3 | 27 |
| Mago | 6 | 56 | 79 | 1,5 | 39 | 4 | 39 |
| Mago | 10 | 72 | 111 | 1,5 | 55 | 6 | 55 |

Estos valores son una línea base, no una conclusión final. Todavía deben cruzarse con duración de mapas, coste temporal, daño y recuperación dentro y fuera del combate.

## Constitución y resistencias a efectos

Escenario aprobado para medir, pero todavía no implementado:

```text
bono = mínimo(10, piso(máximo(0, Constitución - 8) / 2))
resistencia final = mínimo(75, resistencia base + bono + equipo)
```

| Constitución | Bono teórico | Aplicación base 100 % | Aplicación base 40 % | Aplicación base 20 % |
|---:|---:|---:|---:|---:|
| 8 | 0 % | 100 % | 40 % | 20 % |
| 10 | 1 % | 99 % | 39,6 % | 19,8 % |
| 12 | 2 % | 98 % | 39,2 % | 19,6 % |
| 15 | 3 % | 97 % | 38,8 % | 19,4 % |
| 18 | 5 % | 95 % | 38 % | 19 % |
| 24 | 8 % | 92 % | 36,8 % | 18,4 % |
| 28 | 10 % | 90 % | 36 % | 18 % |

En los perfiles representativos actuales:

- Guerrero, Constitución 15: 3 %;
- Rogue, Constitución 14: 3 %;
- Mago, Constitución 12: 2 %.

Resultado inicial:

- la diferencia entre profesiones es pequeña;
- no permite acercarse por sí sola al límite de 75 %;
- no parece volver inútiles los afijos;
- Constitución ya mejora la Vida, por lo que su valor total debe revisarse en el Bloque 12.4 antes de implementarlo.

## Temas teóricos reservados

### Arco y recarga

El juego actual no posee una acción de recarga separada.

| Arco | Daño medio actual | Ciclo actual | Ciclo con recarga 100 | Multiplicador de daño necesario |
|---|---:|---:|---:|---:|
| Arco corto | 5,5 | 105 | 205 | 1,95 |
| Arco recurvo | 7,0 | 105 | 205 | 1,95 |

Agregar una recarga de 100 sin otros cambios reduciría casi a la mitad el daño por tiempo. Para conservar exactamente el rendimiento nominal, el daño medio debería multiplicarse aproximadamente por 1,95.

No se implementó la recarga ni se cambió el daño.

### Espera de habilidades

Las habilidades actuales tienen coste temporal, pero no enfriamiento posterior.

Agregar una espera de 100 a las habilidades básicas reduciría su rendimiento nominal sostenido entre:

```text
51,28 % y 59,52 %
```

No se agregó ningún enfriamiento. Antes habrá que medir rotaciones, ataques alternativos, Maná y control.

### Pociones de Maná

El catálogo actual no posee pociones de Maná. El sistema de consumibles ya reconoce efectos de recuperación de Maná, pero no se agregó ningún objeto.

El analizador compara teóricamente:

- 10 puntos fijos;
- 25 % del Maná máximo;
- 50 % del Maná máximo;
- 100 % del Maná máximo;
- coste temporal de consumo 100.

No se modificó el catálogo de consumibles.

## Interfaz y comandos

### Página de balance

Abrir:

```text
balance.html
```

La página muestra el resumen y deja disponibles estos objetos:

```javascript
balanceDarkMoon
balanceDarkMoonInforme
```

Comandos:

```javascript
balanceDarkMoon.lineaBase()
balanceDarkMoon.progresion()
balanceDarkMoon.maestrias()
balanceDarkMoon.mana()
balanceDarkMoon.habilidades()
balanceDarkMoon.armas()
balanceDarkMoon.constitucion()
balanceDarkMoon.escenariosTeoricos()
```

Ejemplos para tablas y copia:

```javascript
console.table(balanceDarkMoon.progresion().rutaRecomendada);
console.table(balanceDarkMoon.maestrias().rutasDesbloqueo);
console.table(balanceDarkMoon.mana().filasDestacadas);
console.table(balanceDarkMoon.constitucion().filas);
copy(JSON.stringify(balanceDarkMoon.lineaBase(), null, 2));
```

### Desde la interfaz principal

Los mismos informes quedan disponibles mediante el depurador. Estos comandos son asíncronos:

```javascript
await darkMoonDebug.magia.balance.lineaBase()
await darkMoonDebug.magia.balance.progresion()
await darkMoonDebug.magia.balance.maestrias()
await darkMoonDebug.magia.balance.mana()
await darkMoonDebug.magia.balance.habilidades()
await darkMoonDebug.magia.balance.armas()
await darkMoonDebug.magia.balance.constitucion()
await darkMoonDebug.magia.balance.escenariosTeoricos()
```

Ejemplo:

```javascript
console.table(
  (await darkMoonDebug.magia.balance.progresion()).rutaRecomendada,
);
```

## Pruebas realizadas

### Carga e interfaz del analizador

Se cargaron los archivos reales `balance.html`, `balance.css`, `BalanceAplicacion.js` y sus módulos de producción en Chromium. Debido a que el entorno bloquea las navegaciones HTTP locales, el arnés de prueba sirvió los mismos archivos locales mediante un mapa de importaciones y respondió los `fetch` con los JSON reales del repositorio.

Resultados:

- cero errores de página;
- cero errores de consola;
- botón **Recalcular** funcional;
- nueve filas de progresión;
- diez filas de nivel;
- ocho rutas de maestría;
- doce perfiles destacados de Vida y Maná;
- siete escenarios de Constitución;
- tres temas teóricos;
- cinco advertencias visibles.

### Repetibilidad

Se ejecutó dos veces:

```javascript
JSON.stringify(balanceDarkMoon.lineaBase())
```

Resultado: idéntico en ambas ejecuciones.

El informe no incluye fecha ni valores aleatorios.

### Integración con la interfaz principal

Se cargaron `index.html`, `game.js` y 144 módulos reales de producción en Chromium.

Resultados:

- `darkMoonDebug` disponible;
- `darkMoonDebug.magia.balance` disponible;
- `darkMoonAplicacion` disponible;
- cero errores de página;
- cero errores de consola;
- `await darkMoonDebug.magia.balance.lineaBase()` devolvió 1 punto inicial y el mismo informe determinista.

La creación completa de una partida no forma parte del cambio de este bloque. La regresión jugable completa se realizará en el Bloque 12.5.

### Inventarios y contratos verificados

- 12 habilidades activas;
- 40 grados: 16 básicos, 12 intermedios y 12 avanzados;
- Ralentización conservada;
- Electrización conservada;
- 22 armas analizadas;
- 8 varitas;
- 2 bastones;
- 2 arcos sin recarga separada;
- doble varita Tier I: 16 % de Potencia, 2 de Maná y coste temporal 111;
- doble varita Tier II: 24 % de Potencia, 2 de Maná y coste temporal 111;
- Constitución marcada como no implementada;
- recarga, enfriamiento y pociones marcados como no implementados.

### Validaciones estáticas

- todos los JSON del repositorio son válidos;
- todas las importaciones relativas de JavaScript resuelven a archivos existentes;
- `git diff --check` sin errores;
- no se crearon archivos `.patch` ni `.mjs`;
- no se instalaron dependencias;
- no se utilizó Node.js ni `node:test`;
- no se agregaron nombres de etapa a identificadores de producción;
- no se realizó commit ni push.

## Archivos modificados

```text
balance.css
balance.html
src/aplicacion/BalanceAplicacion.js
src/config/balance/ObjetivosBalance.json
src/config/magia/Maestrias.json
src/juego/balance/AnalizadorBalanceProgresion.js
src/juego/habilidades/DepuradorMagiaHabilidades.js
```

## Archivo nuevo

```text
src/juego/balance/AnalizadorBalanceJuego.js
```

Este mismo documento también es nuevo durante el Bloque 12.1:

```text
docs/magia/ENTREGA_ETAPA_12.md
```

## Pendiente

### Bloque 12.2

- propuesta previa para aprobación;
- progresión general y experiencia de maestría;
- puntos y grados;
- Maná y regeneración;
- decisión numérica antes/después.

### Bloques posteriores

- daño, tiempo, armas y arquetipos;
- efectos, resistencias, inmunidades, enemigos y afijos;
- decisión final sobre Constitución;
- regresión completa jugable de nivel 1 a 10;
- ZIP y documentación final de la ETAPA 12 completa.

## Estado final del Bloque 12.1

- Bloque implementado: sí.
- ETAPA 12 completa: no.
- Valores de combate modificados: ninguno.
- Cambio de balance aplicado: 5 → 1 punto universal inicial.
- Escenarios teóricos aplicados al juego: ninguno.
- Commit creado: no.
- Push realizado: no.
