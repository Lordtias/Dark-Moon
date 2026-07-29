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

---

## Bloque 12.3 — Daño, tiempo, Potencia de Habilidad y arquetipos

### Base verificada

```text
Commit base declarado y utilizado:
14e985d42ac3c5ce4aa8c31dc07c8d1badbfb81c
```

Este bloque amplía el analizador. No cambia todavía daño, Maná, tiempos, armas, habilidades ni enemigos. Los resultados que requieren números nuevos se presentan primero para aprobación.

### Qué se agregó

El analizador ahora recorre automáticamente:

- todas las armas configuradas;
- todas las varitas y una prueba de doble empuñadura por cada varita;
- las doce habilidades;
- los cuarenta grados;
- Potencia de Habilidad sin catalizador, con bastón, con doble varita y con afijos máximos;
- resistencias elementales y a efectos de 0 %, 25 %, 50 % y 75 %;
- ocho arquetipos físicos, mágicos e híbridos.

El contenido nuevo que conserve los contratos actuales aparecerá automáticamente. Una mecánica nueva seguirá necesitando que se defina cómo medirla.

### Cómo se obtienen los resultados

- Los enemigos de referencia se crean con `FabricaEnemigos.crearEnemigo`.
- Los ataques básicos usan estadísticas, impacto, crítico, armadura, resistencias y tiempo del juego.
- El daño directo de habilidades se ejecuta con `MotorDanioHabilidad` y tiradas deterministas.
- Los efectos se preparan con `MotorEfectosHabilidad`.
- El daño periódico se mitiga con `ComponentesDanio` usando las definiciones canónicas preparadas.
- La Potencia se obtiene mediante `SistemaCatalizadores`.
- El analizador no identifica habilidades por nombre para ejecutar fórmulas especiales.

### Criterios visibles en la página

Todas las tablas de `balance.html` contienen ahora:

- una explicación de qué se analiza;
- la regla utilizada para interpretar el número;
- una columna **Criterio de evaluación**;
- una columna **Estado**.

Estados posibles:

| Estado | Significado |
|---|---|
| Correcto | Está dentro del rango definido. |
| Advertencia | Puede ser válido, pero necesita comparación o prueba real. |
| Incorrecto | Está claramente fuera de la banda amplia y requiere una decisión. |
| Informativo | No existe todavía una comparación suficiente o la mecánica necesita otra prueba. |

Un resultado no se marca como Correcto cuando no existe un par comparable.

### Resultados medidos

#### Armas

Se analizaron 30 configuraciones:

- 22 armas simples;
- 8 configuraciones de doble varita, una por cada varita existente.

| Estado | Cantidad |
|---|---:|
| Correcto | 24 |
| Advertencia | 2 |
| Incorrecto | 0 |
| Informativo | 4 |

Las dos advertencias son:

- Varita de veneno de aprendiz;
- doble Varita de veneno de aprendiz.

No tienen estadísticas base inferiores a las demás varitas. El resultado baja porque los enemigos iniciales de referencia presentan una defensa efectiva mayor contra Veneno. Esto indica una desventaja del elemento en ese tramo, no un error demostrado del objeto.

Comparaciones destacadas Tier I:

| Configuración | Daño esperado/100 | Maná | Alcance |
|---|---:|---:|---:|
| Arco corto | 4,71 | 0 | 6 |
| Bastón de aprendiz | 4,53 | 0 | 1 |
| Varita de fuego | 3,33 | 1 | 4 |
| Doble varita de fuego | 3,57 | 2 | 4 |

La doble varita aumenta poco el daño sostenido frente a una sola, porque la secundaria tiene penalización y la acción tarda más. A cambio aporta más Potencia de Habilidad.

**Conclusión sencilla:** las varitas no dominan mediante su ataque básico. Aunque su coste real de Maná sea pequeño, causan menos daño sostenido que muchas armas físicas. No se recomienda aumentar su coste en este momento.

#### Arco y recarga

El arco ya presenta daño sostenido inferior a las armas físicas de cuerpo a cuerpo, pero compensa mediante alcance y seguridad.

Agregar una recarga de 100 casi duplicaría el ciclo de ataque. Para conservar su rendimiento habría que aumentar su daño aproximadamente al doble.

**Conclusión sencilla:** no agregar recarga al arco por ahora. Primero debe probarse su ventaja real de alcance dentro de mapas completos.

#### Habilidades

Se ejecutaron 800 combinaciones deterministas:

```text
40 grados × 5 escenarios de Potencia × 4 resistencias
```

Para la tabla principal se muestran los 40 grados con el catalizador normal de su tramo.

| Estado | Cantidad |
|---|---:|
| Correcto | 33 |
| Advertencia | 4 |
| Incorrecto | 0 |
| Informativo | 3 |

Advertencias:

- Incinerar grado 3: rendimiento alto;
- Prisión glacial grados 2 y 3: rendimiento numérico bajo, aunque incluye control fuerte;
- Nube tóxica grado 1: comienzo débil frente a otras intermedias.

Informativas:

- Plaga corrosiva grados 1, 2 y 3.

Plaga se marca como informativa porque su valor depende de reaplicaciones e intensidad. La primera aplicación no representa su rendimiento máximo. Su conclusión definitiva corresponde al Bloque 12.4.

**Conclusión sencilla:** no existe una razón suficiente para modificar inmediatamente las doce habilidades. Incinerar grado 3 necesita una prueba de jefe y grupos; Prisión necesita valorar cuánto daño evita su control; Nube grado 1 necesita probarse en zonas reales; Plaga necesita medir acumulaciones.

#### Tiempos de espera de habilidades

Las habilidades tienen coste temporal, pero no enfriamiento separado. Agregar una espera de 100 reduciría el rendimiento teórico de las básicas entre 51 % y 60 %.

**Conclusión sencilla:** no agregar enfriamientos por ahora. Sería una reducción demasiado grande y obligaría a recalibrar daños, Maná y progresión de maestría al mismo tiempo.

#### Potencia de Habilidad

| Escenario | Tier I | Tier II | Estado |
|---|---:|---:|---|
| Bastón base | 15 % | 25 % | Correcto |
| Doble varita base | 16 % | 24 % | Correcto |
| Bastón con afijo máximo | 30 % | 40 % | Correcto |
| Doble varita con dos afijos máximos | 46 % | 54 % | Advertencia |

La regla base de bastón y doble varita está equilibrada: solo existe un punto de diferencia en cada Tier.

La advertencia aparece en doble varita con afijos máximos porque puede utilizar dos afijos y superar al bastón máximo en 16 puntos en Tier I y 14 en Tier II.

**Conclusión sencilla:** no cambiar la regla de catalizadores. Debe analizarse más adelante si el afijo de Potencia necesita una regla especial de acumulación o valores menores al estar presente en dos varitas.

#### Arquetipos

Se compararon ocho rotaciones representativas.

| Resultado | Estado |
|---|---|
| Guerrero físico | Correcto |
| Rogue físico | Correcto |
| Mago especializado | Incorrecto como señal de burst alto |
| Guerrero mágico | Correcto |
| Rogue mágico | Correcto |
| Mago físico | Advertencia |
| Híbrido con catalizador | Correcto |
| Híbrido sin catalizador | Correcto |

El Mago especializado utiliza tres Incinerar grado 3:

```text
Maná: 45
Tiempo: 315
Daño esperado a un objetivo: 142,17
Daño esperado potencial a tres objetivos: 426,51
```

El resultado es muy superior en una rotación corta, pero consume alrededor del 40 % de la reserva de un Mago de nivel 10. Esto es daño explosivo, no rendimiento infinito.

El Mago físico queda por debajo, lo cual es coherente con utilizar un estilo que no aprovecha sus atributos principales.

**Conclusión sencilla:** los híbridos parecen viables y no dominantes. El posible problema está concentrado en el daño explosivo del Mago especializado, especialmente Incinerar grado 3. No debe reducirse hasta probar cuánto Maná queda durante mapas y jefes reales.

### Conclusión final del Bloque 12.3

**Qué analicé:** todas las armas, varitas, bastones, doble varita, las doce habilidades y sus grados, críticos, resistencias, Potencia de Habilidad y ocho arquetipos.

**Por qué:** para saber qué elementos realmente necesitan cambios antes de tocar daño, tiempo o Maná.

**Conclusión:** el ataque básico de las varitas no está sobrepotenciado; el arco no necesita una recarga; los enfriamientos reducirían demasiado las habilidades; la regla base de bastón y doble varita está bien. Las señales que necesitan pruebas adicionales son Incinerar grado 3, el valor defensivo de Prisión glacial, Nube tóxica grado 1, las acumulaciones de Plaga y la Potencia máxima de doble varita con dos afijos.

**Qué recomiendo hacer:** no aplicar todavía cambios numéricos generales. Antes de modificar valores, realizar un subbloque de pruebas focalizadas sobre esas cinco señales y presentar una propuesta anterior/nueva para aprobación.

### Decisiones propuestas para aprobación

| Tema | Recomendación |
|---|---|
| Coste de Maná de varitas | Mantener en 1 por varita |
| Doble varita | Mantener regla y penalización actuales |
| Arco | No agregar recarga |
| Habilidades básicas | No agregar enfriamiento |
| Bastón frente a doble varita base | Mantener valores actuales |
| Afijo máximo en doble varita | Medir en pruebas reales antes de ajustar |
| Incinerar grado 3 | Probar en grupos y jefes antes de reducir |
| Prisión glacial | Valorar control en 12.4 antes de aumentar daño |
| Nube tóxica grado 1 | Probar área y duración real antes de aumentar daño |
| Plaga corrosiva | Resolver con pruebas de intensidad en 12.4 |
| Pociones de Maná | Continuar pospuestas hasta las pruebas de jefes |

### Archivos del Bloque 12.3

```text
balance.css
balance.html
src/aplicacion/BalanceAplicacion.js
src/config/balance/ObjetivosBalance.json
src/juego/balance/AnalizadorBalanceJuego.js
src/juego/balance/AnalizadorBalanceCombate.js
src/juego/habilidades/DepuradorMagiaHabilidades.js
docs/magia/ENTREGA_ETAPA_12.md
```

### Comandos de consola

Desde `balance.html`:

```javascript
balanceDarkMoon.combate()
balanceDarkMoon.danioArmas()
balanceDarkMoon.danioHabilidades()
balanceDarkMoon.potenciaHabilidad()
balanceDarkMoon.arquetipos()
```

Desde el juego:

```javascript
await darkMoonDebug.magia.balance.combate()
await darkMoonDebug.magia.balance.danioArmas()
await darkMoonDebug.magia.balance.danioHabilidades()
await darkMoonDebug.magia.balance.potenciaHabilidad()
await darkMoonDebug.magia.balance.arquetipos()
```

Ejemplos:

```javascript
console.table((await darkMoonDebug.magia.balance.danioArmas()).filas);
console.table((await darkMoonDebug.magia.balance.danioHabilidades()).filasPrincipales);
console.table((await darkMoonDebug.magia.balance.arquetipos()).filas);
```

### Pruebas realizadas

- `balance.html` cargado con Chromium y los módulos reales interceptados desde la copia local;
- cero errores de página;
- cero errores de consola;
- cero recursos faltantes;
- todas las tablas contienen criterio y estado;
- ninguna tabla quedó vacía;
- 30 configuraciones de armas;
- 12 habilidades y 40 grados principales;
- 800 simulaciones de habilidades;
- 48 filas de resistencias para grados máximos;
- 10 escenarios de Potencia;
- 8 arquetipos;
- dos informes de combate consecutivos idénticos;
- `darkMoonDebug.magia.balance` expone los cinco comandos nuevos;
- carga de `index.html` sin errores de página ni consola.

La prueba completa jugable desde nivel 1 hasta nivel 10 continúa reservada para el Bloque 12.5.

### Estado después del Bloque 12.3

- Analizador de daño y arquetipos: implementado.
- Criterios y estados en todas las tablas: implementados.
- Valores jugables modificados en 12.3: ninguno.
- Recarga de arco: no implementada.
- Enfriamientos: no implementados.
- Poción de Maná: no implementada.
- Cambios numéricos pendientes: requieren aprobación específica.
- Commit o push realizado: no.

---

## Bloque 12.3A — Pruebas focalizadas de combate

### Base utilizada

```text
Commit confirmado por el usuario:
a7b606485de27338533c3601ed71fc7dd51d2ee1
```

La implementación se preparó sobre la copia completa correspondiente al Bloque 12.3. En el entorno de trabajo no se modificaron valores jugables, no se realizó commit y no se realizó push.

### Objetivo sencillo

El Bloque 12.3 había encontrado varias señales de posible desequilibrio. Este subbloque no cambió números: repitió esas comparaciones usando secuencias completas de efectos, zonas, regeneración y acumulaciones para comprobar si las advertencias eran reales o si provenían de medir solamente una parte de la habilidad.

### Resultado general

```text
Casos focalizados: 27
Correctos: 21
Advertencias: 0
Incorrectos: 0
Informativos: 6
```

Los seis casos informativos corresponden a situaciones cuyo resultado depende de la posición o de la cantidad real de objetivos, no a errores del sistema.

### Incinerar grado 3

**Qué se analizó:** una Incinerar contra uno, dos y tres objetivos, y tres lanzamientos consecutivos contra el Señor de la Guerra.

**Por qué:** el análisis anterior podía contar la Quemadura completa tres veces, aunque el contrato real conserva una sola instancia y renueva su duración.

Resultados principales:

| Caso | Daño esperado | Resultado |
|---|---:|---|
| Una Incinerar G3, un objetivo mediano nivel 10 | 47,39 | Informativo |
| Una Incinerar G3, dos objetivos | 94,78 | Correcto |
| Una Incinerar G3, tres objetivos | 142,17 | Correcto |
| Tres Incinerar G3 contra Señor de la Guerra | 75,98 de 136 de Vida | Correcto |

La rotación contra el jefe quita aproximadamente 55,87 % de su Vida esperada, consume 45 de Maná, regenera 4 y deja 63,06 % de la reserva del Mago.

**Conclusión:** Incinerar conserva un daño explosivo alto, especialmente cuando alinea varios enemigos, pero las tres aplicaciones no triplican todo el daño periódico. No se justifica reducirla ahora.

**Decisión recomendada:** mantener sus valores y comprobar en el Bloque 12.5 con qué frecuencia el jugador consigue alinear varios enemigos durante una partida real.

### Prisión glacial

**Qué se analizó:** grados 2 y 3, contra enemigo normal y jefe, desde distancias 1, 2 y 3.

**Por qué:** su daño parecía bajo, pero la habilidad también inmoviliza.

Resultados:

- Congelamiento mantiene una sola instancia.
- Una reaplicación mientras está activo es rechazada.
- A distancia 2 o 3 evita aproximadamente 0,77 movimientos esperados contra un enemigo sin resistencia alta.
- Si el enemigo ya está adyacente, puede seguir atacando aunque no pueda moverse.

**Conclusión:** el valor de Prisión glacial es posicional. No necesita más daño solo porque su número directo sea menor.

**Decisión recomendada:** mantener daño y duración. Confirmar desde la interfaz que el jugador pueda aprovechar la distancia ganada.

### Nube tóxica grado 1

**Qué se analizó:** toda la duración de la zona, con uno y tres objetivos, incluyendo entrada tardía.

**Por qué:** la advertencia anterior contaba principalmente la primera aplicación y no las renovaciones posteriores.

Resultados:

| Objetivos | Daño esperado total | Daño por Maná | Estado |
|---:|---:|---:|---|
| 1 | 9,02 | 1,50 | Informativo |
| 3 | 27,06 | 4,51 | Correcto |

La zona realiza tres activaciones por objetivo, mantiene una sola instancia de Veneno y puede aplicar el efecto a un enemigo que entra después de creada.

**Conclusión:** Nube tóxica grado 1 cumple su función cuando permanece activa y afecta grupos. La primera aplicación aislada no representa su rendimiento real.

**Decisión recomendada:** mantener sus valores.

### Plaga corrosiva

**Qué se analizó:** grados 1, 2 y 3 hasta alcanzar su intensidad máxima.

**Por qué:** su primera aplicación no representa el daño de una habilidad diseñada para intensificarse.

| Grado | Aplicaciones | Probabilidad de completar el máximo | Daño total esperado | Maná | Estado |
|---:|---:|---:|---:|---:|---|
| 1 | 2 | 58,87 % | 34,64 | 18 | Correcto |
| 2 | 3 | 45,17 % | 95,93 | 36 | Correcto |
| 3 | 3 | 36,38 % | 117,41 | 45 | Correcto |

En todos los grados conserva una única instancia y alcanza la intensidad máxima configurada cuando las aplicaciones tienen éxito.

**Conclusión:** su daño sostenido es alto, pero exige varias acciones, bastante Maná y completar todas las aplicaciones.

**Decisión recomendada:** mantener sus valores.

### Doble varita con afijos máximos

**Qué se analizó:** el daño real de bastón y doble varita, primero con equipo base y después con los afijos máximos de Potencia.

**Por qué:** comparar únicamente 30 % contra 46 %, o 40 % contra 54 %, mezclaba la ventaja propia de las varitas con el beneficio específico de poder equipar dos afijos.

| Tier | Ventaja doble varita base | Ventaja doble varita máxima | Ventaja adicional causada por los dos afijos | Estado |
|---:|---:|---:|---:|---|
| I | 3,37 % | 12,29 % | 8,63 % | Correcto |
| II | 4,21 % | 17,31 % | 12,58 % | Correcto |

El criterio aprobado admite hasta 15 % adicional proveniente específicamente de los dos afijos. Los máximos individuales más altos se conservan como información porque el redondeo de daños pequeños puede exagerar algunos porcentajes aislados.

**Conclusión:** la doble varita máxima supera al bastón máximo, pero el beneficio adicional causado por disponer de dos afijos permanece dentro del límite.

**Decisión recomendada:** mantener Potencia de Habilidad, afijos y regla de doble varita.

### Maná de las rotaciones

**Qué se analizó:** Maná gastado, regenerado y restante durante las secuencias focalizadas.

| Rotación | Maná máximo | Gastado | Regenerado | Reserva restante | Estado |
|---|---:|---:|---:|---:|---|
| Incinerar G3 × 3 | 111 | 45 | 4 | 63,06 % | Correcto |
| Prisión glacial G3 × 3 | 111 | 39 | 4 | 68,47 % | Correcto |
| Plaga corrosiva G3 × 3 | 111 | 45 | 4 | 63,06 % | Correcto |
| Nube tóxica G1 × 1 | 111 | 6 | 1 | 95,50 % | Correcto |

**Conclusión:** la regeneración ayuda, pero las habilidades avanzadas todavía consumen una parte visible de la reserva. Tres lanzamientos fuertes no dejan al Mago sin Maná, pero tampoco son gratuitos.

**Decisión recomendada:** no agregar todavía pociones de Maná y no aumentar la regeneración. La necesidad real debe comprobarse durante un mapa y un jefe completos.

### Ajuste del análisis de arquetipos

El análisis anterior multiplicaba el daño periódico completo por cada lanzamiento y valoraba siempre tres objetivos perfectos. Eso exageraba al Mago especializado.

El analizador ahora:

- ejecuta una secuencia real cuando se repite una habilidad periódica;
- respeta la política de una sola instancia y renovación;
- utiliza la cantidad esperada de objetivos según la forma de impacto para evaluar el rendimiento grupal;
- conserva el daño potencial a tres objetivos como información separada;
- considera cuánto porcentaje de la reserva de Maná consume una rotación explosiva.

Resultado actualizado:

```text
Arquetipos correctos: 7
Advertencias: 1
Incorrectos: 0
```

La advertencia corresponde al Mago especializado: sigue teniendo el mayor daño explosivo, pero consume aproximadamente 40,54 % de su Maná. No se considera un error demostrado hasta medir el combate completo.

### Cambios de valores jugables

```text
Daño: sin cambios
Maná: sin cambios
Tiempo: sin cambios
Potencia de Habilidad: sin cambios
Afijos: sin cambios
Efectos: sin cambios
Enemigos: sin cambios
```

Solo se ampliaron y corrigieron los criterios del analizador.

### Archivos del Bloque 12.3A

```text
balance.css
balance.html
src/aplicacion/BalanceAplicacion.js
src/config/balance/ObjetivosBalance.json
src/juego/balance/AnalizadorBalanceJuego.js
src/juego/balance/AnalizadorBalanceCombate.js
src/juego/habilidades/DepuradorMagiaHabilidades.js
docs/magia/ENTREGA_ETAPA_12.md
```

### Comandos de consola

Desde `balance.html`:

```javascript
balanceDarkMoon.pruebasFocalizadas()
console.table(balanceDarkMoon.pruebasFocalizadas().incinerar.filas)
console.table(balanceDarkMoon.pruebasFocalizadas().prisionGlacial.filas)
console.table(balanceDarkMoon.pruebasFocalizadas().nubeToxica.filas)
console.table(balanceDarkMoon.pruebasFocalizadas().plagaCorrosiva.filas)
console.table(balanceDarkMoon.pruebasFocalizadas().dobleVarita.filas)
console.table(balanceDarkMoon.pruebasFocalizadas().mana.filas)
```

Desde el juego:

```javascript
await darkMoonDebug.magia.balance.pruebasFocalizadas()
```

### Conclusión final fácil

**Qué analicé:** las cinco señales que habían quedado dudosas en 12.3 y el Maná necesario para utilizarlas.

**Por qué:** para evitar reducir habilidades o equipo basándonos en tablas incompletas.

**Conclusión:** las advertencias de Incinerar, Prisión glacial, Nube tóxica, Plaga corrosiva y doble varita se explican por sus contratos, posición, preparación o consumo de recursos. Las pruebas focalizadas no encontraron valores incorrectos.

**Qué pienso hacer:** no cambiar números en 12.3A. Mantener los valores actuales y trasladar a la prueba jugable final la sensación real de Incinerar contra grupos, el aprovechamiento de Prisión glacial, la permanencia de enemigos dentro de Nube tóxica y la sostenibilidad completa contra jefes.
