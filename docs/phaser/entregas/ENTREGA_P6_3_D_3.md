# ENTREGA P6.3D.3 — RÁFAGA GLACIAL, BLOQUEO TOTAL Y CONTRAEFECTOS

Fecha: 2026-08-06  
Etapa: P6.3D.3  
Base exacta: `f5edc8d61776a21a15e627289faeab20f3e00b7e`  
Rama: `main`  
Commit realizado: no

## 1. Objetivo

Reemplazar Prisión glacial por **Ráfaga glacial**, simplificar Congelamiento como un control total sin inmunidad al daño y crear contratos reutilizables para controles y contraefectos sin introducir reglas específicas de Fuego o Frío dentro del código.

La habilidad avanzada de Frío conserva daño, Maná, costo temporal, alcance y duración. Su nueva identidad funcional es una ráfaga intensa de viento helado que causa daño directo y tiene 60 % de probabilidad base de aplicar Congelamiento.

## 2. Base utilizada y cierre de P6.3D.2

El ZIP recibido contiene `.git`, rama `main` y HEAD:

`f5edc8d61776a21a15e627289faeab20f3e00b7e`

La referencia incluida `origin/main` apunta al mismo SHA. Las 124 marcas iniciales fueron comprobadas como diferencias exclusivas de finales de línea CRLF/LF; después de normalizarlas no quedó ninguna diferencia real de contenido.

P6.3D.2 fue validada manualmente por el usuario y queda cerrada en ese commit.

## 3. Ráfaga glacial

La habilidad cambia:

- ID: `prision_glacial` → `rafaga_glacial`;
- nombre: Prisión glacial → Ráfaga glacial;
- descripción e icono;
- probabilidad base de Congelamiento: 60 % en los tres grados;
- perfil visual: ráfaga de viento y cristales en lugar de prisión física.

Se conservan sin cambios:

| Grado | Maná | Tiempo | Alcance | Daño de Frío | Duración de Congelamiento |
|---:|---:|---:|---:|---:|---:|
| 1 | 8 | 115 | 5 | 9 | 80 |
| 2 | 10 | 112 | 6 | 12 | 90 |
| 3 | 13 | 110 | 6 | 16 | 100 |

La resistencia a Congelamiento continúa reduciendo la probabilidad efectiva. Si el ataque falla o el daño derrota al objetivo, no se aplica el estado. Una reaplicación sobre Congelamiento activo sigue siendo rechazada y no renueva la duración.

## 4. Contrato genérico de bloqueo total

`ContratosEfectosTemporales` incorpora dos tipos canónicos:

- `bloqueo_total`;
- `bloqueo_habilidades`.

Congelamiento y Aturdimiento utilizan `bloqueo_total`. Parálisis queda configurada para contenido futuro con el mismo contrato.

Mientras existe un bloqueo total, la entidad no puede:

- moverse;
- atacar;
- lanzar habilidades;
- consumir objetos;
- interactuar;
- realizar otra acción jugable.

Para el jugador, el coordinador devuelve un rechazo explícito sin consumir turno. Para enemigos y otros actores administrados por la agenda, `SistemaTiempo` considera el vencimiento más lejano del bloqueo y saltea al actor hasta ese instante, sin registrar una espera ficticia.

## 5. Silencio preparado para uso futuro

Silencio queda configurado como `bloqueo_habilidades`.

Cuando exista una fuente jugable que lo aplique:

- impedirá lanzar habilidades;
- permitirá movimiento;
- permitirá ataques normales;
- permitirá objetos e interacciones.

No se agregan todavía habilidades, afijos, resistencias, inmunidades ni balance definitivo para Silencio o Parálisis.

## 6. Sin inmunidad al daño

Congelamiento no crea:

- inmunidad;
- reducción de daño;
- barrera;
- entidad de hielo;
- Vida propia;
- colisión;
- pared;
- bloqueo de línea de visión.

El objetivo congelado permanece visible, seleccionable y vulnerable. Puede recibir daño directo, críticos, daño periódico y derrotas normalmente.

Los efectos no incompatibles continúan su calendario. Por ejemplo, Envenenamiento sigue aplicando ticks mientras el objetivo está congelado.

## 7. Sistema genérico de contraefectos

`Efectos.json` incorpora la propiedad:

```json
"eliminaEfectosAlAplicarse": ["id_otro_efecto"]
```

El sistema temporal evalúa las declaraciones del efecto nuevo y de cada efecto activo. La relación puede ser direccional; para una cancelación mutua se declara en ambos efectos.

Orden canónico:

1. validar inmunidad;
2. resolver resistencia y probabilidad;
3. resolver reaplicación o rechazo por duplicado;
4. solo si la aplicación fue aceptada, retirar los efectos incompatibles;
5. emitir `efecto_retirado` con motivo `contraefecto`;
6. aplicar o actualizar el efecto nuevo.

La retirada incluye:

- efecto retirado;
- efecto causante;
- definición causante;
- ejecución causante.

Quemadura y Congelamiento son el primer uso real:

- Congelamiento aceptado retira Quemadura;
- Quemadura aceptada retira Congelamiento;
- resistencia, inmunidad o duplicado conservan el efecto activo;
- recibir solamente daño de Fuego o Frío no ejecuta el contraefecto.

No se implementan conversiones, pausas, reducción de intensidad ni combinaciones elementales adicionales.

## 8. Eventos y planificación visual

`efecto_retirado` se incorpora a los eventos correlacionables de una habilidad. Cuando Ráfaga glacial elimina Quemadura, el plan visual conserva dentro del mismo impacto:

1. retirada de Quemadura;
2. aplicación de Congelamiento.

El mismo contrato funciona en sentido inverso para una habilidad que aplique Quemadura.

Phaser y Canvas 2D no comparan elementos ni deciden incompatibilidades; reciben los eventos ya resueltos.

## 9. Diseño visual de Ráfaga glacial

El perfil utiliza:

- forma `rafaga_glacial`;
- movimiento `impulso_fuerte`;
- textura `viento_helado`;
- estela `cristales_arrastrados`;
- impacto `choque_glacial`;
- patrón reusable `proyectil`.

La presentación incluye:

- corriente ancha de viento azulado;
- cristales arrastrados durante la trayectoria;
- compresión y expansión para transmitir fuerza;
- impacto de aire helado y escarcha;
- lectura claramente distinta de Esquirla de hielo.

No existe cierre vertical, bloque sólido ni carcasa invulnerable.

## 10. Presentación persistente de estados

Congelamiento cambia a `escarcha_inmovilizante`: cristales y placas finas alrededor del contorno sin ocultar al actor ni su barra de Vida.

También se preparan perfiles visuales para:

- Parálisis: `anillos_paralisis`;
- Silencio: `sello_silencio`.

Estos perfiles no crean contenido jugable ni aplican estados por sí mismos.

## 11. Canvas 2D

Canvas 2D permanece operativo.

La representación de Congelamiento utiliza una marca de escarcha alrededor de la entidad, sin sugerir invulnerabilidad o una pared. Los eventos canónicos de aplicación, retirada, vencimiento, daño y derrota siguen siendo la fuente de verdad.

## 12. Compatibilidad de guardados

Los guardados anteriores pueden contener `prision_glacial`.

Se agregan alias explícitos para:

- progreso y grado aprendido;
- barra de habilidades.

Al restaurar, `prision_glacial` se convierte en `rafaga_glacial`. Los nuevos guardados utilizan exclusivamente el ID nuevo.

El icono anterior se elimina y se incorpora `assets/imagenes/habilidades/rafaga_glacial.png`.

## 13. Balance y depuración

El analizador de combate se actualiza para medir Ráfaga glacial como control total probabilístico, no como inmovilización posicional. Se retira la configuración obsoleta `distanciasPrision`.

La herramienta de depuración valida:

- los tipos `bloqueo_total` de Congelamiento, Aturdimiento y Parálisis;
- el tipo `bloqueo_habilidades` de Silencio;
- la relación mutua entre Quemadura y Congelamiento;
- la existencia y grados de Ráfaga glacial.

No se modifican valores de balance fuera del 60 % aprobado para Congelamiento.

## 14. Archivos modificados

- `README.md`
- `balance.html`
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
- `docs/phaser/entregas/ENTREGA_P6_3_D_2.md`
- `src/config/magia/Efectos.json`
- `src/config/magia/Habilidades.json`
- `src/config/presentacion/PerfilesEstadosTemporalesVisuales.json`
- `src/config/presentacion/PerfilesHabilidadesVisuales.json`
- `src/herramientas/balance/AnalizadorBalanceCombate.js`
- `src/herramientas/balance/BalanceAplicacion.js`
- `src/herramientas/balance/ObjetivosBalance.json`
- `src/herramientas/depuracion/DepuradorMagiaHabilidades.js`
- `src/interfaz/graficos/PlanificadorEventosVisuales.js`
- `src/interfaz/graficos/RenderizadorCanvas2D.js`
- `src/interfaz/graficos/ValidadorPerfilesEstadosTemporalesVisuales.js`
- `src/interfaz/graficos/phaser/CreadorEfectosHabilidadesPhaser.js`
- `src/interfaz/graficos/phaser/CreadorEstadosTemporalesPhaser.js`
- `src/interfaz/graficos/phaser/ReproductorEventosVisualesPhaser.js`
- `src/juego/Juego.js`
- `src/juego/efectos/CatalogoEfectos.js`
- `src/juego/efectos/ContratosEfectosTemporales.js`
- `src/juego/efectos/SistemaEfectosTemporales.js`
- `src/juego/habilidades/MotorEfectosHabilidad.js`
- `src/juego/habilidades/PersistenciaBarraHabilidades.js`
- `src/juego/habilidades/SistemaHabilidadesJugador.js`
- `src/juego/ia/SistemaAccionesEnemigos.js`
- `src/juego/maestrias/ProgresoMagicoJugador.js`
- `src/juego/tiempo/CoordinadorTiempoPartida.js`
- `src/juego/tiempo/SistemaTiempo.js`

## 15. Archivos nuevos

- `assets/imagenes/habilidades/rafaga_glacial.png`
- `docs/phaser/entregas/ENTREGA_P6_3_D_3.md`

## 16. Archivo eliminado

- `assets/imagenes/habilidades/prision_glacial.png`

El ZIP incremental incluye una instrucción explícita para eliminarlo antes de copiar los archivos completos.

## 17. Pruebas automatizadas realizadas

Se ejecutaron scripts temporales externos al repositorio para comprobar:

1. carga de 12 habilidades y 8 efectos;
2. Ráfaga glacial con 60 % de Congelamiento;
3. tipos de control configurados;
4. Quemadura → Congelamiento;
5. Congelamiento → Quemadura;
6. orden `efecto_retirado` antes de `efecto_aplicado`;
7. resistencia sin retirada del efecto activo;
8. rechazo por duplicado sin renovación;
9. Envenenamiento haciendo daño durante Congelamiento;
10. agenda temporal salteando un actor bloqueado hasta el vencimiento;
11. Silencio bloqueando solo habilidades;
12. Parálisis usando bloqueo total;
13. migración de barra antigua;
14. migración de progreso antiguo;
15. correlación visual de retirada y aplicación dentro del impacto;
16. creación procedural de conjuración, proyectil, estela e impacto de Ráfaga glacial;
17. creación de perfiles persistentes de Congelamiento, Parálisis y Silencio.

También se valida globalmente:

- sintaxis JavaScript;
- lectura de JSON;
- imports relativos;
- validadores de habilidades, efectos y perfiles;
- `git diff --check`;
- ausencia de `.mjs` y `.patch` dentro del repositorio;
- estado Git y HEAD del ZIP completo;
- aplicación del ZIP incremental sobre una copia limpia;
- igualdad archivo por archivo entre incremental aplicado y ZIP completo;
- SHA-256 de los entregables.

## 18. Pruebas manuales pendientes en navegador

1. comprobar el nuevo nombre, icono y descripción;
2. lanzar Ráfaga glacial en grados 1, 2 y 3;
3. confirmar daño y 60 % de probabilidad mediante varias tiradas;
4. confirmar reducción de probabilidad por resistencia;
5. confirmar inmunidad a Congelamiento;
6. comprobar bloqueo completo del jugador;
7. comprobar bloqueo completo de enemigos adyacentes y lejanos;
8. atacar y dañar normalmente a un objetivo congelado;
9. observar Envenenamiento durante Congelamiento;
10. aplicar Quemadura sobre Congelamiento y verificar sustitución;
11. aplicar Congelamiento sobre Quemadura y verificar sustitución;
12. confirmar que resistencia, inmunidad y duplicado no retiran el efecto activo;
13. comprobar vencimiento por tiempo;
14. verificar la ráfaga, cristales, impacto y escarcha persistente;
15. revisar Canvas 2D;
16. cargar un guardado anterior con la habilidad aprendida y asignada a la barra.

No fue posible ejecutar pruebas visuales interactivas dentro de un navegador en el entorno de entrega.

## 19. Exclusiones

No se implementa:

- inmunidad al daño;
- barrera o Vida del hielo;
- ruptura anticipada;
- pared o colisión;
- bloqueo de línea de visión;
- pausa de efectos periódicos;
- eliminación automática por recibir daño elemental;
- habilidades que apliquen Parálisis o Silencio;
- resistencias o afijos de Parálisis o Silencio;
- cambio de daño, Maná, tiempo, alcance o duración;
- IA nueva para elegir habilidades;
- sonido;
- contenido de Lythra.

## 20. Riesgos conocidos

- La legibilidad y densidad de partículas de Ráfaga glacial deben confirmarse con los sprites y tamaños reales de casilla.
- La probabilidad de 60 % puede requerir análisis de balance futuro después de pruebas jugables; esta entrega no la ajusta.
- Parálisis y Silencio están preparados como contratos y perfiles, pero todavía no tienen fuente jugable ni balance definitivo.
- Los guardados antiguos se migran en progreso y barra; cualquier persistencia externa no canónica que guarde el ID fuera de esos contratos no está cubierta.

## 21. Conventional Commit propuesto

```text
feat(magia): rediseñar Ráfaga glacial y generalizar controles

- reemplazar Prisión glacial por Ráfaga glacial con 60 % de Congelamiento
- unificar Congelamiento, Aturdimiento y Parálisis mediante bloqueo total
- preparar Silencio como bloqueo exclusivo de habilidades
- declarar y resolver contraefectos de forma genérica desde Efectos.json
- cancelar mutuamente Quemadura y Congelamiento tras una aplicación aceptada
- conservar daño normal y efectos periódicos durante Congelamiento
- representar la ráfaga helada y la escarcha persistente en Phaser y Canvas 2D
- migrar progreso y barra desde el identificador anterior
- actualizar balance, depuración y documentación de P6.3D.3
```

## 22. Próximo paso

Después de la validación manual y el commit de P6.3D.3, el plan continúa con **P6.3E — habilidades canónicas de NPC para Lythra**. Antes de implementar esa etapa debe analizarse el código real de la nueva base y presentarse una propuesta para aprobación.
