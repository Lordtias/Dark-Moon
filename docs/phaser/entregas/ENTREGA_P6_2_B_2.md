# ENTREGA P6.2B.2 — ANIMACIONES CUERPO A CUERPO POR FAMILIA

Plan: Integración progresiva de Phaser, beta y Electron de Dark Moon  
Etapa: P6.2B.2  
Commit base: `d4a3b4f9e38b0f68da7c0b74ecd4a0f88c29b158`  
Estado: Cerrada, validada manualmente y publicada en `9979c9fe30710bfcbcb055f277b237533de9c701`

## 1. Conclusión sencilla

### Qué se analizó

Se revisaron los perfiles por `familiaObjeto`, las fases derivadas de `costoFinal`, los ataques simples, duales, naturales y de lanza, el movimiento conjunto de sprite y sombra, y el momento visual del indicador de agresión.

### Por qué

P6.2B.1 había preparado el ritmo y los perfiles, pero Phaser todavía mostraba el mismo pulso genérico. Además, el indicador de agresión se dibujaba al finalizar el movimiento porque el cambio de estado solo aparecía en la escena final.

### Conclusión final

Las animaciones cuerpo a cuerpo pueden resolverse únicamente en la capa de presentación usando el perfil ya configurado. El orden de hostilidad requiere un evento explícito para no deducir cambios desde escenas.

### Acción correspondiente

Validar manualmente cada familia, el ritmo dual y el indicador; después cerrar P6.2B.2 con un commit propio antes de avanzar a P6.2C.

## 2. Estado local inicial

- copia: `/mnt/data/p6_2b2_work/Dark-Moon`;
- `.git`: presente;
- rama: `main`;
- HEAD: `d4a3b4f9e38b0f68da7c0b74ecd4a0f88c29b158`;
- estado inicial: limpio y alineado con `origin/main`;
- commit y push: no realizados.

## 3. Alcance implementado

- agregar el evento canónico `hostilidad_cambiada`;
- representar detección antes de movimiento o ataque enemigo;
- representar pérdida de persecución antes de la acción pasiva;
- representar provocación después del ataque del jugador;
- reducir y reubicar el indicador `!`;
- consumir perfiles de daga, espada, hacha, mandoble, bastón y lanza;
- utilizar fallback genérico para ataque natural;
- animar preparación, avance, acción y retorno según las fases de `costoFinal`;
- aplicar el perfil propio de cada mano en doble arma;
- mover sprite y sombra como unidad;
- conservar daño, fallo, bloqueo, crítico y barras de P6.2A;
- conservar arcos y varitas con presentación provisional hasta P6.2C.

## 4. Arquitectura final

```text
IA o combate cambia hostilidad
→ hostilidad_cambiada conserva el hecho
→ PlanificadorEventosVisuales lo convierte a ID visual
→ Phaser agrega o retira el indicador en orden

SistemaCombate resuelve golpe
→ SistemaTiempo aporta costoFinal
→ PlanificadorRitmoVisual distribuye fases
→ familiaObjeto selecciona forma
→ Phaser anima cuerpo, efecto y retorno
```

## 5. Familias visuales

| Familia | Presentación |
|---|---|
| daga | corte corto |
| espada | corte medio |
| hacha | corte medio antihorario |
| mandoble | corte amplio |
| bastón | golpe contundente grande |
| lanza | estocada lineal |
| ataque natural | golpe genérico |

Arco y varita permanecen fuera del alcance y se completarán en P6.2C.

## 6. Doble arma

La preparación se realiza una vez. Cada golpe obtiene el perfil de su propia fuente y la pausa utiliza `ritmoVisual.fases.pausaEntreManos`. No se consulta otra fórmula ni el nombre visible del arma.

## 7. Hostilidad

- detección: `!` antes del movimiento o ataque;
- pérdida de persecución: retirar `!` antes de esperar;
- provocación por jugador: ataque y resultado antes del `!`;
- indicador: radio 4 px, texto 8 px, sin cubrir la barra de Vida.

## 8. Archivos agregados

```text
docs/phaser/entregas/ENTREGA_P6_2_B_2.md
```

## 9. Archivos modificados

```text
src/juego/acciones/EventosAccion.js
src/juego/ia/SistemaAccionesEnemigos.js
src/juego/combate/SistemaCombateJugador.js
src/interfaz/graficos/PlanificadorEventosVisuales.js
src/interfaz/graficos/phaser/ConfiguracionEntidadesPhaser.js
src/interfaz/graficos/phaser/CompositorMundoPhaser.js
src/interfaz/graficos/phaser/CreadorEfectosCombatePhaser.js
src/interfaz/graficos/phaser/ReproductorEventosVisualesPhaser.js
README.md
docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md
docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md
docs/phaser/entregas/ENTREGA_P6_2_B_1.md
```

## 10. Sistemas no modificados

- `SistemaCombate.js`;
- fórmulas de ataque y doble arma;
- `SistemaTiempo.js`;
- búsqueda de caminos;
- `Armas.json`;
- `PerfilesAtaquePorFamilia.json`;
- persistencia;
- Canvas 2D;
- Phaser 4.2.1.

## 11. Dependencias

Ninguna dependencia, imagen o sonido nuevo. Los efectos son procedurales.

## 12. Validaciones técnicas

- sintaxis JavaScript;
- JSON e imports;
- orden detección → hostilidad → movimiento;
- pérdida de persecución → pasivo;
- ataque del jugador → hostilidad;
- plan visual por IDs;
- creación y eliminación dinámica del indicador;
- daga y hacha en doble arma;
- lanza;
- ataque natural;
- retorno exacto de sprite y sombra;
- cancelación segura;
- carga HTTP y ausencia de recursos externos.

## 13. Prueba manual necesaria

1. daga, espada, hacha, mandoble, bastón y lanza;
2. doble arma de familias iguales y diferentes;
3. ataque natural enemigo;
4. detección de un enemigo pasivo que luego avanza;
5. pérdida de persecución;
6. provocación de enemigo pasivo;
7. zoom y redimensionamiento;
8. varios enemigos;
9. Canvas 2D;
10. consola sin errores.

## 14. Riesgos pendientes

- los parámetros visuales del JSON pueden requerir ajuste estético;
- proyectiles permanecen provisionales hasta P6.2C;
- sonidos continúan en `null`;
- muerte y retirada visual se completan en P6.4.

## 15. Conventional Commit propuesto

```text
feat(combate): animar ataques cuerpo a cuerpo por familia

- representar cambios de hostilidad en el orden canónico de las acciones;
- mostrar agresión antes del movimiento y retirarla antes de una acción pasiva;
- reducir el indicador agresivo para preservar la barra de Vida;
- consumir el ritmo visual derivado del costo final;
- animar daga, espada, hacha, mandoble, bastón, lanza y ataque natural;
- aplicar perfiles independientes a cada mano en ataques duales;
- mover sprite y sombra juntos y restaurar la casilla canónica;
- conservar daño, fallo, bloqueo y barras de P6.2A;
- intensificar el efecto propio de la familia en golpes críticos;
- retirar derrotados y actualizar daño periódico antes de la acción siguiente;
- mantener arcos y varitas provisionales hasta P6.2C;
- cerrar documentalmente P6.2B.1 y documentar P6.2B.2.
```

## 16. Resultados reproducibles

| Verificación | Resultado |
|---|---|
| JavaScript de producción | 175 archivos correctos |
| JSON de configuración | 22 archivos válidos |
| Imports relativos | 389 referencias resueltas |
| Orden detección y movimiento | `hostilidad_cambiada` antes de `entidad_movida` |
| Pérdida de persecución | cambio a pasivo antes de espera |
| Provocación por jugador | `ataque_resuelto` antes de `hostilidad_cambiada` |
| Doble arma | perfiles independientes para principal y secundaria |
| Lanza | estocada local desde atacante hacia objetivo |
| Ataque natural | fallback genérico |
| Retorno visual | sprite y sombra restaurados |
| Crítico | efecto de familia intensificado, sin estrella adicional |
| Derrota directa | `ataque_resuelto` seguido de retirada visual |
| Daño periódico | Vida anterior, posterior y máxima conservadas |
| Derrota periódica | retirada antes del evento siguiente |
| Creador de efectos | corte, estrella de bastón y estocada correctos |
| HTTP | entradas principales con código 200 |
| `git diff --check` | sin errores |
| Dependencias | ninguna |

La prueba visual interactiva final queda pendiente del navegador del usuario.

## 17. Estado Git final de la copia entregada

```text
Ruta: /mnt/data/p6_2b2_bug_review/Dark-Moon
.git: presente
Rama: main
HEAD: d4a3b4f9e38b0f68da7c0b74ecd4a0f88c29b158
Estado: 14 archivos modificados y 1 archivo nuevo
Commit: no realizado
Push: no realizado
```

## 18. ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Integración progresiva de Phaser, beta y Electron de Dark Moon.

ETAPA CERRADA:
P6.2B.2 — Animaciones cuerpo a cuerpo por familia

ESTADO:
Pausada hasta prueba manual y commit

COMMIT BASE:
d4a3b4f9e38b0f68da7c0b74ecd4a0f88c29b158

HEAD FINAL VERIFICADO:
d4a3b4f9e38b0f68da7c0b74ecd4a0f88c29b158

GIT STATUS FINAL:
12 archivos modificados y 1 archivo nuevo; sin commit ni push.

DOCUMENTO DE ENTREGA:
docs/phaser/entregas/ENTREGA_P6_2_B_2.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md

OBJETIVO QUE SE COMPLETÓ:
Animar ataques cuerpo a cuerpo según familiaObjeto, ordenar la hostilidad y reflejar daño periódico y derrotas antes de la acción siguiente.

ARQUITECTURA HEREDADA:
SistemaTiempo mantiene el único costo final; PerfilesAtaquePorFamilia define la forma; Phaser reproduce sin recalcular combate; hostilidad_cambiada conserva el orden visual.

ARCHIVOS CLAVE:
- src/config/presentacion/PerfilesAtaquePorFamilia.json: perfiles y secuencias canónicas.
- src/interfaz/graficos/phaser/ReproductorEventosVisualesPhaser.js: reproducción de fases físicas.
- src/interfaz/graficos/phaser/CreadorEfectosCombatePhaser.js: corte, golpe y estocada procedurales.
- src/juego/acciones/EventosAccion.js: eventos canónicos de ataque, movimiento y hostilidad.

DEPENDENCIAS Y VERSIONES:
Phaser 4.2.1 exacta; ninguna dependencia nueva.

PRUEBAS CLAVE SUPERADAS:
- orden de hostilidad antes del movimiento;
- perfiles de doble arma, lanza y ataque natural;
- retorno de sprite y sombra;
- sintaxis, JSON, imports y carga HTTP.

PROBLEMAS O RIESGOS PENDIENTES:
- prueba visual manual final de perfiles, críticos y desaparición de derrotados;
- proyectiles todavía provisionales;
- aparición inmediata y animada del botín reservada para P6.4.

DECISIONES APROBADAS:
- costoFinal como ritmo autoritativo;
- familiaObjeto como conexión de presentación;
- indicador agresivo reducido;
- evento explícito de hostilidad;
- crítico integrado al efecto propio de la familia;
- retirada visual inmediata de derrotados;
- botín inmediato reservado para P6.4.

DECISIONES QUE SIGUEN ABIERTAS:
Ninguna para P6.2B.2.

SIGUIENTE ETAPA RECOMENDADA:
P6.2C — Arcos, varitas y proyectiles

OBJETIVO DE LA SIGUIENTE ETAPA:
Representar ataques básicos a distancia con flechas y proyectiles elementales usando el mismo ritmo canónico y perfiles por familia.

PRIMEROS ARCHIVOS A REVISAR:
- src/config/presentacion/PerfilesAtaquePorFamilia.json
- src/interfaz/graficos/phaser/ReproductorEventosVisualesPhaser.js
- src/interfaz/graficos/phaser/CreadorEfectosCombatePhaser.js

NO MODIFICAR SIN NUEVA APROBACIÓN:
- SistemaCombate y sus fórmulas;
- SistemaTiempo y costoFinal;
- persistencia y Canvas 2D.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Arcos y varitas muestran preparación, lanzamiento, trayectoria e impacto según el resultado canónico, sin modificar alcance, munición, Maná o tiempo.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
feat(combate): animar ataques cuerpo a cuerpo por familia

- representar cambios de hostilidad en el orden canónico de las acciones;
- mostrar agresión antes del movimiento y retirarla antes de una acción pasiva;
- reducir el indicador agresivo para preservar la barra de Vida;
- consumir el ritmo visual derivado del costo final;
- animar daga, espada, hacha, mandoble, bastón, lanza y ataque natural;
- aplicar perfiles independientes a cada mano en ataques duales;
- mover sprite y sombra juntos y restaurar la casilla canónica;
- conservar daño, fallo, bloqueo y barras de P6.2A;
- intensificar el efecto propio de la familia en golpes críticos;
- retirar derrotados y actualizar daño periódico antes de la acción siguiente;
- mantener arcos y varitas provisionales hasta P6.2C;
- cerrar documentalmente P6.2B.1 y documentar P6.2B.2.

----------------- FIN DEL ENLACE -----------------

## 19. Ajuste de validación posterior

Tras la primera prueba manual se corrigieron dos defectos de presentación sin alterar combate, tiempo ni IA:

- los ataques cuerpo a cuerpo con perfil propio dejan de superponer la marca genérica en cruz;
- la estocada de lanza se dibuja desde el atacante hacia el objetivo usando coordenadas locales, evitando el origen erróneo en la esquina superior izquierda.

## 20. Segunda corrección de validación

La validación manual posterior aprobó los siguientes ajustes dentro de P6.2B.2:

- el bastón reemplaza el círculo técnico por una estrella grande de ocho puntas con centro circular grueso;
- un crítico deja de crear una estrella decorativa independiente;
- el crítico intensifica el efecto propio de daga, espada, hacha, mandoble, bastón, lanza o ataque natural;
- la palabra `CRÍTICO` y el número de daño se conservan;
- `ataque_resuelto` genera una retirada visual inmediata cuando el objetivo quedó destruido;
- `danio_periodico_aplicado` conserva Vida anterior, posterior y máxima para actualizar la barra en orden;
- `combatiente_derrotado` retira la entidad antes de continuar con la siguiente acción;
- veneno y quemadura todavía usan feedback neutral; su presentación temática queda para P6.3;
- la aparición inmediata y animada del botín queda para P6.4, donde deberá seguir a la muerte sin esperar al final de la ronda.

La escena final continúa reconciliando el estado completo, pero ya no es necesario esperar hasta ella para ocultar un enemigo derrotado.

## 21. Cierre confirmado

P6.2B.2 fue validada manualmente y publicada por el usuario en:

```text
9979c9fe30710bfcbcb055f277b237533de9c701
```

P6.2C.1 toma ese commit y el ZIP correspondiente como base de verdad.
