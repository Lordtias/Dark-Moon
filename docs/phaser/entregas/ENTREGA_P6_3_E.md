# ENTREGA P6.3E — HABILIDADES CANÓNICAS DE NPC PARA LYTHRA

Fecha: 2026-08-06  
Etapa: P6.3E  
Base exacta: `0bc9026ac1eac07c5f0d059e9842f3a834e7ed42`  
Rama: `main`  
Commit realizado: no

## 1. Objetivo

Convertir los servicios existentes de Lythra en habilidades canónicas de NPC sin alterar la economía de la curandera, el progreso mágico del jugador ni el tiempo jugable. Phaser debe representar la recuperación como magia emitida por Lythra y reutilizar el feedback genérico de Vida y Maná ya existente.

## 2. Base verificada y cierre de P6.3D.3

El ZIP recibido contiene `.git`, rama `main`, HEAD y referencia incluida `origin/main` en:

`0bc9026ac1eac07c5f0d059e9842f3a834e7ed42`

Las marcas iniciales de Git fueron comprobadas como diferencias exclusivas CRLF/LF; no existían diferencias reales de contenido contra HEAD.

P6.3D.3 queda cerrada documentalmente con:

- Congelamiento de Ráfaga glacial: 200/250/300 por grado;
- 60 % de probabilidad base en los tres grados;
- presentación final mediante múltiples fragmentos de hielo dirigidos a un único objetivo;
- commit final `0bc9026ac1eac07c5f0d059e9842f3a834e7ed42`.

## 3. Catálogo canónico de habilidades NPC

Se incorpora `src/config/magia/HabilidadesNPC.json`, separado de `Habilidades.json`.

Contiene:

- `curacion_lunar`: recupera Vida;
- `restauracion_mana_lunar`: recupera Maná.

Estas habilidades:

- no pertenecen a maestrías;
- no son aprendibles;
- no ocupan barra;
- no consumen puntos de habilidad;
- no consumen Maná;
- no poseen cooldown;
- no consumen tiempo jugable;
- son no hostiles y de objetivo individual aliado.

`ValidadorHabilidadesNPC.js` valida el catálogo y normaliza el contrato antes de incorporarlo al arranque de la aplicación.

## 4. Asociación con Lythra

`CiudadInicial.json` declara en los datos genéricos de `curandera_refugio`:

- Vida → `curacion_lunar`;
- Maná → `restauracion_mana_lunar`.

No se crea una subclase especial para Lythra. El NPC continúa utilizando roles, interacciones y datos genéricos.

## 5. Economía y transacción

`SistemaCuracion` conserva sin cambios las reglas económicas existentes:

- Vida: 1 moneda cada 5 puntos faltantes;
- Maná: 1 moneda cada 3 puntos faltantes;
- Ambos: suma de ambos precios;
- precio mínimo existente;
- recuperación completa;
- pago atómico;
- rollback de Vida, Maná y oro si la operación queda incompleta.

Los eventos de habilidad se construyen únicamente después de que la recuperación fue aceptada y validada. Si la transacción falla, no se genera una habilidad visual falsa.

## 6. Eventos canónicos

Cada recuperación real produce `habilidad_resuelta` con:

- Lythra como `actor`;
- `tipoActor: npc`;
- jugador como objetivo primario;
- un impacto individual aceptado;
- daño cero;
- `recursosObjetivo` con recurso, valor anterior, valor posterior, máximo, cantidad real y `tipoCambio: recuperacion`.

El servicio «Ambos» no crea una tercera habilidad. Reutiliza las existentes en orden:

1. Curación lunar, si falta Vida;
2. Restauración lunar, si falta Maná.

Un recurso que ya estaba completo no produce evento ni animación innecesaria.

## 7. Duración visual sin coste temporal

`PerfilesHabilidadesVisuales.json` admite `duracionVisualMs` para habilidades de NPC o enemigo sin ejecución temporal jugable.

`PlanificadorRitmoVisual` mantiene el comportamiento previo cuando existe `costoFinal`, pero puede construir un ritmo con origen `visual_fija` cuando la habilidad declara duración puramente visual.

Las dos habilidades de Lythra usan 820 ms como duración base visual. Este valor no modifica la agenda de `SistemaTiempo`.

## 8. Presentación Phaser

Ambas habilidades reutilizan el patrón `proyectil` y el reproductor universal.

### Curación lunar

- orbe lunar blanco/rosado;
- motas lunares;
- destellos suaves en trayectoria;
- pulso de sanación al llegar al jugador;
- feedback `+N VIDA` con la cantidad real recuperada.

### Restauración lunar

- orbe azul/violeta;
- motas arcanas;
- destellos arcanos;
- pulso de restauración al objetivo;
- feedback `+N MANÁ` con la cantidad real recuperada.

No se muestra sprite de poción ni gesto de consumo.

## 9. Recuperaciones dentro de habilidades

`ReproductorEventosVisualesPhaser` ahora interpreta `recursosObjetivo` dentro de un impacto de habilidad y reutiliza `CreadorEfectosRecuperacionPhaser`.

La mejora es genérica: futuras habilidades de jugador, NPC o enemigo podrán transportar recuperaciones reales usando el mismo contrato sin introducir un reproductor específico para Lythra.

## 10. Canvas 2D

Canvas 2D permanece operativo sin depender de la animación Phaser. `curarJugador` solicita redibujado y el jugador ya contiene los valores canónicos finales cuando se crea la nueva escena, por lo que Vida y Maná se actualizan de inmediato.

No se introduce lógica jugable en Canvas ni en Phaser.

## 11. Archivos nuevos

- `src/config/magia/HabilidadesNPC.json`
- `src/juego/habilidades/ValidadorHabilidadesNPC.js`
- `docs/phaser/entregas/ENTREGA_P6_3_E.md`

## 12. Archivos modificados

- `README.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`
- `docs/phaser/entregas/ENTREGA_P6_3_D_3.md`
- `src/aplicacion/Aplicacion.js`
- `src/aplicacion/ControladorPartida.js`
- `src/config/mapas/CiudadInicial.json`
- `src/config/presentacion/PerfilesHabilidadesVisuales.json`
- `src/interfaz/dom/PresentacionMapaActivoDom.js`
- `src/interfaz/graficos/PlanificadorRitmoVisual.js`
- `src/interfaz/graficos/ValidadorPerfilesHabilidadesVisuales.js`
- `src/interfaz/graficos/phaser/CreadorEfectosHabilidadesPhaser.js`
- `src/interfaz/graficos/phaser/ReproductorEventosVisualesPhaser.js`
- `src/interfaz/interacciones/AdaptadorInteraccionesDom.js`
- `src/juego/configuracion/CargadorConfiguracion.js`
- `src/juego/curacion/SistemaCuracion.js`

No se eliminaron archivos.

## 13. Pruebas automáticas dirigidas

Se ejecutaron scripts temporales externos al repositorio para comprobar:

1. carga y validación de las dos habilidades NPC;
2. Curación lunar asociada exclusivamente a Vida;
3. Restauración lunar asociada exclusivamente a Maná;
4. Vida parcial → un evento de Curación lunar;
5. Maná parcial → un evento de Restauración lunar;
6. servicio Ambos → dos eventos ordenados Vida → Maná;
7. Vida completa + Maná faltante → solo Restauración lunar;
8. oro insuficiente → cero eventos y cero cambios de recursos;
9. compatibilidad de `curarJugador` sin presentación NPC explícita;
10. `tipoActor: npc` dentro de `habilidad_resuelta`;
11. cantidad real transportada por `recursosObjetivo`;
12. planificación visual con `duracionVisualMs` y sin `costoFinal`;
13. perfil visual canónico para las 12 habilidades del jugador más las 2 de NPC;
14. creación Phaser de conjuración, proyectil, estela e impacto para ambas habilidades.

## 14. Validaciones globales

Sobre la copia limpia de entrega se verificó:

- sintaxis de 192 archivos JavaScript: correcta;
- lectura de 26 archivos JSON: correcta;
- 423 imports relativos: todos resueltos;
- `git diff --check`: correcto;
- archivos `.mjs`: 0;
- archivos `.patch`: 0;
- HEAD conservado en `0bc9026ac1eac07c5f0d059e9842f3a834e7ed42`;
- `origin/main` incluido en el mismo SHA;
- sin cambios staged.

El incremental fue aplicado sobre una copia limpia del SHA base: se compararon 420 archivos fuera de `.git`, con 0 diferencias de rutas y 0 diferencias de contenido frente al árbol completo. Los SHA-256 se calculan sobre los entregables finales.

## 15. Pruebas manuales recomendadas

1. entrar en la ciudad y perder Vida;
2. comprar solo Vida a Lythra;
3. confirmar que la magia nace en Lythra y termina en el jugador;
4. comprobar `+N VIDA` real;
5. gastar solo Maná y comprar Maná;
6. confirmar variante azul/violeta y `+N MANÁ`;
7. perder ambos recursos y comprar «Ambos»;
8. comprobar las dos habilidades en orden;
9. dejar uno de los dos recursos completo y confirmar que no aparece una habilidad redundante;
10. intentar comprar sin oro suficiente;
11. confirmar que no aparece ninguna poción;
12. confirmar que la acción no avanza el tiempo del mundo;
13. repetir con efectos reducidos;
14. comprobar Canvas 2D.

## 16. Exclusiones

P6.3E no incorpora:

- IA de NPC;
- combate de Lythra;
- habilidades ofensivas de NPC;
- habilidades enemigas;
- buffs;
- resurrección;
- cambios de precio;
- nuevos recursos;
- sonido;
- maestrías o aprendizaje para NPC.

## 17. Riesgos conocidos

La validación automatizada no sustituye la comprobación visual en navegador. Debe validarse manualmente que la trayectoria entre Lythra y el jugador sea legible con la cámara real y que la reproducción consecutiva de Vida y Maná tenga un ritmo satisfactorio.

## 18. Próximo paso

Después de la validación manual y el commit del usuario, continuar con:

**P6.3F — regresión, documentación y cierre general de P6.3.**
