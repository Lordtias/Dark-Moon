# ENTREGA ETAPA 6 — Catalizadores y ataques básicos mágicos

## Estado

```text
Repositorio: Lordtias/Dark-Moon
Rama revisada: main
Commit base confirmado: 7e5586ff1c936a376ea7b5b2c24d604ffa6091f3
Commit realizado: no
Push realizado: no
```

ETAPA 6 queda preparada como un único conjunto acumulado de archivos completos. No se avanzó a ETAPA 7.

## Resultado funcional

La etapa incorpora catalizadores y ataques básicos mágicos sobre los motores existentes de objetos, combate, tiempo, daño elemental, efectos y habilidades.

- El atributo se llama **Potencia de Habilidad** y se expresa como porcentaje.
- Bastones y varitas pueden aportar Potencia de Habilidad.
- El prefijo **Enfocado** agrega Potencia adicional únicamente a esas familias.
- Existen cuatro varitas por Tier: Fuego, Frío, Rayo y Veneno.
- Con los dos tiers actuales existen ocho varitas.
- Las varitas son de una mano y pueden ocupar `arma` o `secundaria`.
- Dos varitas reutilizan la única regla dual vigente; no existe una ecuación paralela.
- El ataque básico de varita es elemental, a distancia, sin munición y con coste de Maná.
- El ataque integra Precisión, Evasión, Crítico y resistencias mediante el motor común.
- Los bastones conservan ataque físico cuerpo a cuerpo, dos manos y coste de Maná cero.
- Lanzar una habilidad sigue siendo posible sin catalizador.

## Catálogo y balance provisional

### Bastones

| Objeto | Tier | Potencia de Habilidad |
|---|---:|---:|
| Bastón de aprendiz | I | +15 % |
| Bastón reforzado | II | +25 % |

### Varitas

| Tier | Elementos | Potencia | Maná por descarga |
|---|---|---:|---:|
| I | Fuego, Frío, Rayo y Veneno | +8 % | 1 |
| II | Fuego, Frío, Rayo y Veneno | +12 % | 1 |

Los IDs históricos `varita_aprendiz` y `varita_canalizada` se conservan como variantes de Fuego para facilitar la migración de guardados.

### Prefijo Enfocado

| Grado | Potencia adicional |
|---|---:|
| I | +4 % a +6 % |
| II | +7 % a +10 % |
| III | +11 % a +15 % |

Los valores son configurables y quedan sujetos al balance posterior.

## Arquitectura

### Carga de configuración

`CargadorConfiguracionCatalizadores` carga primero los catálogos originales y luego aplica extensiones controladas. No reemplaza el cargador general ni duplica las reglas comunes.

### Catalizadores

`SistemaCatalizadores` concentra:

- identificación de bastones y varitas;
- lectura y validación de Potencia de Habilidad;
- validación de cuatro elementos por Tier;
- construcción del multiplicador que consumen las habilidades;
- aplicación de los mismos multiplicadores de mano usados por el combate dual.

### Ataque mágico

`ConfiguracionAtaque` conserva una sola fórmula dual. Las varitas participantes suman su coste de Maná antes de la acción. La operación se rechaza íntegramente si el recurso no alcanza.

`EstadisticasDerivadas` convierte cada varita en una fuente con un único componente de Fuego, Frío, Rayo o Veneno. Los rangos físicos provisionales conservados para compatibilidad estructural no entran en la resolución.

`SistemaCombate` no fue duplicado: recibe las fuentes elementales y continúa resolviendo impacto, crítico, resistencias, muerte y mensajes por mano.

### Habilidades

`MotorDanioHabilidad` y `MotorEfectosHabilidad` consumen el contexto de catalizador:

- el daño directo recibe el multiplicador de Potencia;
- una magnitud inicial escalable puede recibirlo;
- duración, intervalo y número de pulsos no cambian;
- dos varitas no producen dos lanzamientos;
- sin catalizador se utiliza multiplicador neutral `1`.

`ProgresoMagicoJugador`, grados, `idEjecucion`, deduplicación de experiencia y consumo de Maná de habilidades permanecen bajo los contratos de ETAPA 4 y ETAPA 5.

### Respaldo sin Maná

La tecla `G` activa temporalmente el ataque natural sin desequipar las varitas. Se confirma con `F` y se cancela con `Escape`. El jugador también puede esperar regeneración o cambiar de arma.

### Persistencia

La migración de las dos varitas históricas:

- recompone sus propiedades finales con la plantilla elemental vigente;
- conserva rareza, nivel, prefijos, sufijos, cantidad y ubicación;
- recorre inventario, equipo y contenedores anidados;
- no altera oro, progreso mágico ni el snapshot original.

### Interfaz

El presentador común muestra:

```text
Potencia de Habilidad: +N %
```

Además, las varitas muestran daño elemental, elemento y Maná por ataque. El comparador informa diferencias de Potencia en puntos porcentuales. Inventario, equipamiento y comercio reciben el cambio por reutilizar los presentadores compartidos.

## Regla dual conservada

La etapa no introduce una fórmula especial para varitas. Continúan utilizándose:

- multiplicador de mano principal;
- multiplicador de mano secundaria;
- coste del arma más lenta más el recargo configurado sobre la rápida;
- arma principal como controladora del selector.

Con dos varitas de coste base `85`, el coste temporal base actual es `111`.

## Atomicidad del Maná

Antes de daño, hostilidad o tiempo se comprueban geometría y recursos.

- una varita requiere `1` de Maná;
- dos varitas requieren `2`;
- el coste combinado debe poder pagarse completo;
- una anomalía durante el descuento restaura el Maná y lanza un error;
- falta de Maná no limpia el selector ni consume tiempo;
- un ataque aceptado consume Maná aunque falle o apunte a una casilla vacía.

## Archivos

La entrega contiene 23 archivos de código/configuración completos:

- 9 nuevos;
- 14 reemplazos de archivos existentes.

La descripción individual se encuentra en `MANIFIESTO_ARCHIVOS_ETAPA_6.md`.

## Validación realizada

### Sintaxis

```text
Archivos JavaScript compilados en V8: 21
Resultado: OK
```

### Contratos funcionales en navegador

```text
Comprobaciones deterministas: 25/25
Resultado: OK
```

Incluyeron catálogo, dual wield, Maná atómico, bastones, componentes elementales, Precisión/Crítico, migración, interfaz, comparación, Potencia aplicada a habilidades y funcionamiento sin catalizador.

### Restricciones

```text
Archivos .patch: 0
Archivos .mjs: 0
node:test: no utilizado
Node.js: no utilizado
Dependencias externas: 0
Commit realizado: no
```

## Limitación y prueba pendiente

No fue posible ejecutar la interfaz completa del repositorio en este entorno porque no se obtuvo un clon Git integral y el navegador bloqueó la navegación a servidores locales. Se ejecutaron los módulos reales afectados dentro de Chromium mediante módulos `Blob` y sustitutos mínimos de las dependencias ajenas al paquete.

Por tanto, antes del commit son obligatorias las pruebas de `VALIDACION_CONSOLA_ETAPA_6.md` dentro de una copia local completa de Dark Moon.

## Criterios comprobados

- Ocho varitas con cuatro elementos por Tier.
- Bastones de dos manos y cuerpo a cuerpo.
- Potencia visible únicamente en catalizadores.
- Prefijo Enfocado restringido a bastones y varitas.
- Doble varita con la regla dual común.
- Coste de Maná combinado y rechazo atómico.
- Ataque elemental puro sin munición.
- Precisión, Evasión y Crítico preservados.
- Resistencia elemental delegada al motor común.
- Habilidades posibles sin catalizador.
- Un único lanzamiento con doble varita.
- Migración de varitas históricas sin perder afijos ni oro.
- Comparador y comercio reutilizan la presentación común.

## Riesgos pendientes

- El balance de daño, alcance, velocidad y Potencia es provisional.
- Las varitas conservan campos físicos internos por compatibilidad con el validador general; el combate y la interfaz los ignoran.
- La instrumentación de ETAPA 5 continúa siendo dinámica. Se corrigió su compatibilidad con los nombres reales `player` y `map`, pero la inyección explícita puede abordarse en ETAPA 7.
- Las ocho varitas reutilizan recursos visuales provisionales; sus sprites definitivos quedan fuera de esta etapa.
- Deben probarse manualmente comercio, guardado real, transición de mapas y regresiones de arco/doble arma física.

## Fuera de alcance

- Implementar las once habilidades restantes.
- Otorgar experiencia de maestría por ataques básicos.
- Crear habilidades concedidas por objetos.
- Añadir efectos temporales propios a las descargas de varita.
- Diseñar sprites definitivos.
- Completar árbol de maestrías, drag-and-drop y tooltips avanzados.
- Balance definitivo de ETAPA 12.
- Persistir agenda, combate, selector, efectos activos o `idEjecucion`.
- Realizar el commit o avanzar a ETAPA 7.

## Conventional Commit sugerido

```text
feat(magia): agregar catalizadores y ataques básicos mágicos

- incorpora Potencia de Habilidad porcentual en bastones y varitas
- agrega cuatro varitas elementales por cada Tier existente
- habilita doble varita mediante la regla dual común
- consume Maná de forma atómica en ataques básicos de varita
- integra daño elemental, precisión, evasión, crítico y resistencias
- conserva bastones físicos de dos manos y ataque natural de respaldo
- aplica Potencia de Habilidad al motor común de habilidades
- agrega el prefijo Enfocado restringido a catalizadores
- migra varitas históricas sin perder rareza, afijos ni persistencia
- muestra Potencia, elemento y Maná en detalle, comercio y comparador
- añade validación determinista para consola del navegador

Docs: actualiza el plan maestro a v1.7 y documenta ETAPA 6
```

## Prompt para la etapa siguiente

```text
Quiero continuar el Plan Maestro de Magia, Habilidades y Maestrías de Dark Moon.

Repositorio: https://github.com/Lordtias/Dark-Moon.git
Rama: main
Especificación operativa: docs/magia/ETAPA_0_REVALIDACION_ESPECIFICACION.md
Documento maestro actualizado: docs/magia/Plan_Maestro_Magia_Habilidades_Maestrias_Dark_Moon_v1.7.docx
Entrega anterior: docs/magia/ENTREGA_ETAPA_6.md
Último commit confirmado de la ETAPA 6: [PEGAR SHA REAL DESPUÉS DEL COMMIT]

Etapa solicitada: ETAPA 7 — Interfaz completa de habilidades y maestrías

Revisá el HEAD real, el historial, la especificación, el documento maestro v1.7, la entrega de ETAPA 6 y el código relacionado. No asumas que el SHA indicado continúa siendo HEAD.

Antes de implementar, revisá especialmente la barra de diez ranuras, los grados de ProgresoMagicoJugador, puntos universales y específicos, requisitos de maestría, asignación y desasignación de habilidades, iconos, tooltips, teclado, persistencia visual decidida y la integración dinámica de ETAPA 5.

Mantené las restricciones: archivos completos, sin .patch, sin .mjs, sin node:test, sin Node.js ni dependencias externas; validación manual dentro del juego y comandos copiables en la consola del navegador.

Presentá primero revisión, alcance, arquitectura, archivos y pruebas. Detenete y esperá aprobación explícita antes de escribir código.
```
