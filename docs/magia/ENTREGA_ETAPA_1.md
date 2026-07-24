# Dark Moon — Entrega ETAPA 1

## Estado

Implementación preparada sobre la estructura revisada de `main` para la **ETAPA 1 — Modelo de daño elemental y resistencias**.

El paquete conserva los archivos completos con sus rutas relativas, listo para superponerse sobre la raíz del repositorio.

No se creó ningún archivo `.mjs`, no se utilizó `node:test` y no se agregó ninguna dependencia externa.

## Archivos de código afectados

### Nuevo

- `src/juego/combate/ComponentesDanio.js`

### Modificados

- `src/config/ConfiguracionCombate.js`
- `src/juego/combate/SistemaCombate.js`
- `src/entidad/destructible/combatiente/EstadisticasDerivadas.js`
- `src/entidad/destructible/combatiente/Combatiente.js`
- `src/objetos/Objeto.js`

## Implementación

- Contrato único para daño `fisico`, `fuego`, `frio`, `rayo` y `veneno`.
- Resolución determinista de componentes y paquetes de daño.
- Armadura aplicada exclusivamente al componente físico.
- Bloqueo aplicado exclusivamente al componente físico.
- Resistencias elementales independientes para fuego, frío, rayo y veneno.
- Resistencias normalizadas entre `0` y `75`.
- Redondeo realizado una sola vez al final de cada componente.
- Compatibilidad hacia atrás: cada fuente física existente genera un componente tipado `fisico` sin eliminar `danioFisico` ni la estructura por manos.
- Resultado anterior conservado y ampliado con:
  - `danioCalculado`;
  - `desgloseDanio`;
  - `componentesDanio`.
- Registro de combate con desglose solamente cuando hay daño mixto o elemental.
- Normalización de resistencias presentes en estadísticas base, estadísticas derivadas, propiedades de objetos y valores almacenados en afijos, sin activar pools ni afijos elementales.

## Pruebas realizadas

- **69/69 comprobaciones deterministas correctas** en Chromium.
- **1.000 escenarios de regresión física con semilla** coincidentes con la fórmula anterior:
  - ataque sin bloqueo;
  - ataque con Armadura;
  - ataque con bloqueo;
  - doble arma.
- Daño elemental con resistencias `0`, `25`, `75` y valores superiores al límite.
- Daño físico puro y paquete mixto.
- Bloqueo físico sin reducción elemental.
- Crítico compartido por los componentes de una misma fuente.
- Muerte por daño elemental y sobre-daño.
- Conservación de campos públicos anteriores.
- Ausencia de `NaN`, infinitos y resultados negativos.
- Importación y normalización aislada de `Combatiente`, `EstadisticasDerivadas` y `Objeto`.

Las pruebas se ejecutaron como módulos ES temporales dentro de Chromium. Las dependencias ajenas a los archivos modificados se sustituyeron temporalmente para aislar la etapa; esos sustitutos no forman parte de la entrega.

La prueba de humo completa dentro del juego queda documentada en `VALIDACION_CONSOLA_ETAPA_1.md`, porque este entorno no pudo obtener y ejecutar un checkout íntegro del repositorio.

## Criterios de aceptación

- [x] Los cinco tipos de daño están reconocidos por el contrato.
- [x] Un ataque físico antiguo mantiene su fórmula y orden de tiradas.
- [x] Un paquete mixto separa y mitiga cada tipo correctamente.
- [x] Resistencia `0` no modifica el daño.
- [x] Resistencia `25` reduce un cuarto.
- [x] Resistencia `75` reduce tres cuartos.
- [x] Valores superiores se limitan a `75`.
- [x] Valores inferiores se limitan a `0`.
- [x] El bloqueo no reduce componentes elementales.
- [x] La Armadura no reduce componentes elementales.
- [x] Los resultados exponen total y desglose de forma aditiva.
- [x] No se activaron habilidades, efectos, afijos ni contenido de etapas posteriores.
- [x] Prueba manual completa dentro de la partida sobre el checkout local del usuario.

## Riesgos pendientes

- La regresión completa de UI, IA, arco, inventario, equipamiento, comercio, curación, mapas y persistencia debe confirmarse en una partida real sobre la copia local completa.
- Hasta etapas posteriores no existe una fuente jugable normal de daño elemental; el motor se valida mediante consola y fuentes técnicas controladas.
- El desglose distingue `danioCalculado` del daño realmente retirado cuando existe sobre-daño. Los consumidores antiguos continúan utilizando `danio`.
- La implementación no activa sufijos ni prefijos elementales; su activación sigue reservada para la ETAPA 9.

## Fuera de alcance respetado

No se incorporaron habilidades, efectos temporales, maestrías, cambios mágicos de atributos o Maná, catalizadores, varitas, doble varita, enemigos elementales, afijos activos, penetración, conversión, resistencias negativas, daño verdadero ni rareza Rara.

## Conventional Commit

```text
feat(combate): incorporar daño elemental y resistencias
```
