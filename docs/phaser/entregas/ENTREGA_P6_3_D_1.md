# ENTREGA P6.3D.1 — HABILIDADES AVANZADAS LINEALES

Fecha: 2026-08-06
Etapa: P6.3D.1
Base de implementación: `69a400a87c00cb7d3c85c36d3753a8f6e9a90e0a`
Commit de cierre P6.3D.1: `b88c2c57c30c438d21223c9487ff08629b2ab335`
Rama validada: `main`
Estado: validada y commiteada

## 1. Objetivo

Representar Incinerar y Descarga fulminante mediante un patrón lineal reutilizable, asegurando que vista previa, objetivos, daño y presentación consuman una única trayectoria canónica que pasa por la casilla seleccionada y se detiene ante paredes.

## 2. Cierre documental de P6.3C.2B

P6.3C.2B fue validada manualmente y cerrada en:

`69a400a87c00cb7d3c85c36d3753a8f6e9a90e0a`

Las activaciones visuales `al_crear`, `al_entrar` y `por_intervalo` de zonas temporales quedan tomadas como aprobadas.

## 3. Resolución espacial canónica

`ResolucionEspacialHabilidades.js` incorpora `resolverLineaHastaObstaculo()`.

La operación:

- parte del ejecutor;
- pasa realmente por la casilla seleccionada, incluso en trayectorias oblicuas;
- continúa en esa dirección hasta la longitud configurada;
- genera un recorrido ordenado;
- detiene el eje al encontrar una pared o salir del mapa;
- excluye casillas laterales bloqueadas;
- no consulta objetivos, daño, efectos ni presentación.

Incinerar y Descarga fulminante declaran en sus tres grados:

```json
"politicaObstaculos": "detener_en_obstaculo"
```

## 4. Geometría y orden de objetivos

`GeometriaHabilidades.js` delega la construcción lineal en el resolutor espacial.

La misma trayectoria se utiliza para:

- casillas afectadas;
- vista previa;
- recorrido neutral;
- selección de objetivos;
- orden de resolución;
- presentación visual.

Los objetivos se ordenan desde el ejecutor hacia el extremo de la línea. El enemigo seleccionado fija la dirección, pero no recibe un multiplicador ni un énfasis visual especial.

## 5. Patrón visual reutilizable

El patrón `linea` define ahora:

- representación de todas las casillas;
- recorrido ordenado;
- impactos asociados a cada casilla;
- conservación breve del rastro;
- ausencia de objetivo primario visual.

La configuración concreta continúa en `PerfilesHabilidadesVisuales.json`.

## 6. Incinerar

La presentación incluye:

- carga cálida en el ejecutor;
- avance casilla por casilla;
- cinta de fuego entre centros;
- suelo encendido en todas las casillas canónicas;
- llamaradas y brasas incluso en casillas vacías;
- combustión local sobre objetivos;
- daño, fallo, crítico y Quemadura sincronizados;
- derrota en la casilla correspondiente.

## 7. Descarga fulminante

La presentación incluye:

- carga eléctrica alrededor del ejecutor;
- descarga gruesa y quebrada;
- núcleo blanco;
- ramificaciones laterales;
- marca eléctrica en todas las casillas canónicas;
- fulminación local sobre objetivos;
- daño, fallo, crítico y Aturdimiento sincronizados;
- derrota en la casilla correspondiente.

## 8. Derrotas integradas

Las habilidades con secuencia `linea_conjurada` integran la derrota en el impacto correspondiente.

Esto evita que una entidad permanezca visible hasta el final de toda la línea o que su desaparición se reproduzca dos veces.

## 9. Nuevo componente Phaser

Se incorpora:

```text
src/interfaz/graficos/phaser/CreadorLineasHabilidadesPhaser.js
```

Construye únicamente recursos visuales:

- carga;
- tramos;
- marcas de casilla;
- impactos.

No conoce paredes, alcance, objetivos, daño, Maná, críticos ni estados temporales.

## 10. Canvas 2D

Canvas 2D conserva la vista previa completa mediante `casillasAfectadas` y `recorrido`. No recibe reglas nuevas ni reconstruye la trayectoria.

## 11. Archivos principales modificados

- `src/config/magia/Habilidades.json`
- `src/juego/habilidades/ResolucionEspacialHabilidades.js`
- `src/juego/habilidades/GeometriaHabilidades.js`
- `src/juego/habilidades/ValidadorConfiguracionEjecucionHabilidades.js`
- `src/interfaz/graficos/PatronesVisualesHabilidades.js`
- `src/interfaz/graficos/PlanificadorEventosVisuales.js`
- `src/interfaz/graficos/phaser/ReproductorEventosVisualesPhaser.js`

## 12. Archivos nuevos

- `src/interfaz/graficos/phaser/CreadorLineasHabilidadesPhaser.js`
- `docs/phaser/entregas/ENTREGA_P6_3_D_1.md`

## 13. Documentación actualizada

- `README.md`
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
- `docs/phaser/entregas/ENTREGA_P6_3_C_2_B.md`

## 14. Exclusiones

No se modifica:

- daño, Maná, costos temporales o probabilidades;
- Prisión glacial;
- Congelamiento;
- Plaga corrosiva;
- IA con habilidades;
- habilidades de Lythra;
- sonidos.

Prisión glacial y el rediseño de Congelamiento requieren un análisis específico con el usuario antes de P6.3D.3.

## 15. Validaciones técnicas

- trayectoria horizontal, vertical, diagonal y oblicua;
- inclusión de la casilla seleccionada;
- continuación más allá del objetivo;
- detención ante pared;
- exclusión de objetivos posteriores a la pared;
- orden estable de objetivos;
- configuración de los seis grados;
- contrato visual lineal;
- creación de recursos de fuego y rayo;
- derrota integrada sin duplicación;
- sintaxis JavaScript;
- JSON e imports relativos;
- `git diff --check`;
- integridad del ZIP completo e incremental.

## 16. Pruebas manuales sugeridas

1. Incinerar horizontal con casillas vacías y varios enemigos.
2. Incinerar diagonal.
3. Incinerar sobre un enemigo no alineado horizontalmente para verificar la trayectoria oblicua.
4. Colocar una pared después del objetivo seleccionado.
5. Colocar una pared antes del objetivo seleccionado y confirmar que no puede ejecutarse por línea de visión.
6. Confirmar que enemigos detrás de la pared no reciben daño.
7. Confirmar Quemadura aplicada, renovada y resistida.
8. Repetir con Descarga fulminante.
9. Confirmar Aturdimiento aplicado, resistido o inmune.
10. Probar fallo y crítico independientes en varios objetivos.
11. Provocar una muerte intermedia.
12. Cancelar durante el recorrido y cambiar de mapa.
13. Revisar la vista previa en Canvas 2D.

## 17. Cierre Git verificado

- Rama: `main`.
- Base utilizada para implementar: `69a400a87c00cb7d3c85c36d3753a8f6e9a90e0a`.
- Commit validado de P6.3D.1: `b88c2c57c30c438d21223c9487ff08629b2ab335`.
- Relación incluida con `origin/main`: mismo SHA, 0 adelante y 0 atrás.
- El ZIP recibido para P6.3D.2 contiene `.git` y conserva este HEAD.
- Las marcas iniciales de archivos modificados fueron comprobadas como diferencias exclusivas CRLF/LF, sin cambios reales de contenido.

## 18. Conventional Commit propuesto

```text
feat(phaser): representar habilidades avanzadas lineales
```

## 19. Próximo paso

P6.3D.2 toma como base exacta el commit `b88c2c57c30c438d21223c9487ff08629b2ab335` para representar **Plaga corrosiva** y su intensificación canónica de Envenenamiento. P6.3D.3 permanece pendiente de un análisis específico con el usuario sobre Prisión glacial y Congelamiento.
