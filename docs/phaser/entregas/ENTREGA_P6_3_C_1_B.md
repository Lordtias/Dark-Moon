# ENTREGA P6.3C.1B — CADENA DE RAYOS

Fecha: 2026-08-06  
Etapa: P6.3C.1B  
Base obligatoria: `8bf47e50eb70ebc552649716a61eb5bbef829f5d`  
Rama esperada: `main`

## 1. Objetivo

Representar **Cadena de rayos** como una secuencia de saltos entre objetivos ya resueltos y reforzar la resolución espacial canónica para impedir saltos a través de paredes. Phaser continúa siendo únicamente una capa de presentación.

## 2. Cierre documental de P6.3C.1A

P6.3C.1A fue validada manualmente y cerrada en:

`8bf47e50eb70ebc552649716a61eb5bbef829f5d`

README, Plan Maestro, Diseño Maestro y `ENTREGA_P6_3_C_1_A.md` se actualizan para reflejar ese cierre.

## 3. Resolución espacial de cadenas

`ResolucionEspacialHabilidades.js` incorpora `resolverRecorridoCadenaConObstaculos`. La operación recibe el objetivo primario, los candidatos, el máximo de objetivos, el alcance por salto y la política de obstáculos.

Cada salto:

1. excluye objetivos ya visitados;
2. limita candidatos por alcance;
3. reutiliza `evaluarLineaVision` entre el objetivo actual y el candidato;
4. descarta candidatos bloqueados por paredes o esquinas;
5. elige el visible más cercano;
6. desempata de forma estable por coordenadas;
7. termina cuando no existe otro candidato válido.

La cadena puede rodear indirectamente una pared mediante objetivos intermedios visibles. Lo que se prohíbe es que un tramo individual atraviese el obstáculo.

## 4. Configuración canónica

Los tres grados de Cadena de rayos declaran:

```json
"politicaObstaculos": "vision_entre_saltos"
```

El validador de ejecución utiliza también esa política como valor predeterminado seguro para futuras formas de cadena.

## 5. Separación de responsabilidades

- `SistemaAlcanceAtaque.js`: algoritmo común de línea de visión.
- `ResolucionEspacialHabilidades.js`: candidatos, alcance, obstáculos, visitados y recorrido.
- `GeometriaHabilidades.js`: orden, multiplicador de daño por salto y contratos de impacto.
- `PatronesVisualesHabilidades.js`: estructura reutilizable del patrón visual `cadena`.
- `CreadorCadenasHabilidadesPhaser.js`: arcos, núcleos viajeros, carga e impactos.
- `ReproductorEventosVisualesPhaser.js`: orden temporal de los saltos.

## 6. Presentación visual

La reproducción sigue este orden:

1. glifo y carga eléctrica sobre el ejecutor;
2. arco desde el actor al objetivo primario;
3. impacto, daño, fallo o crítico;
4. Electrización, renovación, resistencia o inmunidad;
5. posible derrota del objetivo;
6. arco desde la posición congelada del objetivo anterior hacia el siguiente;
7. repetición hasta completar el recorrido canónico;
8. disipación conjunta de los tramos.

Los arcos anteriores permanecen brevemente con opacidad reducida para permitir leer el recorrido completo.

## 7. Intensidad visual

El primer objetivo recibe énfasis primario real. Los saltos posteriores reducen grosor y brillo usando `multiplicadorDanio`, ya transportado por el evento. Se aplica un mínimo exclusivamente visual para mantener legibles los últimos saltos; el daño real no se modifica.

Un crítico intensifica el mismo arco y la misma descarga. No agrega símbolos ajenos al elemento eléctrico.

## 8. Derrotas durante la cadena

La derrota visual queda integrada dentro del impacto correspondiente. La entidad desaparece antes del siguiente salto, pero el nuevo arco parte de la posición almacenada en el evento. No se consulta nuevamente una entidad ya retirada y no se genera una segunda derrota fuera de la habilidad.

## 9. Patrón visual reutilizable

El patrón `cadena` declara:

- recorrido ordenado;
- impactos secuenciales;
- objetivo primario;
- conservación breve de tramos anteriores;
- intensidad visual mínima;
- opacidades comunes para tramos anteriores y final.

La misma arquitectura podrá reutilizarse en futuras cadenas ofensivas, curaciones encadenadas o habilidades de NPC y enemigos.

## 10. Archivos nuevos

- `src/interfaz/graficos/phaser/CreadorCadenasHabilidadesPhaser.js`
- `docs/phaser/entregas/ENTREGA_P6_3_C_1_B.md`

## 11. Archivos modificados

- `src/config/magia/Habilidades.json`
- `src/juego/habilidades/ResolucionEspacialHabilidades.js`
- `src/juego/habilidades/GeometriaHabilidades.js`
- `src/juego/habilidades/ValidadorConfiguracionEjecucionHabilidades.js`
- `src/interfaz/graficos/PatronesVisualesHabilidades.js`
- `src/interfaz/graficos/PlanificadorEventosVisuales.js`
- `src/interfaz/graficos/phaser/ReproductorEventosVisualesPhaser.js`
- `README.md`
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
- `docs/phaser/entregas/ENTREGA_P6_3_C_1_A.md`

## 12. Exclusiones

- Nube tóxica y zonas persistentes.
- Habilidades avanzadas.
- Descarga fulminante.
- Habilidades de NPC o enemigos.
- Cambios de daño, Maná, alcance o costo temporal.
- Obstáculos dinámicos producidos por entidades.
- Sonidos nuevos.

## 13. Validaciones técnicas

- sintaxis JavaScript;
- JSON;
- configuración canónica y perfiles visuales;
- recorrido bloqueado por paredes;
- candidato visible alternativo;
- desempate espacial estable;
- ausencia de objetivos repetidos;
- derrota integrada al salto sin evento duplicado;
- imports relativos;
- `git diff --check` con la política de finales de línea del repositorio;
- integridad del ZIP completo e incremental.

## 14. Pruebas manuales ejecutadas para el cierre

1. Cadena grado 1 con dos objetivos visibles.
2. Cadena grado 2 y 3 con tres y cuatro objetivos.
3. Pared entre dos objetivos: el arco no debe atravesarla.
4. Candidato cercano bloqueado y otro visible: debe elegir el visible.
5. Sin candidato visible: la cadena debe terminar.
6. Fallo en un salto intermedio y continuación del recorrido.
7. Crítico en un salto intermedio.
8. Electrización aplicada, renovada o resistida en cada objetivo.
9. Muerte del primer objetivo y continuación desde su posición.
10. Muerte de un objetivo intermedio.
11. Cancelación de la cola sin arcos residuales.
12. Cambio de mapa sin recursos visuales huérfanos.
13. Canvas 2D sin regresiones jugables.

## 15. Cierre manual registrado

P6.3C.1B fue validada manualmente y cerrada en:

`e2e2b859f2e3e25989a73ab057b5f11195e32a0e`

## 16. Estado Git esperado al entregar

- Rama: `main`.
- HEAD de cierre: `e2e2b859f2e3e25989a73ab057b5f11195e32a0e`.
- Commit realizado: sí.
- Push realizado: según el flujo del usuario.
- GitHub remoto modificado: según el flujo del usuario.

## 17. Conventional Commit propuesto

```text
feat(phaser): representar cadena de rayos por saltos
```

## 18. Próximo paso

Después del cierre de P6.3C.1B, continuar con **P6.3C.2A — Representación persistente de zonas temporales**.
