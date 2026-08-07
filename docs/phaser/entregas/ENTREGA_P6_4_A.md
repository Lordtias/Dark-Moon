# ENTREGA P6.4A — Muerte y aparición inmediata de botín

## 1. Base utilizada

- Rama: `main`.
- SHA base exacto: `2ef2697ae2de753c305dac00082199c2e6505e63`.
- P6.3 queda cerrada con ese commit.
- No se realizaron commits, push ni modificaciones del historial durante esta entrega.

## 2. Objetivo

Sincronizar visualmente la derrota y el botín ya resuelto por el dominio para que una recompensa aparezca inmediatamente después de desaparecer el derrotado, incluso cuando la muerte ocurre dentro de una habilidad secuencial o una zona temporal. Coordinar además el modal de derrota del jugador con la finalización de la presentación Phaser.

## 3. Alcance implementado

- nuevo hecho canónico `botin_generado`;
- el evento conserva fuente, pila resultante, pila anterior cuando existía, posición, creación/actualización y cantidad ya resuelta;
- `SistemaBotin` continúa siendo la única autoridad para probabilidades, objetos, cantidades, rareza y consolidación;
- una tabla sin recompensa no genera evento ni animación;
- el plan visual correlaciona el botín con la derrota exacta y consume el evento tardío para evitar duplicaciones;
- ataque directo: impacto → derrota → botín;
- habilidades: derrota y botín quedan dentro del impacto correspondiente;
- Cadena de rayos y líneas pueden mostrar el botín antes de continuar con el siguiente tramo;
- áreas integran también la derrota/recompensa dentro de sus impactos;
- zonas temporales integran derrota y botín en la activación correspondiente;
- daño periódico correlaciona `combatiente_derrotado` con su recompensa posterior;
- una pila nueva entra con un `pop` corto;
- una pila existente pulsa sin crear una segunda bolsa;
- si la pila previa todavía no está dibujada por una cola acumulada, se utiliza como respaldo la aparición de la pila final;
- la textura de botín puede esperarse antes de crear la representación temporal;
- la escena final sigue siendo autoritativa y sustituye/reconcilia la representación transitoria;
- el modal de derrota espera la inactividad visual de Phaser, pero Canvas 2D conserva notificación inmediata.

## 4. Arquitectura

### Dominio

`ResolutorDerrotasJugador` continúa resolviendo retiro temporal, botín, experiencia y nivel. Solo agrega un evento descriptivo después de que `generarBotinEnSuelo` ya produjo la recompensa.

`SistemaBotin` expone además `botinAnterior` cuando una pila es reconstruida para que presentación pueda pulsar la entidad que ya estaba visible. No se cambia ninguna regla de generación.

### Planificador visual

`PlanificadorEventosVisuales` agrega `BOTIN_APARECIDO`. La correlación se realiza por referencia a la fuente derrotada y nunca por mensajes, posición aproximada o reglas de botín.

Cuando una derrota ya vive dentro de un impacto, el evento visual de botín se adjunta a ese mismo impacto. Si la derrota es independiente, el plan agrega derrota y botín consecutivamente.

### Phaser

`CompositorMundoPhaser` puede establecer una entidad visual temporal reutilizando el mismo constructor visual de las entidades normales. La representación se mantiene en la capa de entidades hasta que la escena final autoritativa es aplicada.

`ReproductorEventosVisualesPhaser` reproduce:

- creación: alpha 0 / escala 0.60 → 1.10 → 1.00;
- actualización: pulso 1.14 con retorno;
- efectos reducidos: entrada mínima sin ornamentación innecesaria.

La reproducción de un impacto procesa daño, efectos, derrota y luego botín en ese orden.

### Modal de derrota

El reproductor expone una promesa de inactividad. Esa espera sube de manera opcional por `EscenaArranquePhaser`, `RenderizadorPhaser` y `Renderizador`. `ProcesadorResultadoAccion` la usa únicamente antes de notificar la derrota al adaptador DOM.

El estado jugable no espera a Phaser: solo se demora la presentación del modal.

## 5. Archivos modificados de código

- `src/juego/acciones/EventosAccion.js`;
- `src/juego/botin/SistemaBotin.js`;
- `src/juego/combate/ResolutorDerrotasJugador.js`;
- `src/interfaz/graficos/PlanificadorEventosVisuales.js`;
- `src/interfaz/graficos/phaser/CompositorMundoPhaser.js`;
- `src/interfaz/graficos/phaser/ReproductorEventosVisualesPhaser.js`;
- `src/interfaz/graficos/phaser/EscenaArranquePhaser.js`;
- `src/interfaz/graficos/phaser/RenderizadorPhaser.js`;
- `src/interfaz/Renderizador.js`;
- `src/aplicacion/ProcesadorResultadoAccion.js`.

## 6. Documentación modificada

- `README.md`;
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`;
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`;
- `docs/phaser/entregas/ENTREGA_P6_3_F.md`.

## 7. Archivo nuevo

- `docs/phaser/entregas/ENTREGA_P6_4_A.md`.

## 8. Decisiones

- no se modifica ninguna tabla o probabilidad de botín;
- no se agregan cadáveres persistentes;
- no se deriva botín comparando escenas;
- no se adelanta la escena final para hacer aparecer la bolsa;
- el botín se correlaciona con la fuente canónica de la derrota;
- la espera del modal es un contrato opcional de presentación y no una espera del dominio;
- Canvas 2D no requiere lógica nueva para botín porque ya dibuja el estado final.

## 9. Pruebas realizadas

Pruebas dirigidas sin `node:test` comprobaron:

1. ataque directo produce visualmente `ataque_resuelto → entidad_derrotada → botin_aparecido`;
2. el evento de botín se consume una sola vez y no reaparece al final del plan;
3. Cadena de rayos conserva `derrotaVisual` y `botinVisual` dentro del impacto derrotante;
4. una muerte periódica produce `entidad_derrotada → botin_aparecido`;
5. una activación de zona derrotante conserva derrota y botín dentro del impacto;
6. una pila actualizada transporta correctamente `idBotinAnterior`;
7. el modal no se notifica mientras existe una promesa visual Phaser pendiente;
8. el modal se notifica al resolverse esa espera;
9. un backend sin espera visual, como Canvas, mantiene notificación inmediata.

Validaciones globales:

- sintaxis JavaScript completa;
- JSON completo;
- imports relativos;
- ausencia de `.mjs` y `.patch`;
- `git diff --check` sobre la copia limpia final;
- equivalencia del incremental aplicado contra el ZIP completo.

## 10. Pruebas manuales requeridas

1. matar un enemigo con ataque físico y comprobar desaparición → bolsa;
2. matar con proyectil mágico;
3. matar un objetivo intermedio con Cadena de rayos y confirmar que la bolsa aparece antes del salto siguiente;
4. matar con Incinerar o Descarga fulminante en una casilla intermedia;
5. matar varios enemigos con un área y comprobar que cada recompensa queda asociada a su muerte;
6. matar mediante Quemadura o Envenenamiento;
7. matar mediante Nube tóxica;
8. comprobar una tabla que no genere botín: no debe aparecer bolsa falsa;
9. generar botín donde ya existe una pila: debe pulsar una única bolsa;
10. comprobar que la bolsa final no queda duplicada después de terminar la cola;
11. probar `efectosReducidos`;
12. derrotar al jugador en Phaser y comprobar que el modal aparece después de la animación pendiente;
13. repetir derrota del jugador con Canvas 2D y comprobar respuesta inmediata;
14. cambiar de mapa/cancelar una cola y verificar que no queden entidades temporales residuales.

## 11. Exclusiones

- cambios de balance;
- cambios de XP;
- cambios de tablas, rareza o cantidad de botín;
- nuevos sprites obligatorios;
- cadáveres;
- sonidos;
- IA;
- modificaciones de inventario o recogida;
- regresión final de P6, reservada para P6.4B.

## 12. Riesgos conocidos

La textura puede necesitar una carga asíncrona la primera vez que aparece una bolsa; el reproductor espera ese recurso para evitar mostrar brevemente el respaldo ASCII. La sensación exacta del `pop`, la continuidad durante cadenas y el momento del modal requieren validación manual en navegador.

## 13. Próximo paso

Si P6.4A supera la validación manual y se commitea, continuar con **P6.4B — regresión integral y cierre general de P6**.

## 14. Commit propuesto

```text
feat(phaser): sincronizar muerte y aparición inmediata de botín

- emitir botin_generado después de resolver una recompensa real
- conservar la fuente y la identidad de pilas nuevas o actualizadas
- correlacionar cada recompensa con la derrota que la produjo
- mostrar botín inmediatamente después de retirar al derrotado
- integrar recompensas dentro de impactos de habilidades y zonas
- mantener el orden correcto durante cadenas, líneas y áreas
- pulsar pilas existentes sin crear una segunda bolsa
- evitar eventos visuales cuando la tabla no genera objetos
- reconciliar la aparición anticipada con la escena final autoritativa
- esperar la cola visual Phaser antes de presentar el modal de derrota
- mantener Canvas 2D inmediato y la lógica de botín fuera de Phaser
- cerrar documentalmente P6.3F y declarar P6.3 completada
```
