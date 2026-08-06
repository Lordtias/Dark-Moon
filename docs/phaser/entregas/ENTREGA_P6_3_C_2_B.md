# ENTREGA P6.3C.2B — ACTIVACIONES VISUALES DE ZONAS TEMPORALES

Fecha: 2026-08-06  
Etapa: P6.3C.2B  
Base obligatoria: `4c124b9b45489dba723f9a70848c59d316229e0c`  
Rama esperada: `main`
Estado: validada manualmente y cerrada en `69a400a87c00cb7d3c85c36d3753a8f6e9a90e0a`

## 1. Objetivo

Completar el ciclo visual de las zonas temporales conectando las activaciones `al_crear`, `al_entrar` y `por_intervalo` con sus resultados canónicos. La presentación recibe daño, fallo, crítico, efectos temporales y derrotas ya resueltos, sin calcular reglas dentro de Phaser o Canvas 2D.

## 2. Cierre documental de P6.3C.2A

P6.3C.2A fue validada manualmente y cerrada en:

`4c124b9b45489dba723f9a70848c59d316229e0c`

La persistencia, renovación, vencimiento, superposición y reconciliación visual de Nube tóxica quedan tomadas como aprobadas.

## 3. Contrato canónico de activación

Cada `zona_temporal_activada` conserva ahora:

- `idEjecucion` propio de la activación;
- zona e instante;
- motivo de activación;
- objetivo y posición congelada;
- impacto, crítico y derrota;
- daño y Vida anterior/posterior;
- resolución de impacto cuando no existe daño directo;
- efectos aplicados;
- eventos derivados de esos efectos.

Los eventos derivados se agregan inmediatamente después de la activación que los produjo.

## 4. Activación al crear

La creación conserva una sola autoridad visual:

1. `habilidad_resuelta` despliega la nube;
2. reproduce los impactos iniciales;
3. reproduce Envenenamiento, renovación, resistencia o inmunidad;
4. `zona_temporal_creada` establece la representación persistente.

Las activaciones iniciales y sus eventos derivados se correlacionan con los impactos de la habilidad mediante el `idEjecucion` de cada objetivo. No se duplican daño, texto, estado ni derrota.

## 5. Activación al entrar

El orden visual es:

1. movimiento del actor;
2. llegada a la casilla;
3. remolino local de la zona;
4. activación tóxica sobre el actor;
5. daño, fallo o crítico;
6. Envenenamiento, renovación, resistencia o inmunidad;
7. derrota, si corresponde.

Entrar no vuelve a desplegar toda la zona.

## 6. Activación por intervalo

Cada intervalo genera primero `zona_temporal_pulso`, incluso cuando la zona está vacía.

Después se reproducen las activaciones de los ocupantes en el orden canónico ya resuelto. El pulso global no aplica daño y solamente comunica que el intervalo ocurrió.

## 7. Eventos visuales neutrales

Se incorporan:

- `zona_temporal_pulso`;
- `actor_entro_zona_temporal`;
- `zona_temporal_activada`.

`PlanificadorEventosVisuales` correlaciona los eventos de estados temporales con la activación correcta y los elimina de la cola superior para evitar duplicados.

## 8. Phaser

`CreadorZonasTemporalesPhaser` agrega reacciones locales reutilizables para entrada e impacto. `ReproductorEventosVisualesPhaser` reproduce:

- pulso global de todas las casillas;
- remolino local al entrar;
- reacción tóxica local al activarse;
- daño, fallo y crítico;
- estados temporales asociados;
- derrota dentro de la misma activación.

La nube persistente continúa siendo un objeto separado e identificado por `zonaId`.

## 9. Canvas 2D

Canvas 2D incorpora:

- pulso global de intervalo;
- marca local de entrada;
- marca local de activación;
- lectura de estados temporales anidados dentro de habilidades y zonas.

La representación es simplificada, pero usa los mismos eventos neutrales.

## 10. Archivos principales modificados

- `src/juego/zonas/SistemaZonasTemporales.js`
- `src/juego/acciones/EventosAccion.js`
- `src/juego/habilidades/SistemaHabilidadesJugador.js`
- `src/interfaz/graficos/PlanificadorEventosVisuales.js`
- `src/interfaz/graficos/RenderizadorCanvas2D.js`
- `src/interfaz/graficos/phaser/CreadorZonasTemporalesPhaser.js`
- `src/interfaz/graficos/phaser/ReproductorEventosVisualesPhaser.js`

## 11. Archivos documentales

- `README.md`
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
- `docs/phaser/entregas/ENTREGA_P6_3_C_2_A.md`
- `docs/phaser/entregas/ENTREGA_P6_3_C_2_B.md`

## 12. Exclusiones

No se modifican:

- daño o balance de Nube tóxica;
- duración e intervalo;
- geometría o paredes;
- política de superposición;
- IA con habilidades;
- habilidades avanzadas;
- persistencia entre mapas;
- sonidos.

## 13. Validaciones técnicas

- orden `creación → activación → efecto`;
- orden `movimiento → entrada → activación → efecto`;
- orden `pulso → activaciones por objetivo`;
- pulso global con zona vacía;
- correlación de eventos por `idEjecucion`;
- ausencia de duplicados en `al_crear`;
- daño y Vida transportados completos;
- derrota integrada dentro de la activación;
- sintaxis JavaScript;
- JSON e imports relativos;
- `git diff --check`;
- integridad del ZIP completo e incremental.

## 14. Pruebas manuales sugeridas

1. Crear Nube tóxica sobre uno y varios enemigos.
2. Confirmar que daño y `ENVENENADO` aparecen una sola vez.
3. Crear la zona sobre suelo vacío.
4. Entrar con jugador y enemigo desde fuera.
5. Confirmar que moverse dentro sin salir no reactiva `al_entrar`.
6. Entrar con Envenenamiento activo y verificar renovación.
7. Probar resistencia o inmunidad.
8. Esperar un intervalo con la zona vacía.
9. Esperar un intervalo con uno y varios ocupantes.
10. Provocar una derrota al entrar o durante un intervalo.
11. Renovar y superponer zonas.
12. Cancelar durante un pulso.
13. Cambiar de mapa.
14. Verificar Canvas 2D.

## 15. Estado Git esperado al entregar

- Rama: `main`.
- HEAD base: `4c124b9b45489dba723f9a70848c59d316229e0c`.
- Commit realizado: no.
- Push realizado: no.
- GitHub remoto modificado: no.

## 16. Conventional Commit propuesto

```text
feat(phaser): completar activaciones visuales de zonas
```

## 17. Próximo paso

P6.3C.2B fue validada manualmente y cerrada en `69a400a87c00cb7d3c85c36d3753a8f6e9a90e0a`. La siguiente entrega es **P6.3D.1 — Incinerar y Descarga fulminante**.
