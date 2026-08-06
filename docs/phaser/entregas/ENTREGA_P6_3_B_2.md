# ENTREGA P6.3B.2 — CICLOS VISUALES DE ESTADOS TEMPORALES

Fecha: 2026-08-05  
Etapa: P6.3B.2  
Base obligatoria: `0c61b97269509d8be8ac35c2e5af78c3a84800ba`  
Rama esperada: `main`

## 1. Objetivo

Completar el ciclo visual de los estados temporales sin trasladar reglas canónicas a Phaser. La entrega agrega ticks temáticos, actualización en sitio, densidad por intensidad o cantidad, indicadores persistentes y coexistencia avanzada. También registra el cierre manual pendiente de P6.3B.1.

## 2. Cierre documental de P6.3B.1

P6.3B.1 fue validada manualmente y cerrada en:

`0c61b97269509d8be8ac35c2e5af78c3a84800ba`

README, Plan Maestro, Diseño Maestro y `ENTREGA_P6_3_B_1.md` fueron actualizados para reflejar el cierre real.

## 3. Contrato visual de tick

Se incorpora `efecto_temporal_tick` como evento neutral. Conserva ID de instancia, efecto canónico, objetivo visual, intensidad, cantidad, máximo, perfil y tiempo canónico.

El orden de reproducción es:

1. `efecto_temporal_tick`;
2. pulso temático;
3. `danio_periodico`;
4. texto de daño y barra de Vida;
5. derrota, si corresponde.

El tick visual no aplica ni calcula daño.

## 4. Veneno y Quemadura

- Envenenamiento: burbujas tóxicas que se inflan y estallan.
- Quemadura: llamarada breve y ascendente.

Ambos conservan colores, textura y ritmo propios. El daño real continúa llegando mediante `danio_periodico_aplicado`.

## 5. Renovación e intensificación

Una actualización ya no destruye siempre el objeto persistente. El compositor busca la instancia existente y solicita al creador que la redibuje en el mismo contenedor.

- renovación: conserva instancia y agrega pulso breve;
- intensificación: aumenta densidad, actualiza `×N` y agrega pulso;
- acumulación futura: reutiliza cantidad y el mismo contrato;
- reconciliación de escena: actualiza en sitio cuando la clave de instancia coincide.

## 6. Intensidad y cantidad

Los perfiles declaran:

- `densidadMaxima`;
- `mostrarMultiplicador`;
- `pulsoTick`.

La lectura visual se limita a tres niveles:

- nivel 1: densidad normal;
- nivel 2: densidad mayor y `×2`;
- nivel 3: densidad máxima y `×3`.

No se altera la intensidad canónica ni su máximo jugable.

## 7. Coexistencia

Se mantienen los seis canales espaciales de P6.3B.1. Cuando coexisten cuatro o más estados, Canvas 2D compacta ligeramente las formas para preservar la lectura del sprite. Phaser mantiene cada estado como hijo independiente del contenedor de la entidad y ubica los indicadores según su canal.

## 8. Canvas 2D

Canvas 2D incorpora:

- pulsos de Veneno y Quemadura;
- densidad por intensidad;
- indicadores `×2` y `×3`;
- compactación cuando coexisten varios estados;
- conservación de los textos de aplicación y actualización.

## 9. Archivos nuevos

- `docs/phaser/entregas/ENTREGA_P6_3_B_2.md`

## 10. Archivos modificados

- `src/config/presentacion/PerfilesEstadosTemporalesVisuales.json`
- `src/interfaz/graficos/ValidadorPerfilesEstadosTemporalesVisuales.js`
- `src/interfaz/graficos/PlanificadorEventosVisuales.js`
- `src/interfaz/graficos/RenderizadorCanvas2D.js`
- `src/interfaz/graficos/phaser/CompositorMundoPhaser.js`
- `src/interfaz/graficos/phaser/CreadorEstadosTemporalesPhaser.js`
- `src/interfaz/graficos/phaser/ReproductorEventosVisualesPhaser.js`
- `README.md`
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
- `docs/phaser/entregas/ENTREGA_P6_3_B_1.md`

## 11. Exclusiones

No se modificaron:

- daño periódico;
- duración;
- resistencias o inmunidades;
- políticas de acumulación;
- balance;
- IA;
- persistencia;
- Congelamiento como invulnerabilidad;
- habilidades avanzadas;
- zonas temporales;
- Lythra.

## 12. Validaciones técnicas

- sintaxis JavaScript;
- JSON;
- imports relativos;
- `git diff --check`;
- correspondencia de seis perfiles con seis efectos;
- orden `tick → daño`;
- pulso de Veneno;
- pulso de Quemadura;
- actualización de una misma instancia;
- densidad e indicador `×3`;
- soporte sintético de cantidad;
- coexistencia de seis perfiles;
- revisión dirigida de referencias nuevas;
- integridad del ZIP completo e incremental.

## 13. Pruebas manuales pendientes

1. Aplicar Envenenamiento y esperar un tick.
2. Confirmar que las burbujas aparecen antes del daño.
3. Probar Quemadura mediante simulación o habilidad disponible y verificar la llamarada.
4. Renovar un estado y comprobar que no parpadea ni se duplica.
5. Intensificar Envenenamiento y comprobar densidad y `×2/×3`.
6. Probar dos o más estados simultáneos.
7. Provocar muerte por daño periódico.
8. Cambiar de mapa durante estados activos.
9. Cancelar una cola durante un tick.
10. Verificar Canvas 2D.

## 14. Estado Git esperado al entregar

- Rama: `main`.
- HEAD base: `0c61b97269509d8be8ac35c2e5af78c3a84800ba`.
- Commit realizado: no.
- Push realizado: no.
- GitHub remoto modificado: no.

## 15. Conventional Commit propuesto

```text
feat(phaser): completar ciclos visuales de estados temporales
```

## 16. Próximo paso

Después de la validación manual y el commit, continuar con P6.3C.1: habilidades intermedias de área y cadena.
