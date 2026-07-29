# ETAPA 12 — Balance y analizador

## Estado de la entrega

Esta entrega contiene los bloques completados **12.1: analizador y línea base** y **12.2: progresión, experiencia, Maná y grados**.

No se considera terminada la ETAPA 12 completa. El daño, los tiempos, las armas, los arquetipos, los efectos, los enemigos y la regresión completa quedan para los bloques siguientes. Cada bloque requerirá una propuesta previa y aprobación.

## Base verificada

- Ruta de trabajo del Bloque 12.2: `/mnt/data/etapa12_2_repo/repo`
- Rama de origen informada: `main`
- Commit base confirmado por el usuario: `6e0f1a524fd57a02f17fac22aac2937a080e7977`
- Commit anterior del Bloque 12.1: incluido en esa base
- Ajuste adicional conservado: referencias de botín a `varita_veneno_aprendiz`
- Commit o push realizado durante esta entrega: ninguno

El entorno no pudo descargar el commit desde GitHub. La copia de análisis se reconstruyó desde el ZIP local, los archivos completos del Bloque 12.1 y las dos sustituciones de varita incluidas en el commit informado. Los archivos entregados deben aplicarse sobre el repositorio del usuario ubicado en el SHA indicado.

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
- el Bloque 12.2 comprobó ese ritmo dentro de la ruta estimada y dejó la decisión vinculada al daño real del Bloque 12.3.

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

## Bloque 12.2 — Progresión, experiencia, Maná y grados

### Alcance realizado

Se amplió el analizador para responder de manera reproducible:

- en qué nivel general se alcanzan maestría 3 y 6;
- qué ocurre usando una, dos o tres habilidades por enemigo;
- cómo cambia el resultado al conservar o gastar puntos universales;
- cuántos puntos necesita un árbol elemental completo;
- cuánto Maná poseen Guerrero, Rogue y Mago;
- qué aporta priorizar Inteligencia, equilibrar INT/SAB o priorizar Sabiduría;
- cuánto Maná consumen realmente una y dos varitas después de considerar la regeneración;
- si los resultados actuales justifican una poción de Maná.

No se modificó ningún valor jugable en este bloque. Se conservaron la experiencia general, la experiencia de maestría, los puntos, el Maná máximo, la regeneración, las habilidades, las varitas y los consumibles.

### Qué se analizó y por qué

#### Experiencia general

Se recorrió la ruta estimada del nivel 1 al 10 para comprobar que el personaje no suba demasiado rápido ni quede bloqueado.

Resultado:

- unas 10,8 expediciones para completar los nueve ascensos;
- entre 0,85 y 1,60 expediciones por nivel;
- todos los tramos permanecen dentro del objetivo actual.

**Conclusión sencilla:** la experiencia general no muestra un problema numérico. No conviene cambiarla antes de conocer la dificultad real de los combates.

#### Ritmo de maestrías

Se ejecutó `ProgresoMagicoJugador` con los enemigos estimados de la ruta y tres intensidades de uso.

| Uso mágico | Maestría 3 | Maestría 6 | Árbol completo | Lectura sencilla |
|---|---|---|---|---|
| 1 habilidad por enemigo | nivel general 5–6 | nivel 9; Rayo no llega antes de 10 | no se completa | lento |
| 2 habilidades por enemigo | nivel general 3–4 | nivel 5–6 | nivel 8 | ritmo coherente |
| 3 habilidades por enemigo | nivel general 2–3 | nivel 4–5 | nivel 6 | rápido |

**Conclusión sencilla:** el sistema funciona bien si un especialista necesita aproximadamente dos lanzamientos efectivos por enemigo. No se debe cambiar la experiencia de maestría hasta medir en el Bloque 12.3 cuántas acciones necesita realmente cada enemigo.

#### Puntos de habilidad

Un árbol elemental necesita:

| Parte | Puntos |
|---|---:|
| Habilidad básica | 4 |
| Habilidad intermedia | 3 |
| Habilidad avanzada | 3 |
| Árbol completo | 10 |

Con la regla actual:

- maestría 3 entrega los puntos necesarios para maximizar la básica;
- maestría 6 permite maximizar básica e intermedia;
- el árbol puede completarse en maestría 8 usando un universal adicional;
- puede completarse en maestría 9 conservando los demás universales.

Gastar todos los puntos universales permite terminar antes, pero sacrifica otras maestrías o configuraciones híbridas.

**Conclusión sencilla:** la cantidad y el ritmo de puntos son coherentes. No se recomienda modificarlos.

#### Maná del Mago: Inteligencia y Sabiduría

Se compararon tres formas de distribuir los puntos obtenidos por nivel.

Valores representativos en nivel 10:

| Estrategia | INT | SAB | Maná | Regeneración | Pulsos para barra completa | Daño mágico | Potencia de efectos |
|---|---:|---:|---:|---:|---:|---:|---:|
| Priorizar Inteligencia | 24 | 15 | 111 | 1,5 | 74 | ×1,56 | ×1,39 |
| Equilibrar INT/SAB | 20 | 19 | 107 | 1,9 | 56,32 | ×1,49 | ×1,46 |
| Priorizar Sabiduría | 15 | 24 | 102 | 2,4 | 42,5 | ×1,39 | ×1,56 |

**Conclusión sencilla:** Inteligencia y Sabiduría ya presentan una decisión real. Inteligencia ofrece más daño y una reserva ligeramente mayor; Sabiduría recupera Maná con mayor rapidez y fortalece los efectos. No se recomienda cambiar el Maná máximo ni la regeneración en este bloque.

#### Varitas y regeneración

Se restó del coste de cada ataque el Maná que se regenera durante el tiempo consumido por la propia acción.

Resultados:

- 48 escenarios comparados entre profesiones, niveles, una varita y doble varita;
- 32 casos resultan sostenibles o tienen un coste neto casi nulo;
- una sola varita cuesta 1 de Maná y tarda 85;
- con regeneración base 1, incluso el Guerrero recupera aproximadamente 0,85 durante ese tiempo;
- el coste neto teórico de una varita simple queda alrededor de 0,15 para Guerrero y puede ser nulo para Rogue o Mago;
- la doble varita continúa consumiendo Maná, pero mucho menos que los 2 puntos nominales.

**Conclusión sencilla:** el coste de Maná de una varita simple podría ser casi decorativo. No debe aumentarse todavía, porque primero hay que saber si su daño es bajo, correcto o excesivo frente a bastones y armas físicas. Esa decisión pasa al Bloque 12.3.

#### Pociones de Maná

Se compararon de forma teórica recuperaciones fijas y porcentuales, sin crear objetos.

**Conclusión sencilla:** las mediciones actuales no demuestran que una poción sea necesaria para mapas normales. Si las pruebas contra jefes muestran que el Mago se agota, la primera opción a probar será una poción que recupere 25 % del Maná máximo y consuma 100 unidades de tiempo.

### Conclusión final del Bloque 12.2

**Qué analicé:** experiencia de nivel, progreso de maestrías, puntos de habilidad, reservas y regeneración de Maná, decisiones INT/SAB, varitas y pociones.

**Por qué:** para saber si esos sistemas necesitan cambios antes de comenzar a calibrar daño y tiempo.

**Conclusión:** la experiencia general, la experiencia de maestría, los puntos y el Maná forman un conjunto razonable. La única advertencia importante es que una varita simple puede consumir casi nada de Maná después de considerar la regeneración.

**Qué recomiendo hacer:** conservar todos los valores actuales y pasar al Bloque 12.3. Allí se comparará el daño por tiempo y por Maná de armas, varitas, bastones y las doce habilidades. Solo entonces se decidirá si debe cambiar el coste de las varitas, el ritmo de maestría o algún valor de Maná.

### Decisiones resultantes

| Tema | Decisión recomendada ahora |
|---|---|
| Experiencia general | Mantener |
| Experiencia de maestría | Mantener provisionalmente |
| Puntos universales | Mantener |
| Puntos específicos | Mantener |
| Maná máximo | Mantener |
| Regeneración de Maná | Mantener |
| Poción de Maná | No agregar todavía |
| Coste de varitas | Revisar junto con el daño en 12.3 |
| Recarga del arco | Continúa como escenario teórico |
| Espera de habilidades | Continúa como escenario teórico |
| Constitución y resistencias | Continúa como escenario teórico hasta 12.4 |

### Archivos modificados en el Bloque 12.2

```text
balance.css
balance.html
src/aplicacion/BalanceAplicacion.js
src/config/balance/ObjetivosBalance.json
src/juego/balance/AnalizadorBalanceJuego.js
src/juego/habilidades/DepuradorMagiaHabilidades.js
docs/magia/ENTREGA_ETAPA_12.md
```

No se agregó otro archivo de producción ni se modificó configuración jugable.

### Comandos nuevos

Desde `balance.html`:

```javascript
balanceDarkMoon.progresionMagica()
balanceDarkMoon.puntosHabilidad()
balanceDarkMoon.sostenibilidadMana()
```

Desde la interfaz principal:

```javascript
await darkMoonDebug.magia.balance.progresionMagica()
await darkMoonDebug.magia.balance.puntosHabilidad()
await darkMoonDebug.magia.balance.sostenibilidadMana()
```

Ejemplos:

```javascript
console.table(balanceDarkMoon.progresionMagica().filas);
console.table(balanceDarkMoon.puntosHabilidad().hitos);
console.table(balanceDarkMoon.sostenibilidadMana().perfilesMago);
console.table(balanceDarkMoon.sostenibilidadMana().varitas);
```

### Pruebas del Bloque 12.2

Se cargó `balance.html` con Chromium y los módulos reales del repositorio.

Resultados visibles:

- 6 tarjetas de conclusiones sencillas;
- 9 filas de progresión general;
- 10 filas de niveles;
- 8 rutas nominales de maestría;
- 12 comparaciones realistas de maestría;
- 4 hitos de puntos;
- 12 perfiles de Vida y Maná;
- 12 perfiles alternativos del Mago;
- 24 escenarios visibles de varitas Tier I;
- 7 escenarios teóricos de Constitución;
- 3 temas teóricos reservados;
- 5 advertencias.

Validación:

- cero errores de página;
- cero errores de consola;
- botón **Recalcular** funcional;
- dos informes consecutivos idénticos;
- `darkMoonDebug.magia.balance` expone los tres comandos nuevos;
- 24 simulaciones de progreso mágico ejecutadas;
- árbol elemental confirmado en 10 puntos;
- 48 escenarios de sostenibilidad de varitas calculados.

La regresión jugable completa de niveles 1 a 10 continúa reservada para el Bloque 12.5.

## Pendiente

### Bloque 12.3

- daño medio por acción;
- daño por tiempo y por Maná;
- ataques físicos, varitas, bastones y doble varita;
- doce habilidades en todos sus grados;
- Potencia de Habilidad y arquetipos;
- propuesta de cambios antes de modificar valores.

### Bloques posteriores

- efectos, resistencias, inmunidades, enemigos y afijos;
- decisión final sobre Constitución;
- regresión completa jugable de nivel 1 a 10;
- ZIP y documentación final de la ETAPA 12 completa.

## Estado actual después del Bloque 12.2

- Bloque 12.1 implementado: sí.
- Bloque 12.2 implementado: sí.
- ETAPA 12 completa: no.
- Valores jugables modificados en 12.2: ninguno.
- Cambio de balance acumulado desde 12.1: 5 → 1 punto universal inicial.
- Escenarios teóricos aplicados al juego: ninguno.
- Commit creado durante esta entrega: no.
- Push realizado durante esta entrega: no.
- Próximo paso propuesto: Bloque 12.3, sujeto a aprobación.
