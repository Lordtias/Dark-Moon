# ENTREGA P6.3D.2 — PLAGA CORROSIVA

Fecha: 2026-08-06
Etapa: P6.3D.2
Base exacta: `b88c2c57c30c438d21223c9487ff08629b2ab335`
Rama: `main`
Commit realizado: no

## 1. Objetivo

Representar Plaga corrosiva en Phaser mediante el patrón reutilizable de proyectil, diferenciándola de Aguijón tóxico y sincronizando el impacto con la aplicación, renovación o intensificación canónica de una única instancia de Envenenamiento.

La presentación consume hechos ya resueltos. No calcula daño, críticos, probabilidades, resistencia, inmunidad, duración, intensidad, derrota ni daño periódico.

## 2. Base y cierre documental anterior

El ZIP recibido contiene `.git`, rama `main` y HEAD:

`b88c2c57c30c438d21223c9487ff08629b2ab335`

La referencia incluida `origin/main` apunta al mismo SHA. Las marcas iniciales de 124 archivos fueron verificadas como diferencias exclusivas de finales de línea CRLF/LF, sin cambios reales de contenido.

P6.3D.1 queda registrada como validada y commiteada en ese SHA.

## 3. Comportamiento canónico conservado

Plaga corrosiva mantiene sin cambios:

- selección individual de un enemigo;
- patrón libre con línea de visión;
- daño directo de Veneno;
- aplicación de Envenenamiento solamente si el impacto acierta y el objetivo sobrevive;
- una única instancia por el grupo `envenenamiento`;
- política de aplicación `intensificar`;
- intensidad inicial 1;
- incremento de 1 por aplicación aceptada;
- máximos 2, 3 y 3 según el grado;
- renovación de duración;
- conservación de la mayor potencia periódica;
- cadencia canónica del próximo tick;
- daño periódico base multiplicado por la intensidad;
- resolución independiente de resistencia e inmunidad.

No se modificaron `Habilidades.json`, `Efectos.json` ni `SistemaEfectosTemporales.js`.

## 4. Generalización del patrón de proyectil

`ReproductorEventosVisualesPhaser` ya no limita `proyectil_basico` al nivel visual `basica`.

Ahora valida el contrato reusable:

```text
patronVisual = proyectil
secuencia = proyectil_basico
```

Esto permite representar Plaga corrosiva y futuros proyectiles compatibles sin crear un reproductor exclusivo ni depender de la categoría básica, intermedia o avanzada.

## 5. Identidad visual de Plaga corrosiva

`CreadorEfectosHabilidadesPhaser` interpreta los identificadores ya declarados en el perfil:

- `masa_corrosiva`;
- `pesado`;
- `toxina_burbujeante`;
- `gotas_corrosivas`;
- `corrosion_expansiva`.

La presentación incluye:

- proyectil grande e irregular;
- núcleo tóxico con burbujas visibles;
- pequeñas masas residuales en la cola;
- avance con giro leve, compresión y movimiento pesado;
- gotas corrosivas más grandes que la estela de Aguijón tóxico;
- salpicadura expansiva y charco breve en el impacto;
- burbujas y gotas adicionales según la intensidad canónica.

Aguijón tóxico conserva su forma fina, punzante y más pequeña.

## 6. Intensidad visual

El planificador ya correlacionaba los eventos derivados mediante `idEjecucion`. El reproductor consulta dentro del impacto únicamente eventos visuales de Envenenamiento ya normalizados:

- `efecto_temporal_aplicado`;
- `efecto_temporal_actualizado`.

Desde esos eventos recibe:

- intensidad actual;
- máximo;
- operación aplicada;
- indicador de máximo alcanzado.

La intensidad modifica solamente densidad, radio y cantidad de burbujas o salpicaduras. No altera daño, duración, probabilidad ni cantidad de instancias.

Si el estado es resistido o el objetivo es inmune, el impacto directo continúa siendo corrosivo, pero no se agrega una intensificación visual inexistente.

## 7. Fallo, crítico, resistencia e inmunidad

- **Fallo:** el proyectil completa la trayectoria y se reproduce `FALLO`; no se crea impacto tóxico efectivo ni cambio de intensidad.
- **Crítico:** aumenta el énfasis del daño directo y del impacto, sin modificar la aplicación del estado.
- **Resistencia:** se muestra el daño directo y luego `RESISTIDO`; la instancia existente no cambia.
- **Inmunidad:** se muestra el daño directo y luego `INMUNE`; no se aplica, renueva ni intensifica Envenenamiento.

Todas las decisiones provienen del dominio.

## 8. Derrota integrada

`PlanificadorEventosVisuales` integra ahora las derrotas del patrón `proyectil` dentro del impacto correspondiente, igual que ya ocurría con cadena y línea.

Esto evita:

- que el objetivo permanezca visible después de recibir daño letal;
- que la derrota aparezca al final de toda la habilidad;
- que se genere una segunda reproducción separada.

Si el daño directo derrota al objetivo, no existe un evento posterior de Envenenamiento y la muerte se procesa en ese mismo impacto.

## 9. Canvas 2D

Canvas 2D permanece operativo y sin reglas nuevas.

Continúa consumiendo:

- el estado final canónico;
- una única instancia de Envenenamiento;
- intensidad y máximo reales;
- indicador `×N`;
- feedback de resistencia e inmunidad;
- daño periódico y derrota mediante sus eventos existentes.

## 10. Archivos modificados

- `src/interfaz/graficos/PlanificadorEventosVisuales.js`
- `src/interfaz/graficos/phaser/ReproductorEventosVisualesPhaser.js`
- `src/interfaz/graficos/phaser/CreadorEfectosHabilidadesPhaser.js`
- `README.md`
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
- `docs/phaser/entregas/ENTREGA_P6_3_D_1.md`

## 11. Archivo nuevo

- `docs/phaser/entregas/ENTREGA_P6_3_D_2.md`

## 12. Arquitectura

La separación queda así:

- el dominio decide impacto, daño, crítico, estado, intensidad, resistencia, inmunidad y derrota;
- `PlanificadorEventosVisuales` correlaciona resultados y embebe la derrota en el impacto de proyectil;
- `ReproductorEventosVisualesPhaser` organiza conjuración, trayectoria, impacto y feedback;
- `CreadorEfectosHabilidadesPhaser` dibuja recursos procedurales sin consultar reglas jugables;
- Canvas 2D conserva su presentación de respaldo.

No se agregó dependencia, archivo `.mjs`, archivo `.patch` ni reproductor exclusivo.

## 13. Pruebas automatizadas realizadas

Se verificó mediante scripts temporales externos al repositorio:

1. creación de la masa corrosiva y textura burbujeante;
2. creación de gotas corrosivas durante la trayectoria;
3. impacto de intensidad 3 con más marcas que intensidad 1;
4. anillo exterior al alcanzar el máximo;
5. aceptación de Plaga como proyectil avanzado reutilizable;
6. transferencia de intensidad 3/3 al creador visual;
7. movimiento pesado con escala final 1.08 × 0.92;
8. derrota integrada en el impacto sin evento separado;
9. correlación de `efecto_intensificado` con intensidad y máximo canónicos.

También se valida globalmente:

- sintaxis JavaScript;
- lectura de JSON;
- imports relativos;
- perfiles visuales;
- ausencia de `.mjs` y `.patch`;
- `git diff --check`;
- aplicación del ZIP incremental sobre una copia limpia;
- comparación archivo por archivo con el ZIP completo.

## 14. Pruebas manuales pendientes en navegador

1. lanzar Plaga corrosiva grado 1 sin Envenenamiento previo;
2. aplicar una segunda vez y observar `×2`;
3. reaplicar al máximo y confirmar renovación sin superar el límite;
4. repetir grados 2 y 3 hasta `×3`;
5. comparar tamaño, peso y estela con Aguijón tóxico;
6. probar fallo y crítico;
7. probar resistencia e inmunidad;
8. provocar derrota por daño directo;
9. comprobar derrota posterior por tick;
10. cancelar durante la trayectoria y cambiar de mapa;
11. revisar Canvas 2D.

No fue posible ejecutar estas pruebas visuales en un navegador interactivo dentro del entorno de entrega.

## 15. Exclusiones

No se modifica:

- daño;
- costo de Maná;
- costo temporal;
- alcance;
- duración;
- intervalo;
- probabilidad;
- intensidad máxima;
- daño periódico;
- sistema canónico de Envenenamiento;
- IA;
- habilidades de Lythra;
- sonido;
- Prisión glacial;
- Congelamiento;
- bloqueo de acciones;
- inmunidad al daño;
- turnos congelados.

## 16. Riesgos conocidos

La densidad y legibilidad del efecto deben confirmarse manualmente con los tamaños reales de casilla, sprites, barras y velocidad de animación. El código limita la variación a tres niveles canónicos y no crea partículas persistentes, pero el ajuste artístico final depende de la revisión en navegador.

## 17. Conventional Commit propuesto

```text
feat(phaser): representar Plaga corrosiva e intensificar Envenenamiento

- generalizar el patrón visual de proyectiles para habilidades avanzadas
- representar una masa tóxica pesada con burbujas y gotas corrosivas
- sincronizar aplicación, renovación e intensificación de Envenenamiento
- reflejar la intensidad canónica sin recalcular reglas en Phaser
- integrar resistencia, inmunidad, fallos, críticos y derrotas
- evitar duplicaciones visuales de estado y muerte
- mantener Canvas 2D operativo
- cerrar documentalmente P6.3D.1
```

## 18. Próximo paso

Comenzar un análisis funcional y visual específico con el usuario para **P6.3D.3 — Prisión glacial y rediseño de Congelamiento**. No debe implementarse ni definirse anticipadamente.


## 19. Cierre posterior

P6.3D.2 fue validada manualmente por el usuario y commiteada en:

`f5edc8d61776a21a15e627289faeab20f3e00b7e`

Ese commit es la base exacta utilizada para P6.3D.3.
