# ENTREGA P6.3C.1A — HABILIDADES INTERMEDIAS DE ÁREA

Fecha: 2026-08-06  
Etapa: P6.3C.1A  
Base obligatoria: `ec5933cd5090042f1be6511cbd5ad12ac5a65be3`  
Rama esperada: `main`

## 1. Objetivo

Representar en Phaser las habilidades intermedias de área no persistentes sin trasladar reglas jugables al backend gráfico. La subetapa incorpora **Explosión ígnea** y **Nova de escarcha**, conserva el contrato canónico `habilidad_resuelta`, sincroniza sus efectos temporales con el impacto correcto, muestra el elemento sobre todas las casillas afectadas y evita que las áreas atraviesen paredes.

## 2. Cierre documental de P6.3B.2

P6.3B.2 fue validada manualmente y cerrada en:

`ec5933cd5090042f1be6511cbd5ad12ac5a65be3`

README, Plan Maestro, Diseño Maestro y `ENTREGA_P6_3_B_2.md` se actualizan en esta entrega para reflejar ese cierre.

## 3. Cambios principales

- `habilidad_resuelta` agrega `idEjecucion` para correlacionar eventos derivados.
- `SistemaHabilidadesJugador` transporta ese identificador desde la ejecución real de la habilidad.
- `PlanificadorEventosVisuales` consume los eventos de estados temporales producidos por una misma ejecución y los adjunta al impacto correcto mediante `eventosEfectos`.
- los eventos correlacionados dejan de reproducirse dos veces en la cola superior.
- `ReproductorEventosVisualesPhaser` incorpora el patrón `area_conjurada`.
- se agrega `ResolucionEspacialHabilidades` como capa canónica de obstáculos, líneas de visión y políticas reutilizables.
- se agrega `PatronesVisualesHabilidades` como centralizador de patrones de presentación separado de la geometría jugable.
- se agrega `CreadorAreasHabilidadesPhaser` para construir núcleo, anillos, efectos por casilla y pulsos de objetivo.
- `habilidad_resuelta` conserva un objetivo primario explícito; una selección sobre suelo vacío no elige artificialmente al primer enemigo impactado.

## 4. Resolución espacial canónica

`ResolucionEspacialHabilidades.js` reutiliza `evaluarLineaVision()` de combate y centraliza políticas espaciales sin conocer daño ni presentación:

- `ignorar`;
- `vision_desde_centro`;
- `detener_en_obstaculo`;
- `vision_entre_saltos`.

Las formas de radio de las habilidades actuales se normalizan con `vision_desde_centro`. Cada casilla candidata debe ser suelo válido, estar dentro del radio y poseer línea de visión desde el centro. La lista resultante alimenta la vista previa, la selección de objetivos, el daño, las zonas futuras, Canvas 2D y Phaser.

## 5. Contrato visual de área

Las habilidades de área continúan dependiendo del dominio para:

- casilla central;
- casillas afectadas;
- orden de impactos;
- daño;
- crítico;
- derrota;
- recursos consumidos;
- aplicación, renovación o rechazo de estados.

Phaser solo reproduce el resultado ya resuelto.

## 6. Explosión ígnea

Secuencia visual:

1. conjuración breve en el ejecutor;
2. aparición de un núcleo ígneo en la casilla objetivo;
3. expansión radial por anillos;
4. brotes de fuego visibles sobre cada casilla canónica, incluso vacía;
5. pulsos de impacto sobre los objetivos del anillo activo;
6. daño, crítico, fallo y derrota por objetivo;
7. retorno y disipación.

La expansión utiliza las casillas canónicas transportadas por el evento. El núcleo siempre permanece en la casilla seleccionada. Si esa casilla contenía una entidad, solamente esa entidad recibe el pulso primario ampliado; si estaba vacía, todos los impactos usan la escala normal. Phaser no reconstruye radios ideales ni consulta la geometría.

## 7. Nova de escarcha

Secuencia visual:

1. conjuración sobre el ejecutor;
2. formación de un núcleo/anillo helado en el jugador;
3. onda expansiva por anillos;
4. fracturas y cristales visibles en cada casilla canónica;
5. pulsos fríos sobre los objetivos alcanzados;
6. daño y estados temporales sincronizados;
7. disipación final.

La Nova se centra en el actor. No crea un proyectil hacia sí mismo y no atraviesa paredes.

## 8. Correlación de efectos temporales

Los eventos `efecto_aplicado`, `efecto_renovado`, `efecto_intensificado`, `efecto_acumulado`, `efecto_resistido`, `efecto_inmune` y `efecto_rechazado` que comparten `idEjecucion` con la habilidad dejan de viajar sueltos. El planificador los asocia al objetivo visual correspondiente y el reproductor los lanza inmediatamente después del daño del impacto.

Ejemplo esperado para Nova:

1. anillo alcanza al objetivo;
2. daño y barra de Vida;
3. `RALENTIZADO` / `RALENTIZADO · RENOVADO` / resistencia, según corresponda.

## 9. Archivos principales

### Nuevos

- `src/juego/habilidades/ResolucionEspacialHabilidades.js`
- `src/interfaz/graficos/PatronesVisualesHabilidades.js`
- `src/interfaz/graficos/phaser/CreadorAreasHabilidadesPhaser.js`
- `docs/phaser/entregas/ENTREGA_P6_3_C_1_A.md`

### Modificados

- `src/config/magia/Habilidades.json`
- `src/config/presentacion/PerfilesHabilidadesVisuales.json`
- `src/juego/acciones/EventosAccion.js`
- `src/juego/habilidades/GeometriaHabilidades.js`
- `src/juego/habilidades/SistemaHabilidadesJugador.js`
- `src/juego/habilidades/ValidadorConfiguracionEjecucionHabilidades.js`
- `src/interfaz/graficos/PlanificadorEventosVisuales.js`
- `src/interfaz/graficos/ValidadorPerfilesHabilidadesVisuales.js`
- `src/interfaz/graficos/phaser/ReproductorEventosVisualesPhaser.js`
- `README.md`
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
- `docs/phaser/entregas/ENTREGA_P6_3_B_2.md`

## 10. Validaciones técnicas ejecutadas

- sintaxis JavaScript en archivos modificados;
- `git diff --check`;
- revisión de imports nuevos;
- verificación de que `idEjecucion` viaje desde la ejecución hasta el plan visual;
- verificación estática de que los eventos de efectos temporales correlacionados se adjunten al impacto y no queden duplicados en la cola superior;
- validación del catálogo de doce perfiles contra los patrones visuales;
- validación de nueve grados con forma de radio y política `vision_desde_centro`;
- prueba aislada con una pared entre el centro y una casilla del radio;
- comprobación de que la casilla posterior al muro queda excluida y las visibles se conservan;
- comprobación del transporte de objetivo primario explícito.

## 11. Pruebas manuales sugeridas

1. Lanzar Explosión ígnea sobre una casilla vacía con enemigos dentro del radio.
2. Confirmar que el núcleo permanece en la casilla seleccionada y todos los enemigos reciben pulsos normales.
3. Lanzar Explosión ígnea directamente sobre un enemigo y confirmar que solo ese objetivo recibe el pulso central ampliado.
4. Confirmar fuego visible en todas las casillas afectadas, estén vacías u ocupadas.
5. Lanzar Explosión ígnea junto a una pared y verificar que no haya selección, fuego ni daño detrás de ella.
6. Lanzar Nova de escarcha sobre varios enemigos y confirmar que la onda nace en el jugador.
7. Confirmar fracturas y cristales en todas las casillas afectadas.
8. Probar Nova junto a paredes, esquinas y corredores.
9. Verificar `RALENTIZADO`, `RENOVADO` o resistencia inmediatamente después del daño del objetivo afectado.
10. Cancelar una cola durante la expansión y comprobar limpieza.
11. Verificar que Canvas 2D sigue funcionando sin regresión jugable.

## 12. Estado Git esperado al entregar

- Rama: `main`.
- HEAD base: `ec5933cd5090042f1be6511cbd5ad12ac5a65be3`.
- Commit realizado: no.
- Push realizado: no.
- GitHub remoto modificado: no.

## 13. Conventional Commit propuesto

```text
feat(phaser): representar habilidades intermedias de area
```

## 14. Próximo paso

Después de validar manualmente esta entrega, continuar con **P6.3C.1B — Cadena de rayos**.
