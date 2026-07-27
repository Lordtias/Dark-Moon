# ETAPA 8 — Habilidades mágicas básicas completas

## Base de trabajo

- Repositorio: `https://github.com/Lordtias/Dark-Moon.git`
- Rama: `main`
- Commit base y HEAD remoto verificado: `72f5a674efa85cc1e7a1362057c53d1e55c2448e`
- Entrega anterior: `docs/magia/ENTREGA_ETAPA_7_ESPECIAL.md`
- Documento maestro de referencia: `docs/magia/Plan_Maestro_Magia_Habilidades_Maestrias_Dark_Moon_v1.9.docx`

La descarga Git de una copia de trabajo no estuvo disponible en el entorno de generación por falta de resolución de red. Los reemplazos se prepararon desde los archivos exactos inspeccionados del commit indicado. No fue posible observar el `git status` de la copia local del usuario; debe comprobarse antes de instalar.

## Resultado funcional

Quedaron configuradas y conectadas al mismo flujo canónico:

- Ascua — Fuego;
- Esquirla de hielo — Frío;
- Chispa — Rayo;
- Aguijón tóxico — Veneno.

Las cuatro habilidades comparten:

- `SistemaHabilidadesJugador` como único motor de lanzamiento;
- selección individual libre dentro del alcance;
- confirmación única;
- una sola generación de `idEjecucion`;
- un solo consumo de Maná;
- un solo coste temporal;
- una sola recompensa de experiencia de maestría;
- daño elemental y resistencias comunes;
- efectos temporales gestionados por el coordinador temporal común;
- progreso en `ProgresoMagicoJugador`;
- referencias de acceso rápido en la barra;
- fachada `darkMoonDebug.magia`.

## Regla de equipamiento

Ningún arma, armadura ni familia de objeto habilita o bloquea una habilidad mágica.

La Potencia de Habilidad se obtiene sumando una vez los aportes de todos los objetos equipados. Dos armas de una mano con `+12 %` y `+8 %` producen `+20 %` de Potencia de Habilidad para un único lanzamiento. No se aplica la ecuación dual, el coste secundario ni una penalización de mano.

## Configuración final

### Ascua

| Grado | Maná | Tiempo | Alcance | Daño de Fuego | Efecto |
|---:|---:|---:|---:|---:|---|
| 1 | 3 | 90 | 4 | 8 | Ninguno |
| 2 | 4 | 88 | 4 | 11 | Ninguno |
| 3 | 5 | 85 | 5 | 15 | Ninguno |
| 4 | 6 | 82 | 5 | 20 | Ninguno |

### Esquirla de hielo

| Grado | Maná | Tiempo | Alcance | Daño de Frío | Movimiento | Duración |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 3 | 95 | 5 | 6 | factor 1,15 | 150 |
| 2 | 4 | 95 | 5 | 8 | factor 1,20 | 200 |
| 3 | 5 | 92 | 6 | 11 | factor 1,25 | 250 |
| 4 | 6 | 90 | 6 | 14 | factor 1,30 | 300 |

El efecto usa `modificador_factor`, modifica `factorMovimiento` y renueva duración sin crear otro procesador.

### Chispa

| Grado | Maná | Tiempo | Alcance | Daño de Rayo | Tiempo del objetivo | Duración |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 2 | 75 | 4 | 5 | factor 1,08 | 100 |
| 2 | 3 | 72 | 4 | 7 | factor 1,12 | 150 |
| 3 | 4 | 70 | 5 | 10 | factor 1,16 | 200 |
| 4 | 5 | 68 | 5 | 13 | factor 1,20 | 250 |

El efecto usa `modificador_factor`, modifica `factorTiempo` y renueva duración.

### Aguijón tóxico

Se conservó el balance previo.

| Grado | Maná | Tiempo | Alcance | Daño directo | Daño periódico | Duración | Intervalo |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 3 | 90 | 4 | 4 | 2 | 300 | 100 |
| 2 | 4 | 90 | 4 | 6 | 2 | 400 | 100 |
| 3 | 5 | 85 | 5 | 8 | 3 | 400 | 100 |
| 4 | 6 | 80 | 5 | 11 | 4 | 400 | 100 |

La toxina pasa por `danio_periodico` del sistema temporal común y renueva duración.

## Arquitectura anterior y final

### Antes

- Ascua, Esquirla de hielo y Chispa existían en el catálogo, pero no tenían ejecución completa.
- Aguijón tóxico tenía ejecución, pero el adaptador de efectos conservaba un procesador alternativo.
- El adaptador de daño no utilizaba de forma directa el contrato canónico de `resolverPaqueteDanio`.
- La geometría podía heredar indirectamente el patrón del arma activa.
- La potencia estaba enfocada en fuentes catalizadoras, no en todos los objetos equipados.

### Después

- Las cuatro habilidades usan una sola configuración ejecutable y el mismo motor.
- El paquete de daño elemental se resuelve una vez y se aplica una vez a Vida.
- Impacto y crítico reutilizan el cálculo común sin ejecutar el flujo dual de armas.
- Los efectos se prevalidan y se aplican únicamente mediante el coordinador temporal.
- No existe intervalo ni sesión fallback para veneno.
- `patronAtaqueActual` queda sobrescrito por el patrón configurado de la habilidad.
- La Potencia de Habilidad suma todos los objetos equipados una vez, sin revisar su familia.
- La integración destruye el sistema, oyentes e interfaz al cambiar de mapa.

## Archivos modificados

### `src/config/magia/Habilidades.json`

Completa los cuatro grados jugables de Ascua, Esquirla de hielo y Chispa; normaliza el efecto de Aguijón tóxico sin alterar sus valores.

### `src/juego/habilidades/ValidadorConfiguracionEjecucionHabilidades.js`

Valida los cuatro grados, daño elemental, efectos temporales canónicos, factores, acumulación, alcance, patrón e iconos.

### `src/juego/habilidades/SistemaHabilidadesJugador.js`

Centraliza prevalidación y confirmación. Cada lanzamiento crea un ID y llama una vez a Maná, daño, efectos, tiempo y experiencia. No consulta el tipo de equipamiento.

### `src/juego/habilidades/MotorDanioHabilidad.js`

Resuelve impacto, crítico, escalado, Potencia de Habilidad, paquete elemental, resistencia y descuento de Vida una sola vez. Incorpora tiradas deterministas de depuración.

### `src/juego/habilidades/MotorEfectosHabilidad.js`

Convierte los efectos configurados en definiciones canónicas y los entrega una sola vez al coordinador temporal.

### `src/juego/habilidades/EstadoSesionHabilidades.js`

Conserva solamente barra, contador y última ejecución. Elimina el almacenamiento fallback de efectos.

### `src/juego/habilidades/IntegracionHabilidadesJugador.js`

Mantiene una sola instancia del motor por mapa, elimina el intervalo auxiliar y destruye todos los componentes de forma idempotente.

### `src/juego/habilidades/DepuradorMagiaHabilidades.js`

Mantiene `darkMoonDebug.magia` como fachada única y añade validaciones, instantáneas, tiradas deterministas y resumen de Potencia de Habilidad.

### `src/juego/magia/SistemaCatalizadores.js`

Conserva los ataques básicos de varitas y bastones, pero separa la regla general de Potencia de Habilidad: todos los objetos equipados aportan sin penalización de mano.

## Validación realizada en el entorno de entrega

- JSON válido.
- Ocho módulos JavaScript aceptados por un parser ECMAScript en modo módulo.
- Treinta y siete comprobaciones estáticas de contratos y flujo aprobadas.
- Una sola llamada en `confirmar()` a ID, Maná, daño, efectos, tiempo y experiencia.
- Sin `setInterval` en los archivos entregados.
- Sin procesador fallback de efectos.
- Sin `.mjs` ni `.patch`.
- Sin modificaciones de prototipos.
- Sin nombres numéricos de etapa en `src/` de la entrega.
- Aguijón tóxico conserva exactamente sus valores anteriores.

No fue posible ejecutar una partida completa dentro de este entorno. Las pruebas de jugabilidad, cambio de mapa, recarga y consola quedan documentadas para ejecutarse en el navegador.

## Riesgos pendientes

- Confirmar visualmente que los factores mayores que 1 ralentizan efectivamente movimiento y tiempo en todos los enemigos.
- Confirmar que todas las variantes de equipamiento del juego exponen sus objetos mediante las rutas contempladas.
- Ejecutar la búsqueda de nombres de etapa sobre el repositorio completo después del reemplazo.
- Verificar en una partida real la firma concreta de los métodos de daño, tiempo y persistencia del estado local.

## Restricciones

- No se creó ningún `.patch`.
- No se creó ningún `.mjs`.
- No se utilizó Node.js ni `node:test`.
- No se instalaron dependencias.
- No se crearon migradores.
- No se crearon motores por elemento.
- No se creó ningún componente de producción con nombre de etapa.
- No se realizó commit.
- No se realizó push.

## Conventional Commit propuesto

```text
feat(habilidades): completar habilidades mágicas básicas

- incorporar ejecución completa de Ascua, Esquirla de hielo y Chispa
- normalizar Aguijón tóxico sobre el sistema temporal común
- resolver impacto, crítico, daño elemental y resistencias una sola vez
- acumular Potencia de Habilidad desde todo el equipamiento sin fórmula dual
- reforzar depuración, destrucción por mapa y validaciones de consola
```
