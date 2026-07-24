# ETAPA 2 — Motor genérico de efectos temporales

## Estado de la entrega

Implementación preparada sobre:

```text
Commit base: 4027f2639bae7164e01cf3328cd77428e82f22b0
Mensaje: feat(combate): incorporar daño elemental y resistencias
Rama prevista: main
```

No se realizó ningún commit ni se avanzó a la ETAPA 3.

## Resumen de implementación

La ETAPA 2 incorpora un motor dirigido por datos para registrar, aplicar, renovar, acumular, procesar y retirar efectos temporales sin asociar reglas al nombre de una habilidad.

El motor admite:

- daño periódico físico, fuego, frío, rayo o veneno;
- modificadores temporales de `factorTiempo`, `factorMovimiento`, `factorAtaque`, `factorAccion` y `factorConsumo`;
- inmovilización;
- aturdimiento;
- duración y ticks por unidades temporales;
- fuente estable y objetivo;
- renovación de duración;
- acumulación de intensidad;
- acumulación de cantidad;
- rechazo de duplicados;
- máximos configurables;
- eventos reutilizables por registro e interfaz;
- limpieza por muerte, retiro y destrucción del mapa;
- conservación de efectos del jugador entre transiciones válidas de la misma sesión.

## Decisiones actualizadas para la versión 1.3 del Plan Maestro

1. Los efectos activos del jugador sobreviven a la transición mazmorra-ciudad y ciudad-mazmorra durante la misma partida activa.
2. La transición no consume tiempo. Se preservan duración restante y tiempo restante hasta el próximo tick.
3. Los efectos de enemigos y entidades del mapa anterior se eliminan.
4. La fuente se conserva como descriptor estable y no como referencia al objeto destruido del mapa anterior.
5. No existen inmunidades, conversiones ni perfiles de control exclusivos para jefes.
6. Un jefe recibe inmovilización y aturdimiento mediante el mismo contrato que cualquier combatiente.
7. Las cuatro políticas de acumulación utilizan una sola instancia lógica y una sola cadencia temporal.
8. Reaplicar un efecto aceptado renueva su duración sin reiniciar el próximo tick.
9. `acumularIntensidad` aumenta una potencia numérica; `acumularCantidad` aumenta cargas enteras. Ambas respetan su máximo.
10. La limpieza genérica de efectos negativos queda preparada para una futura restauración en la ciudad, sin modificar todavía la curandera.

## Arquitectura final

```text
ControladorPartida
└── Juego
    └── CoordinadorTiempoPartida
        ├── SistemaTiempo
        │   └── agenda exclusiva de actores
        └── SistemaEfectosTemporales
            └── AgendaEventosTemporales
                ├── ticks
                └── vencimientos
```

### Agenda separada

Los efectos no se registran como actores. `SistemaTiempo` continúa administrando únicamente combatientes. `AgendaEventosTemporales` ordena ticks y vencimientos de forma determinista por instante, prioridad y orden de registro.

Cuando un tick coincide con el vencimiento, el tick se procesa primero. Para un efecto aplicado en 0 con duración 300 e intervalo 100, los ticks ocurren en 100, 200 y 300; el efecto vence inmediatamente después del último tick y no genera un cuarto tick.

### Daño periódico

Cada tick vuelve a llamar a `resolverPaqueteDanio`. Por lo tanto:

- Armadura solo mitiga el componente físico.
- Fuego, frío, rayo y veneno consultan la resistencia vigente del objetivo en ese instante.
- Cambiar resistencias antes de un tick cambia su resultado.
- El tick no realiza una nueva tirada de impacto, crítico o bloqueo.
- Una muerte por tick limpia los efectos y eventos pendientes del objetivo.

### Factores temporales

Los factores se recalculan desde un valor base capturado al aplicar el primer modificador. Los modificadores activos se combinan multiplicativamente. No se utilizan sumas y restas acumulativas para aplicar y revertir efectos.

Al retirar o vencer un modificador, el factor se reconstruye desde la base y los modificadores todavía activos. Al retirar el último, se restaura exactamente el valor base.

### Aturdimiento

El aturdimiento establece una disponibilidad mínima consultada por `SistemaTiempo`. No crea acciones ficticias ni altera de forma irreversible el próximo turno base del actor. Si el efecto se limpia antes de vencer, la disponibilidad efectiva se recalcula inmediatamente.

### Transición de mapa

Al destruir el juego anterior:

- los efectos del jugador se suspenden con tiempos relativos;
- sus modificadores efectivos se restauran temporalmente a la base;
- se limpian efectos y eventos de enemigos y otras entidades;
- el nuevo coordinador reanuda el estado del mismo objeto jugador;
- los tiempos relativos se trasladan al reloj del mapa nuevo sin consumir unidades temporales.

Esta continuidad es de sesión. Guardar y cargar efectos después de cerrar el navegador queda pendiente para la ETAPA 4, donde se trabajará la persistencia durable.

## Archivos nuevos

- `src/config/ConfiguracionEfectosTemporales.js`
- `src/juego/efectos/ContratosEfectosTemporales.js`
- `src/juego/efectos/SistemaEfectosTemporales.js`
- `src/juego/tiempo/AgendaEventosTemporales.js`
- `docs/magia/VALIDACION_CONSOLA_ETAPA_2.md`
- `docs/magia/ENTREGA_ETAPA_2.md`
- `docs/magia/Plan_Maestro_Magia_Habilidades_Maestrias_Dark_Moon_v1.3.docx`

## Archivos modificados

- `src/juego/tiempo/SistemaTiempo.js`
- `src/juego/tiempo/CoordinadorTiempoPartida.js`
- `src/juego/ia/SistemaAccionesEnemigos.js`
- `src/juego/movimiento/SistemaMovimientoJugador.js`
- `src/juego/Juego.js`
- `src/aplicacion/ControladorPartida.js` mediante el parche de integración incluido

## Archivos eliminados

Ninguno.

## Integración por sistema

### `SistemaTiempo`

- Conserva su responsabilidad sobre actores.
- Permite consultar una disponibilidad mínima efectiva, utilizada por el aturdimiento.
- Expone próximo turno base y efectivo para diagnóstico.
- No incorpora efectos a su `Map` de actores.

### `CoordinadorTiempoPartida`

- Integra regeneración, ticks, vencimientos y acciones de actores sobre un único reloj.
- Mantiene el orden simultáneo: regeneración, ticks, limpieza por muerte, vencimientos y acciones.
- Retira efectos al eliminar un actor.
- Suspende o limpia efectos al destruir un mapa.
- Expone aplicación, consulta y limpieza de efectos.

### IA

- Un enemigo inmovilizado puede atacar si ya tiene un objetivo válido dentro de alcance.
- Si necesita desplazarse, espera y consume el coste temporal normal de espera.
- Un enemigo aturdido no queda disponible hasta vencer o limpiarse el efecto.

### Movimiento y acciones del jugador

- Inmovilización rechaza únicamente el desplazamiento.
- Aturdimiento rechaza ataques, interacción, inventario, equipamiento, consumo, espera y movimiento.
- Mover selectores continúa sin consumir tiempo y no se trata como acción del combatiente.

### `Juego`

Expone las fachadas:

```js
juego.aplicarEfectoTemporal(definicion);
juego.obtenerEfectosTemporales(objetivo);
juego.retirarEfectosTemporales(objetivo, opciones);
juego.retirarEfectosNegativos(objetivo, opciones);
juego.destruir({ preservarEfectosJugador: true });
```

## Validaciones realizadas en este entorno

Se realizaron comprobaciones estáticas sobre los archivos entregados:

- delimitadores y bloques JavaScript balanceados;
- rutas relativas de módulos nuevos verificadas;
- ausencia de archivos `.mjs`;
- ausencia de `node:test`;
- ausencia de manifiestos o dependencias nuevas;
- ausencia de condiciones por nombre o ID de habilidad;
- ausencia de condiciones especiales por nombre o ID de jefe;
- presencia de una agenda separada de eventos temporales;
- presencia de limpieza por objetivo, actor y mapa;
- presencia de suspensión y reanudación entre mapas;
- actualización del documento maestro a versión 1.3 y revisión visual de todas sus páginas.

## Validaciones no ejecutadas en este entorno

No fue posible ejecutar el juego completo porque el entorno no dispuso de un checkout local escribible del repositorio. Chromium tampoco pudo completar una sesión headless estable en este contenedor.

Por lo tanto, no se afirma que las pruebas jugables o los comandos de consola hayan sido ejecutados aquí. Quedan preparados en `VALIDACION_CONSOLA_ETAPA_2.md` para ejecutarse sobre el repositorio real, desde el navegador y sin instalar software.

## Comandos deterministas preparados

El documento de validación incluye 35 comprobaciones para:

- contrato y datos inválidos;
- ticks exactos y ausencia de tick extra;
- resistencias actuales por tick;
- renovación sin reiniciar cadencia;
- renovación después del último tick que cabía en la duración anterior;
- intensidad y cantidad con máximos;
- rechazo de duplicados;
- superposición y restauración exacta de factores;
- diferencia entre inmovilización y aturdimiento;
- disponibilidad efectiva y limpieza anticipada del aturdimiento;
- muerte antes del siguiente evento;
- transferencia entre mapas;
- descriptor estable de fuente;
- limpieza genérica para restauración futura.

Resultado esperado al ejecutarlos:

```text
ETAPA 2: 35/35 comprobaciones correctas; 0 fallidas.
```

## Pruebas manuales pendientes en el juego real

- humo completo de movimiento, espera, ataque, arco, munición, doble arma, inventario, equipo y consumibles;
- veneno con resistencias 0, 25 y 75;
- cambio de resistencia entre ticks;
- ralentizaciones superpuestas y vencimiento en distinto orden;
- inmovilización dentro y fuera del alcance de ataque;
- aturdimiento de jugador y enemigo;
- mismo control sobre enemigo normal, especial y jefe;
- muerte antes de tick;
- retiro manual de actor;
- transición mazmorra-ciudad con efecto activo;
- continuidad de ticks en ciudad;
- restauración mediante la fachada genérica;
- múltiples transiciones sin eventos huérfanos;
- consola sin errores, `NaN` ni referencias a mapas anteriores.

## Criterios de aceptación cubiertos por diseño

- El efecto se describe mediante datos y no por nombre de habilidad.
- Fuente, objetivo, tipo, valor, duración, intervalo, política y máximo están representados.
- El daño periódico vuelve a pasar por componentes y resistencias en cada tick.
- La ralentización modifica factores temporales.
- No se restauran factores mediante sumas/restas inseguras.
- Al vencer un efecto quedan exactamente los modificadores todavía activos.
- Los efectos no son actores.
- Se limpian eventos por muerte, retiro y destrucción de mapa.
- Los efectos del jugador sobreviven a una transición válida de sesión.
- Los jefes usan el contrato general sin excepciones especiales.
- Las acumulaciones respetan máximos y comparten una única cadencia.
- Se producen eventos reutilizables.
- Se conserva la compatibilidad conceptual con daño físico y elemental existente.

La aceptación ejecutable queda condicionada a obtener 35/35 en la consola y completar la prueba de humo dentro del juego real.

## Riesgos y limitaciones pendientes

1. **Aplicación sobre el checkout real.** El parche de `ControladorPartida` debe insertarse en el método exacto del repositorio y revisarse junto con cualquier cambio local no publicado.
2. **Persistencia durable.** Los efectos sobreviven entre mapas de la sesión, pero todavía no se serializan para cerrar y cargar la partida.
3. **Curandera.** Existe la operación genérica de limpieza; todavía no hay botón, precio ni regla de servicio para restaurar estados.
4. **Balance de control.** Al no existir excepciones para jefes, duración, probabilidad, Maná y coste temporal de habilidades futuras deberán evitar cadenas de control dominantes.
5. **Interfaz.** Los eventos y estados existen, pero todavía no se muestran iconos, duración ni intensidad.
6. **Contenido.** Ninguna habilidad utiliza aún el motor; la validación inicial se realiza desde consola.
7. **Factores permanentes durante un efecto.** El motor conserva la base capturada al comenzar la modificación. Una futura fuente que cambie permanentemente factores mientras el efecto está activo deberá notificar o recalcular esa base mediante una extensión explícita.

## Fuera de alcance respetado

No se implementaron:

- Ascua, Esquirla de hielo, Chispa o Aguijón tóxico;
- ninguna de las doce habilidades;
- Nube tóxica o zonas persistentes;
- cambios de Inteligencia, Sabiduría, Maná máximo o regeneración;
- maestrías, experiencia, niveles o puntos;
- catalizadores, bastones, varitas, doble varita o consumo de Maná de varitas;
- afijos elementales activos;
- enemigos elementales;
- interfaz visual de efectos;
- persistencia durable de efectos;
- ETAPA 3.

## Restricción de herramientas confirmada

- No se incorporaron archivos `.mjs`.
- No se utilizó `node:test`.
- No se agregaron instrucciones que requieran Node.js.
- No se instalaron runtimes, librerías ni dependencias externas.
- Las validaciones ejecutables se prepararon para la consola del navegador.

## Conventional Commit propuesto

### Título

```text
feat(efectos): agregar motor de efectos temporales
```

### Descripción

```text
- incorpora contratos dirigidos por datos para daño periódico, modificadores temporales, inmovilización y aturdimiento
- agrega una agenda determinista de ticks y vencimientos separada de los actores
- integra efectos, regeneración y disponibilidad de combatientes con SistemaTiempo
- implementa renovación, acumulación de intensidad, acumulación de cantidad y rechazo de duplicados con límites configurables
- recalcula factores desde valores base y restaura exactamente los modificadores activos
- conserva los efectos del jugador entre transiciones válidas sin avanzar el tiempo
- limpia efectos y eventos de enemigos al morir, retirarse o destruirse el mapa
- expone eventos y fachadas reutilizables para interfaz, registro y restauración futura
- actualiza el Plan Maestro a la versión 1.3 con registro de cambios entre etapas

No incorpora habilidades, zonas persistentes, reglas especiales para jefes, Node.js, archivos .mjs ni dependencias externas.
```

## Prompt para la ETAPA 3

```text
Quiero continuar el Plan Maestro de Magia, Habilidades y Maestrías de Dark Moon.

Repositorio: https://github.com/Lordtias/Dark-Moon.git
Rama: main
Especificación operativa: docs/magia/ETAPA_0_REVALIDACION_ESPECIFICACION.md
Documento maestro actualizado: docs/magia/Plan_Maestro_Magia_Habilidades_Maestrias_Dark_Moon_v1.3.docx
Último commit confirmado de la ETAPA 2:
<SHA_ETAPA_2_CONFIRMADO_DESPUES_DEL_PUSH>
Etapa solicitada: ETAPA 3 — Inteligencia, Sabiduría y economía de Maná

Revisá directamente el último estado de main, el historial reciente, la especificación, el documento maestro v1.3 y el código relacionado. Verificá el HEAD real y comparalo con el SHA de la ETAPA 2 indicado. No asumas que continúa siendo el último commit.

Antes de escribir código, comprobá especialmente:
- el motor de componentes de daño y resistencias de la ETAPA 1;
- el motor genérico de efectos temporales de la ETAPA 2;
- la agenda separada de ticks y vencimientos;
- la disponibilidad efectiva por aturdimiento;
- el recálculo seguro de factores;
- la conservación de efectos del jugador entre mazmorra y ciudad;
- la limpieza de efectos de enemigos y mapas;
- la operación genérica de restauración de efectos negativos;
- el registro de cambios incorporado al Plan Maestro v1.3.

Decisiones vigentes que deben conservarse:
- los efectos del jugador sobreviven a transiciones válidas dentro de la misma sesión;
- la transición no consume tiempo y conserva duración y próximo tick relativos;
- los efectos de enemigos se limpian con el mapa;
- los jefes no poseen inmunidades ni conversiones especiales de control;
- las acumulaciones utilizan una sola instancia y una sola cadencia;
- reaplicar renueva duración sin reiniciar el próximo tick;
- la persistencia durable de efectos todavía queda para la etapa de persistencia;
- la curandera no debe modificarse en la ETAPA 3.

Restricción obligatoria de pruebas:
- no incorporar archivos .mjs;
- no utilizar node:test;
- no utilizar Node.js;
- no instalar runtimes, librerías ni dependencias externas;
- validar mediante pruebas manuales dentro del juego y comandos deterministas copiables en la consola del navegador.

Antes de implementar, explicame:
1. HEAD actual, mensaje y relación con el commit de ETAPA 2;
2. estado real de atributos, recursos, regeneración, combate, efectos y persistencia;
3. qué exige exactamente la ETAPA 3 según el documento v1.3;
4. fórmulas y configuración propuestas para Inteligencia, Sabiduría, Maná máximo, potencia de efectos y regeneración;
5. cómo evitar recalcular incorrectamente efectos ya aplicados al cambiar atributos o de mapa;
6. archivos a crear, modificar o eliminar;
7. contradicciones, decisiones y riesgos;
8. pruebas manuales y comandos deterministas;
9. criterios de aceptación;
10. fuera de alcance.

Después de presentar la revisión y el plan, detenete y esperá mi aprobación explícita. No escribas código hasta que responda exactamente:

Aprobado. Podés implementar la etapa.

No realices el commit ni avances a la ETAPA 4.
```
