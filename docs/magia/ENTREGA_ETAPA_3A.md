# Entrega — ETAPA 3A: Estado de combate y regeneración de Vida

## Base

- Rama revisada: `main`.
- Commit base: `35b3a8f224ed9deb7d7080af342552d6f189bec8`.
- Etapa anterior: ETAPA 3 — Inteligencia, Sabiduría y economía de Maná.
- La implementación no realiza el commit.

## Objetivo cumplido

Se agregó un estado de combate explícito por mapa activo. La regeneración
natural de Vida del jugador queda pausada mientras existe al menos un enemigo
hostil involucrado; la regeneración de Maná conserva el reloj de 100 unidades y
la acumulación fraccionaria de la ETAPA 3.

## Arquitectura

### `EstadoCombatePartida`

- Es la fuente única de verdad.
- Usa un `Set` de enemigos por identidad de objeto.
- `estaEnCombate` se calcula a partir de la cantidad de participantes.
- El registro, la retirada y la limpieza son idempotentes.
- Emite `combate_iniciado` al pasar de cero a uno.
- Emite `combate_finalizado` al pasar de uno a cero o limpiar el mapa.

### `Juego`

- Crea un estado nuevo por cada mapa activo.
- Expone consultas sin permitir que la interfaz sea la fuente de verdad.
- Mantiene separados `modoCombateActivo` y `estaEnCombate`.
- Destruir el juego destruye también el estado y las referencias temporales.

### `CoordinadorTiempoPartida`

- Consulta el estado al procesar cada pulso.
- En combate no llama a `procesarRegeneracionVida` del jugador.
- Siempre llama a `procesarRegeneracionMana` del jugador.
- Mantiene sin cambios la regeneración de enemigos.
- Limpia participantes derrotados, inválidos o retirados del mapa.
- Integra eventos de IA y daño periódico con los eventos temporales existentes.
- Conserva una referencia interna y no serializable de la fuente combatiente de
  efectos hostiles; se elimina al morir o destruir el mapa.

### IA

- La adquisición inicial requiere distancia de percepción y línea de visión.
- La persecución ya iniciada utiliza el rango de persecución vigente.
- Detectar y perseguir registra al enemigo.
- Superar el rango de persecución lo retira.
- Un intento de ataque válido lo registra antes de resolver impacto o bloqueo.

### Ataque del jugador

- Abrir, mover o cancelar el selector no registra participantes.
- Confirmar un ataque válido contra un `Enemigo` lo registra antes de resolver
  el impacto, por lo que un fallo legítimo inicia combate.
- Atacar una casilla vacía o un destructible no hostil no inicia combate.
- Derrotar al enemigo lo retira mediante la limpieza temporal existente.

### Efectos

- Un efecto hostil puede indicar `fuenteCombatiente` al aplicarse mediante la
  fachada de `Juego`.
- La propiedad se elimina antes de delegar al motor de efectos.
- Los ticks contra enemigos vivos los registran como participantes.
- Los ticks contra el jugador registran a la fuente solamente si sigue viva y
  pertenece al mapa activo.
- Una fuente muerta o perteneciente a otro mapa no reactiva combate.

## Archivos nuevos

- `src/juego/combate/EstadoCombatePartida.js`
- `docs/magia/VALIDACION_CONSOLA_ETAPA_3A.md`
- `docs/magia/ENTREGA_ETAPA_3A.md`

## Archivos modificados

- `src/juego/Juego.js`
- `src/juego/combate/SistemaAlcanceAtaque.js`
- `src/juego/combate/SistemaCombateJugador.js`
- `src/juego/ia/SistemaAccionesEnemigos.js`
- `src/juego/tiempo/CoordinadorTiempoPartida.js`

## Archivos eliminados

Ninguno.

## Archivos revisados y no modificados

- `src/entidad/destructible/combatiente/Combatiente.js`
- `src/juego/combate/SistemaCombate.js`
- `src/juego/efectos/SistemaEfectosTemporales.js`
- `src/juego/curacion/SistemaCuracion.js`
- `src/aplicacion/ControladorPartida.js`
- `src/Partida/EstadoPartida.js`
- `src/interfaz/PanelPersonaje.js`

## Curación explícita

La condición de combate solamente rodea la llamada de regeneración natural de
Vida desde el pulso temporal. No modifica `recuperarVida`, `recuperarMana`,
consumibles, servicios ni la curandera.

## Limpieza

El estado se limpia por:

- muerte del jugador;
- muerte o retirada del último enemigo involucrado;
- pérdida definitiva de persecución;
- retirada de actores que ya no pertenecen al mapa;
- destrucción del `Juego` y del mapa;
- regreso a ciudad o cambio de mazmorra mediante la destrucción del juego activo;
- nueva partida, que crea otro `Juego` y otro estado.

## Validación realizada en la entrega

- Revisión del HEAD público y de los archivos fijados al SHA base.
- Revisión estática de delimitadores, cadenas, comentarios y plantillas de los
  seis archivos JavaScript entregados.
- Comprobación de que no se generaron `.mjs`, `.patch` ni dependencias.
- Comprobación de que la curandera no aparece en el conjunto de archivos modificados.
- Preparación de comandos deterministas para el navegador.

El entorno de preparación no pudo clonar ni ejecutar una partida desde GitHub
porque no resolvió el dominio. Por esa razón no se declara una ejecución real
del juego. La validación funcional final debe realizarse con los comandos y
casos manuales de `VALIDACION_CONSOLA_ETAPA_3A.md` sobre el repositorio local del
usuario.

## Criterios cubiertos por diseño y código

- Fuente única de verdad para `estaEnCombate`.
- Inicio por detección con persecución, intento hostil o daño periódico válido.
- No inicio por selector o por enemigos meramente existentes.
- Vida natural bloqueada en combate.
- Maná natural activo en ambos estados.
- Acumulador fraccionario de Vida pausado, no reiniciado.
- Recuperaciones explícitas no condicionadas.
- Enemigos no involucrados no prolongan combate.
- Limpieza por muerte y transición.
- Sin restricciones nuevas sobre inventario, equipo o viaje.

## Riesgos residuales

- Una habilidad futura debe pasar `fuenteCombatiente` si desea atribuir al actor
  exacto un efecto periódico aplicado al jugador.
- La línea de visión se exige solamente al adquirir al jugador; la persecución
  ya iniciada conserva la regla vigente de rango, tal como se decidió.
- La ejecución funcional depende de reemplazar estos archivos sobre exactamente
  el commit base o revisar previamente cualquier cambio posterior.

## Restricciones confirmadas

- Sin archivos `.patch`.
- Sin archivos `.mjs`.
- Sin `node:test`.
- Sin uso de Node.js para validar.
- Sin instalación de runtimes, bibliotecas o dependencias.
- Archivos JavaScript entregados completos.
- Pruebas previstas para consola del navegador y juego real.
- Sin commit realizado.
- Sin avance a la ETAPA 4.
