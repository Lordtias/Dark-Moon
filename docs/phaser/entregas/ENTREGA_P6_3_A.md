# ENTREGA P6.3A — CONTRATOS UNIVERSALES Y HABILIDADES BÁSICAS

Estado: implementación y validaciones técnicas completadas; validación visual manual pendiente.
Etapa: P6.3A
Base obligatoria: `046a1d5391800ea827bdc71613eed5776d6f4dab`

## 1. Objetivo

Crear un contrato visual de habilidades independiente del tipo de ejecutor y utilizarlo con las cuatro habilidades básicas del jugador:

- Ascua;
- Esquirla de hielo;
- Chispa;
- Aguijón tóxico.

El dominio continúa resolviendo Maná, geometría, objetivos, impacto, crítico, daño, resistencias, efectos, zonas y tiempo. Phaser recibe IDs, posiciones, resultados y el `costoFinal` ya resuelto.

## 2. Contrato universal

Se incorpora `habilidad_resuelta` con un ejecutor explícito:

- `jugador`;
- `enemigo`;
- `npc`.

El contrato conserva:

- actor y tipo canónico de actor;
- origen;
- ID, nombre, maestría y grado de la habilidad;
- tipo de objetivo y patrón;
- centro seleccionado;
- casillas afectadas y recorrido;
- impactos ordenados con objetivo, posición, daño, crítico y derrota;
- Vida anterior, posterior y máxima;
- cambios de recursos del ejecutor;
- cambios reales de Vida, Maná u otros recursos sobre cada objetivo;
- efectos producidos;
- resumen seguro de una zona creada o renovada;
- ejecución temporal asociada.

P6.3A solo conecta habilidades del jugador. Los contratos quedan abiertos para enemigos y NPC, pero no se agregan IA, decisiones ni contenido nuevo para ellos.

## 3. Transporte de resultados

`MotorDanioHabilidad` registra la Vida inmediatamente antes y después de aplicar cada resultado. `MotorEfectosHabilidad` conserva los eventos canónicos generados por el sistema de efectos para que no se pierdan antes de la cola visual.

`SistemaHabilidadesJugador` emite en orden:

```text
habilidad_resuelta
→ eventos de efectos producidos
→ eventos de zona, cuando corresponda
```

El resultado público de la habilidad conserva resúmenes planos y no expone dos veces los eventos internos.

## 4. Perfiles visuales

`PerfilesHabilidadesVisuales.json` conecta las doce habilidades canónicas con perfiles de presentación. El arranque valida que:

- toda habilidad tenga perfil;
- no existan perfiles huérfanos;
- las secuencias referenciadas existan;
- sus proporciones sumen uno;
- colores, tamaños, escalas por grado y contratos de sonido sean válidos.

Los perfiles no contienen fórmulas jugables ni multiplicadores temporales. La forma distribuye la lectura; la duración total siempre parte de `ejecucionTemporal.costoFinal`.

## 5. Habilidades básicas implementadas

### Ascua

- brasa concentrada e irregular;
- núcleo cálido;
- estela de brasas ascendentes;
- movimiento flotante;
- estallido radial cálido.

### Esquirla de hielo

- fragmento alargado y facetado;
- polvo helado en forma de pequeñas cruces;
- trayectoria rígida;
- fractura radial en el impacto.

### Chispa

- descarga fina en zig-zag que conecta al ejecutor con el objetivo;
- permanece anclada al origen durante la descarga;
- no se interpreta como un proyectil sólido;
- impacto eléctrico radial;
- el crítico refuerza grosor y luminosidad.

### Ajuste visual aprobado: Chispa y varita eléctrica

El efecto eléctrico se intercambió de forma deliberada:

- Chispa utiliza la descarga completa en zig-zag que antes pertenecía al ataque básico de varita eléctrica;
- la varita eléctrica utiliza la chispa compacta ramificada, su movimiento nervioso, su estela de arcos breves y su impacto cruzado;
- el intercambio es exclusivamente visual y no altera daño, electrización, precisión, crítico, Maná, alcance, doble varita ni costo temporal;
- se retiró la bifurcación especial antigua de la varita para evitar conservar dos implementaciones del mismo comportamiento.

### Aguijón tóxico

- aguijón viscoso;
- textura densa con burbujas;
- estela de gotas tóxicas;
- movimiento punzante;
- salpicadura diferenciada.

Los cuatro elementos se distinguen por forma, textura, movimiento, estela, impacto y ritmo, además del color.

## 6. Selección táctica

La escena neutral conserva la identidad de la habilidad seleccionada. Canvas 2D y Phaser distinguen el rango, el área, el recorrido, los objetivos y el selector mediante la maestría elemental, sin consultar catálogos desde el backend gráfico.

La geometría, validez, línea de visión y objetivos continúan siendo canónicos.

## 7. Reproducción Phaser

La secuencia básica es:

1. preparación;
2. manifestación;
3. trayectoria;
4. impacto o fallo;
5. actualización de Vida y feedback;
6. retorno;
7. derrota inmediata, cuando corresponda;
8. reconciliación con la escena final.

`CreadorEfectosHabilidadesPhaser` construye exclusivamente recursos transitorios de presentación. No conoce Maná, resistencias, inventario, maestrías, IA ni reglas de combate.

La cancelación de la cola o la destrucción de escena elimina los efectos temporales para impedir residuos visuales al cambiar de mapa.

## 8. Alcance y exclusiones

Incluido:

- contrato universal;
- perfiles validados para las doce habilidades;
- reproducción completa de las cuatro básicas;
- transporte de eventos de efectos;
- daño, fallo, crítico y derrota;
- ritmo derivado del costo temporal final;
- selección elemental en Canvas 2D y Phaser.

Excluido:

- IA enemiga para elegir habilidades;
- nuevas habilidades enemigas;
- habilidades de NPC;
- estados persistentes visibles;
- áreas, líneas y cadenas animadas;
- zonas temporales animadas;
- habilidades avanzadas;
- curación y restauración de Maná de Lythra;
- auras;
- sonidos;
- cambios de balance o persistencia.

Lythra se incorporará posteriormente mediante habilidades canónicas de NPC no aprendibles por el jugador. No utilizará la animación de consumibles.

## 9. Archivos agregados

- `src/config/presentacion/PerfilesHabilidadesVisuales.json`;
- `src/interfaz/graficos/ContextoPerfilesHabilidadesVisuales.js`;
- `src/interfaz/graficos/ValidadorPerfilesHabilidadesVisuales.js`;
- `src/interfaz/graficos/phaser/CreadorEfectosHabilidadesPhaser.js`;
- `docs/phaser/entregas/ENTREGA_P6_3_A.md`.

## 10. Archivos modificados principales

- arranque y carga de configuración;
- contratos de eventos de acción;
- motores de daño y efectos de habilidad;
- sistema de habilidades del jugador;
- escena neutral y selección visual;
- planificadores de eventos y ritmo;
- Canvas 2D;
- compositor y reproductor Phaser;
- README, Plan Maestro y Diseño Maestro;
- entrega P6.2D para registrar su SHA real.

No se renombraron ni eliminaron archivos.

## 11. Validaciones técnicas realizadas

- 182 archivos JavaScript superan `node --check`;
- 23 archivos JSON se parsean correctamente;
- 404 imports relativos verificados sin rutas rotas;
- `git diff --check` correcto;
- doce perfiles conectados con las doce habilidades reales;
- cuatro habilidades básicas con forma, movimiento e impacto diferentes;
- intercambio Chispa/varita eléctrica verificado mediante simulación procedural de trayectoria, estela e impacto;
- chequeo dirigido de código muerto sin funciones locales huérfanas, ramas antiguas de rayo ni parámetros obsoletos;
- contratos aceptan jugador, enemigo y NPC y rechazan tipos desconocidos;
- una simulación de habilidad de NPC conserva recuperación real de Vida sobre su objetivo sin convertirla en consumible;
- simulaciones de impacto y fallo conservan Vida anterior, posterior y máxima;
- simulación del plan visual conserva IDs, objetivo, daño, crítico, derrota y `costoFinal`;
- las fases visuales suman exactamente la duración total;
- costos finales diferentes generan duraciones diferentes;
- simulación gráfica crea conjuración, proyectil, estela e impacto de las cuatro habilidades sin nuevas dependencias;
- no se crearon archivos `.mjs`, pruebas con `node:test` ni parches.

## 12. Pruebas manuales pendientes

Deben realizarse en navegador, partiendo de una partida nueva cuando sea conveniente:

1. ejecutar cada habilidad básica en Canvas 2D y Phaser 4.2.1;
2. comprobar selector válido e inválido;
3. probar distintas distancias;
4. comprobar impacto, fallo y crítico;
5. derrotar un enemigo con cada habilidad;
6. verificar Vida progresiva y texto de daño;
7. confirmar que Chispa muestra la descarga completa anclada en zig-zag;
8. confirmar que la varita eléctrica lanza la chispa compacta con estela nerviosa;
9. comprobar que ambos efectos se distinguen entre sí y frente a las demás varitas;
10. cancelar una selección y una cola visual;
11. cambiar de mapa sin residuos;
12. verificar que Maná, tiempo y experiencia de maestría no cambiaron;
13. revisar que Canvas 2D continúa operativo.

No se afirma validación visual manual en esta entrega.

## 13. Criterio de cierre

P6.3A puede cerrarse después de confirmar manualmente que las cuatro habilidades básicas se reproducen en orden, se distinguen sin depender solamente del color, respetan daño y tiempo canónicos, eliminan correctamente objetivos derrotados y no dejan residuos al cancelar o cambiar de mapa.

## 14. Estado Git y commit propuesto

- Rama: `main`.
- HEAD base: `046a1d5391800ea827bdc71613eed5776d6f4dab`.
- Commit realizado: no.
- Push realizado: no.
- GitHub remoto modificado: no.

Conventional Commit propuesto:

```text
feat(phaser): representar habilidades basicas con contratos universales
```

## 15. Próximo paso

Después de la validación y commit de P6.3A, la etapa recomendada es `P6.3B`: análisis específico de estados y efectos temporales antes de implementar su representación persistente.

## 16. Cierre posterior confirmado

El usuario confirmó que las pruebas manuales fueron correctas y publicó P6.3A en:

`113130c8b0d6cc1d4e79a07709d7e814ab25d87d`

Este SHA constituye la base obligatoria de P6.3B.1.
