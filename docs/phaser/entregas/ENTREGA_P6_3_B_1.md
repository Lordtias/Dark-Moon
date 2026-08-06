# ENTREGA P6.3B.1 — CONTRATOS Y REPRESENTACIÓN PERSISTENTE DE ESTADOS

Fecha: 2026-08-05  
Etapa: P6.3B.1  
Base obligatoria: `113130c8b0d6cc1d4e79a07709d7e814ab25d87d`  
Rama esperada: `main`

## 1. Objetivo

Incorporar una representación visual persistente y reconciliable para los seis estados temporales canónicos sin trasladar a Phaser reglas de aplicación, resistencia, inmunidad, duración, acumulación, daño periódico o tiempo.

Estados incluidos:

- Ralentización.
- Electrización.
- Congelamiento.
- Aturdimiento.
- Envenenamiento.
- Quemadura.

## 2. Resultado

Cada entidad de la escena neutral transporta ahora sus instancias activas con:

- ID estable de instancia;
- ID del efecto canónico;
- nombre y tipo;
- perfil de aplicación;
- intensidad, cantidad y máximo;
- instante de aplicación;
- vencimiento y próximo tick;
- carácter beneficioso o perjudicial;
- perfil visual ya resuelto.

Phaser adjunta la representación persistente al contenedor de la entidad. El estado acompaña movimientos, desaparece al retirar la entidad y se reconstruye al aplicar una nueva escena. Canvas 2D utiliza una marca estática simple para conservar compatibilidad funcional.

## 3. Perfiles visuales

Se agregó `PerfilesEstadosTemporalesVisuales.json`, validado uno a uno contra `Efectos.json`.

La lectura no depende solamente del color:

| Estado | Canal espacial | Forma principal |
|---|---|---|
| Ralentización | Pies | Fragmentos y estela helada |
| Electrización | Laterales | Arcos quebrados |
| Congelamiento | Contorno | Carcasa cristalina parcial |
| Aturdimiento | Parte superior | Runas o chispas sobre la cabeza |
| Envenenamiento | Lateral izquierdo | Burbujas viscosas |
| Quemadura | Lateral derecho | Brasas y lenguas de fuego |

También se configuraron tres respuestas transitorias:

- `RESISTIDO`;
- `INMUNE`;
- `YA ACTIVO` para duplicados rechazados.

Como corrección posterior a la primera prueba manual, cada aplicación y
actualización muestra también el nombre del estado:

- `RALENTIZADO`;
- `ELECTRIZADO`;
- `CONGELADO`;
- `ATURDIDO`;
- `ENVENENADO`;
- `QUEMADO`.

Una renovación agrega `· RENOVADO`. Una intensificación o acumulación muestra
`×N` con la intensidad o cantidad canónica. Phaser y Canvas 2D reciben el
mismo texto ya resuelto por el perfil visual.

## 4. Contratos de eventos

`PlanificadorEventosVisuales` normaliza los eventos canónicos en:

- `efecto_temporal_aplicado`;
- `efecto_temporal_actualizado`;
- `efecto_temporal_no_aplicado`;
- `efecto_temporal_retirado`.

Correspondencias:

- `efecto_aplicado` → aplicación;
- `efecto_renovado`, `efecto_intensificado`, `efecto_acumulado` → actualización básica;
- `efecto_resistido`, `efecto_inmune`, duplicado rechazado → no aplicado;
- `efecto_vencido`, `efecto_retirado` → retirada.

Los rechazos diagnósticos internos, como un grupo incompatible, no generan feedback jugable.

`SistemaEfectosTemporales` amplió sus eventos con metadatos que ya poseía la instancia: perfil de aplicación, política, máximo, aplicación, próximo tick, etiquetas y naturaleza beneficiosa. No cambió ninguna decisión canónica.

## 5. Reconciliación

La escena final continúa siendo la autoridad.

- Una aplicación crea inmediatamente el estado persistente y una entrada transitoria.
- Una aplicación muestra el nombre del estado sobre el objetivo.
- Una actualización reemplaza la representación de la misma instancia y muestra renovación o intensificación sin crear otra regla temporal.
- Una retirada elimina la instancia y reproduce una salida breve cuando la entidad sigue visible.
- Muerte y cambio de mapa destruyen el contenedor, eliminando todos sus estados.
- Cancelar una cola sin aplicar la escena final restaura los estados de la última escena autoritativa ya dibujada.
- Los estados persistentes no se eliminan al limpiar proyectiles, textos o partículas transitorias.

## 6. Archivos nuevos

- `src/config/presentacion/PerfilesEstadosTemporalesVisuales.json`
- `src/interfaz/graficos/ContextoPerfilesEstadosTemporalesVisuales.js`
- `src/interfaz/graficos/ValidadorPerfilesEstadosTemporalesVisuales.js`
- `src/interfaz/graficos/phaser/CreadorEstadosTemporalesPhaser.js`
- `docs/phaser/entregas/ENTREGA_P6_3_B_1.md`

## 7. Archivos modificados

- `src/aplicacion/Aplicacion.js`
- `src/juego/configuracion/CargadorConfiguracion.js`
- `src/juego/efectos/SistemaEfectosTemporales.js`
- `src/config/magia/Habilidades.json`
- `src/interfaz/graficos/AdaptadorEscenaJuego.js`
- `src/interfaz/graficos/PlanificadorEventosVisuales.js`
- `src/interfaz/graficos/PlanificadorRitmoVisual.js`
- `src/interfaz/graficos/RenderizadorCanvas2D.js`
- `src/interfaz/graficos/phaser/CompositorMundoPhaser.js`
- `src/interfaz/graficos/phaser/ReproductorEventosVisualesPhaser.js`
- `README.md`
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
- `docs/phaser/entregas/ENTREGA_P6_3_A.md`

No hubo renombres ni eliminaciones.

## 8. Exclusiones

P6.3B.1 no incorpora todavía:

- pulso especializado antes del daño periódico;
- animación diferenciada del tick de Veneno y Quemadura;
- indicadores persistentes y densidad gráfica específica para `×2` o `×3`;
- densidad variable por intensidad o cantidad;
- convivencia visual avanzada de seis estados simultáneos;
- cambios de persistencia;
- nuevos estados;
- habilidades enemigas;
- zonas temporales;
- Lythra.

Estas responsabilidades quedan reservadas principalmente para P6.3B.2.

## 9. Ajuste de Ralentización

La prueba manual confirmó que el factor anterior era poco perceptible. Se
actualizaron exclusivamente los valores configurables de las habilidades:

| Habilidad | Grados | Factores nuevos |
|---|---:|---|
| Esquirla de hielo | 1–4 | 1.40, 1.45, 1.50, 1.55 |
| Nova de escarcha | 1–3 | 1.60, 1.65, 1.70 |

Además, el evento neutral de movimiento transporta un plan con
`factorTemporal = costoFinal / costoBase`. Phaser aplica ese factor a la
duración interpolada de cada paso. No consulta la habilidad ni recalcula el
estado: solamente representa el costo temporal ya resuelto.

Con la velocidad visual normal y un movimiento base enemigo de 190 ms:

- factor 1.40 → 266 ms;
- factor 1.60 → 304 ms.

## 10. Congelamiento reservado

Se registró para una etapa futura la intención de convertir Congelamiento en
un bloque de hielo que impida todas las acciones y evite recibir daño. No se
implementó en P6.3B.1 porque modifica reglas de daño, selección, efectos
periódicos e IA. Debe analizarse con Prisión glacial y las habilidades
avanzadas.

## 11. Validaciones técnicas realizadas

- sintaxis JavaScript con `node --check`;
- parseo de todos los JSON;
- resolución de imports relativos;
- imports ESM de los componentes nuevos y modificados clave;
- `git diff --check`;
- cobertura exacta de seis perfiles para seis efectos;
- aplicación y renovación;
- resistencia al 75 %;
- inmunidad;
- duplicado rechazado;
- vencimiento;
- creación de escena con estado activo;
- coexistencia de dos estados;
- retirada explícita;
- restauración de la escena anterior después de cancelar;
- reproducción de aplicación y retirada mediante el reproductor Phaser simulado;
- construcción procedural de las seis formas persistentes;
- construcción de los tres feedbacks no aplicados;
- representación Canvas 2D simulada;
- textos de aplicación, renovación e intensificación;
- factores visuales 1.40 y 1.60 convertidos en 266 ms y 304 ms;
- conservación de `costoFinal / costoBase` en el plan neutral de movimiento.

No se agregaron dependencias, `.mjs`, `node:test` ni archivos `.patch`.

## 12. Pruebas manuales pendientes

No se afirma validación visual real en navegador. El usuario debe verificar:

1. Esquirla de hielo muestra `RALENTIZADO`, aplica el factor 1.40 y la marca sigue al enemigo.
2. Chispa aplica Electrización y conserva la lectura violeta quebrada.
3. Aguijón tóxico muestra `ENVENENADO` y la marca permanece entre turnos.
4. Un estado resistido muestra `RESISTIDO` y no queda activo.
5. Un objetivo inmune muestra `INMUNE` y no queda activo.
6. Congelamiento o Aturdimiento repetido muestra `YA ACTIVO` sin duplicar el estado.
7. Un vencimiento elimina la marca.
8. Matar al objetivo elimina todas sus marcas.
9. Cambiar de mapa no deja objetos flotantes.
10. Un estado preservado del jugador reaparece en el mapa siguiente.
11. Cancelar una cola no deja un estado aplicado o retirado incorrectamente.
12. Renovar un estado muestra `· RENOVADO` y una intensificación muestra `×N`.
13. Nova de escarcha usa un movimiento perceptiblemente más lento que Esquirla.
14. Canvas 2D sigue dibujando el juego sin errores.

## 13. Riesgos controlados

- La duración visual no se cuenta en tiempo real: el dominio decide cuándo termina.
- Los eventos de habilidad no crean directamente estados persistentes, evitando duplicados.
- Los estados viven dentro del contenedor del actor y no en la capa de proyectiles.
- La escena neutral permite reconstruir el estado aunque se pierda o cancele un evento visual.
- Los eventos de retirada posteriores a una muerte no generan una salida flotante sobre una entidad ya eliminada.
- La animación usa la proporción temporal resuelta; no interpreta el origen de la Ralentización.

## 14. Estado Git esperado al entregar

- Rama: `main`.
- HEAD base: `113130c8b0d6cc1d4e79a07709d7e814ab25d87d`.
- Commit realizado: no.
- Push realizado: no.
- GitHub remoto modificado: no.

## 15. Conventional Commit propuesto

```text
feat(phaser): representar estados temporales persistentes
```

## 16. Próximo paso

Después de validar y publicar P6.3B.1, analizar e implementar P6.3B.2 para:

- renovaciones visibles;
- intensificación y cantidad;
- pulsos de daño periódico;
- indicadores de acumulación;
- convivencia visual avanzada;
- cierre completo de P6.3B.

## Ajuste posterior de legibilidad de feedback

Se unifico el tamaño y la duración de los textos flotantes de feedback para mejorar la lectura en Phaser y Canvas 2D. `FALLO`, `CRÍTICO`, `BLOQUEO`, nombres de estados y feedback de no aplicación ahora comparten un tamaño base mayor y una permanencia visual levemente superior, manteniendo sus colores y estilos originales.

