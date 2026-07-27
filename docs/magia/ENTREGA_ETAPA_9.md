# ENTREGA ETAPA 9 — Enemigos y afijos elementales

## 1. Estado de la entrega

Implementación preparada sobre el commit base confirmado:

```text
66533cddc81386fad9eeb0fbd074d765035051cc
```

Rama de referencia: `main`.

No se realizó commit ni push.

El entorno de trabajo no pudo descargar la copia Git completa ni consultar la
copia local del usuario. Por ese motivo:

- el commit base se utilizó como referencia inmutable;
- el HEAD actual de la copia local del usuario no pudo certificarse;
- el `git status` de la copia local del usuario no pudo certificarse;
- los archivos se entregan como reemplazos completos con sus rutas relativas.

La validación de contratos ejecutada en Chromium fue satisfactoria. La
validación visual y funcional completa dentro del juego queda **pendiente**.
ETAPA 9 no debe considerarse completamente cerrada hasta ejecutar la matriz
manual incluida en este documento.

## 2. Objetivo implementado

Dar utilidad jugable a la infraestructura elemental existente sin introducir
motores ni fuentes de verdad paralelas:

- conservar las resistencias en los JSON canónicos de cada enemigo;
- agregar daño elemental a ataques naturales que realmente se ejecutan;
- activar los prefijos elementales dentro de `Prefijos.json`;
- activar los sufijos de resistencia dentro de `Sufijos.json`;
- resolver daño físico y elemental dentro del mismo ataque;
- mostrar rangos elementales y resistencias mediante el presentador existente;
- mantener la rareza Rara deshabilitada;
- proteger el flujo de habilidades corregido en ETAPA 8A.

## 3. Decisión arquitectónica final

No se crean:

```text
src/config/entidades/ConfiguracionElemental.json
src/config/objetos/afijos/ConfiguracionElemental.json
src/juego/combate/ComponentesElementalesAtaque.js
```

Tampoco se modifica `CargadorConfiguracion.js` para mezclar configuraciones.

Las fuentes de verdad quedan así:

```text
Enemigos.json
└── estadísticas y ataque natural de enemigos normales

EnemigosEspeciales.json
└── estadísticas y ataque natural de enemigos especiales

Prefijos.json
└── afijos ofensivos elementales de armas

Sufijos.json
└── afijos defensivos de resistencia elemental

ComponentesDanio.js
└── tipos, rangos locales, mitigación y resolución elemental canónica
```

## 4. Archivos incluidos

### Configuración canónica modificada

```text
src/config/entidades/Enemigos.json
src/config/entidades/EnemigosEspeciales.json
src/config/objetos/afijos/Prefijos.json
src/config/objetos/afijos/Sufijos.json
```

### Código de producción modificado

```text
src/juego/combate/ComponentesDanio.js
src/entidad/destructible/combatiente/Combatiente.js
src/entidad/destructible/combatiente/EstadisticasDerivadas.js
src/juego/objetos/ValidadorConfiguracionGeneracionObjetos.js
src/interfaz/objetos/PresentadorObjeto.js
```

### Documentación nueva

```text
docs/magia/ENTREGA_ETAPA_9.md
docs/magia/PROMPT_ETAPA_10.md
```

No hay archivos de producción nuevos.

## 5. Resumen por archivo

### `Enemigos.json`

- Mantiene todas las resistencias en `baseNivel1.estadisticasBase.resistencias`.
- Corrige resistencias negativas de esqueletos a `0`, porque el contrato vigente
  admite solamente valores entre `0` y `75`.
- La Cucaracha conserva su ataque natural y agrega `1–2` de daño de veneno.
- No agrega perfiles externos ni campos que el enemigo armado no vaya a usar.

### `EnemigosEspeciales.json`

- Mantiene resistencias dentro de cada plantilla especial.
- El Zombi agrega `1` de daño de frío y `1–3` de veneno a su ataque natural.
- Caballero Óseo, Comandante y Señor de la Guerra conservan resistencias
  diferenciadas, pero no reciben daño elemental oculto en ataques naturales que
  normalmente son reemplazados por sus armas equipadas.

### `Prefijos.json`

Activa dentro de sus entradas originales:

```text
Ardiente
Glacial
Electrificado
Venenoso
```

Cada familia:

- tiene estado `activo`;
- tiene peso base positivo;
- se restringe a objetos de tipo `arma`;
- mantiene tres grados;
- agrega solamente daño elemental local al ataque básico del arma portadora;
- no ejecuta habilidades;
- no utiliza Potencia de Habilidad.

### `Sufijos.json`

Activa dentro de sus entradas originales:

```text
De ascuas
De escarcha
De tormenta
Del antídoto
```

Cada familia:

- tiene estado `activo`;
- tiene peso base positivo;
- se restringe a `armadura` y `quiver`;
- mantiene tres grados;
- suma su resistencia como estadística general del personaje;
- queda limitada por el contrato general `0–75 %`.

La presencia de `raro` en `rarezasPermitidas` no activa esa rareza. El catálogo
`Rarezas.json` continúa determinando que la rareza Rara no puede generarse.

### `ComponentesDanio.js`

Agrega el contrato canónico para los ocho campos locales:

```text
danioFuegoLocalMinimo / danioFuegoLocalMaximo
danioFrioLocalMinimo / danioFrioLocalMaximo
danioRayoLocalMinimo / danioRayoLocalMaximo
danioVenenoLocalMinimo / danioVenenoLocalMaximo
```

Expone funciones para:

- validar y copiar esos rangos;
- crear los descriptores elementales de una fuente;
- omitir elementos cuyo rango sea `0–0`;
- rechazar mínimos negativos o máximos inferiores al mínimo.

El resolvedor ya existente continúa aplicando:

- Armadura al daño físico;
- resistencia específica al daño elemental;
- el límite general de resistencias;
- un único paquete final por ataque.

### `Combatiente.js`

Amplía la normalización del ataque natural para conservar los ocho campos
locales. Antes, cualquier campo elemental escrito en el JSON se perdía al crear
el combatiente.

No incorpora comportamiento exclusivo de enemigos: el contrato pertenece a
cualquier ataque natural válido.

### `EstadisticasDerivadas.js`

Cada fuente de ataque puede producir:

```text
componente principal
+ cero o más componentes elementales locales
```

La fuente conserva una única precisión y una única probabilidad de crítico.
Los componentes elementales locales:

- no reciben daño físico plano global;
- no reciben multiplicadores físicos globales;
- no reciben Potencia de Habilidad;
- comparten el multiplicador de golpe de su fuente;
- son mitigados por su resistencia correspondiente.

### `ValidadorConfiguracionGeneracionObjetos.js`

Reconoce los ocho campos elementales locales como propiedades activas. Esto
permite que las familias activadas superen la validación normal sin excepciones
especiales ni cargadores paralelos.

También se evita introducir referencias numéricas de etapa en producción.

### `PresentadorObjeto.js`

Reutiliza el contrato de `ComponentesDanio.js` para mostrar cada rango como una
sola fila legible:

```text
Daño de fuego local: 1 – 2 (ataque básico)
```

Los afijos describen explícitamente que el daño se aplica al ataque básico.
Las resistencias se muestran con el contrato existente de estadísticas.

No se agregan clases CSS, modales ni paneles nuevos.

## 6. Arquitectura anterior y final

### Antes

```text
Fuente de ataque
→ descriptor principal físico o ataque básico de varita
→ impacto y crítico
→ paquete de daño
→ mitigación
→ Vida y mensaje
```

Los campos elementales locales de afijos estaban documentados pero inactivos.
Los ataques naturales descartaban esos campos durante la normalización.

### Después

```text
Fuente de ataque
→ descriptor principal
→ componentes elementales locales de la misma fuente
→ una resolución de impacto
→ una resolución de crítico por fuente
→ un paquete mixto
→ Armadura para físico y resistencia para cada elemento
→ una aplicación de daño
→ una actualización de Vida y un resultado
```

## 7. Contenido jugable configurado

### Fuentes enemigas naturales

| Enemigo | Daño elemental adicional |
|---|---:|
| Cucaracha | Veneno `1–2` |
| Zombi | Frío `1–1` y veneno `1–3` |

No se agregan componentes ocultos a enemigos armados, porque el flujo normal
prioriza sus armas equipadas sobre el ataque natural.

### Resistencias destacadas

| Enemigo | Resistencias relevantes |
|---|---|
| Cucaracha | Veneno `35 %` |
| Esqueletos | Frío `20 %`, veneno `75 %` |
| Zombi | Frío `15 %`, veneno `50 %` |
| Caballero Óseo | Frío `30 %`, veneno `75 %` |
| Comandante | Rayo `25 %` |
| Señor de la Guerra | Fuego `35 %`, frío `10 %`, rayo `5 %`, veneno `15 %` |

## 8. Instalación

Antes de copiar:

```bash
pwd
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short
git log -8 --oneline --decorate
git merge-base --is-ancestor \
  66533cddc81386fad9eeb0fbd074d765035051cc \
  HEAD \
  && echo "El commit base está contenido en HEAD"
```

Procedimiento:

1. Confirmar que la rama sea `main`.
2. Confirmar que el commit base esté contenido en el HEAD actual.
3. Revisar y preservar cualquier cambio local existente.
4. Copiar todos los archivos del ZIP manteniendo exactamente su ruta relativa.
5. Reemplazar completos los nueve archivos de producción.
6. Agregar los dos documentos de `docs/magia`.
7. No copiar ningún archivo de la propuesta paralela anterior.
8. Abrir el juego desde el mismo método que se utiliza normalmente en el
   proyecto, sin instalar dependencias.
9. Ejecutar la matriz manual y los comandos de consola.
10. Crear el commit solamente después de completar la validación visual.

No usar `git reset`, `git clean`, `git checkout` ni `git restore` masivo cuando
existan cambios recuperables.

## 9. Validaciones técnicas realizadas

### Validación estática

Resultado: **aprobado**.

- Los cuatro JSON son válidos.
- No hay archivos `.mjs`.
- No hay archivos `.patch`.
- No hay referencias a configuraciones elementales paralelas.
- No hay nombres numéricos de etapa en producción.
- Los ocho campos locales son reconocidos por el validador.
- Todas las resistencias configuradas están entre `0` y `75`.
- La rareza Rara no se modifica.

### Validación de contratos en Chromium

Resultado: **aprobado**.

Se ejecutaron los módulos reales modificados en el motor JavaScript de Chromium,
con dependencias mínimas sustituidas únicamente dentro de una página de prueba
en memoria. Se comprobó:

- creación de componentes locales por tipo;
- normalización de rangos ausentes;
- rechazo de rangos invertidos;
- mitigación física y elemental diferenciada;
- combinación física + elemental una sola vez por fuente;
- cálculo del rango resumen;
- conservación de daño elemental en ataques naturales;
- validación de los cuatro prefijos activos;
- validación de los cuatro sufijos activos;
- Cucaracha y Zombi como fuentes elementales reales;
- ausencia de daño natural oculto en enemigos armados;
- presentación de rangos elementales y texto de ataque básico.

Esta prueba no utilizó Node.js, `node:test`, `.mjs` ni dependencias del proyecto.

## 10. Validación visual pendiente

No fue posible ejecutar la página completa del juego dentro de este entorno.
Por tanto, quedan pendientes y no se presentan como comprobados:

- controles reales del jugador;
- selector sobre Canvas;
- confirmación de objetivos;
- posición y estilos reales del selector;
- actualización visual de la Vida enemiga;
- actualización visual del Maná;
- registro visible y mensajes;
- detalle real de objetos en inventario y equipamiento;
- barra de diez ranuras;
- botón `Habilidades` a la derecha de la barra;
- panel de habilidades y maestrías;
- persistencia durante la partida;
- transición entre mapas;
- destrucción de integraciones y listeners;
- ausencia de duplicaciones durante una sesión completa.

## 11. Matriz manual obligatoria

### A. Carga y regresión visual

1. Iniciar una partida nueva.
2. Confirmar que no haya errores en la consola.
3. Confirmar que Canvas y mapa se muestren normalmente.
4. Confirmar Vida y Maná visibles.
5. Confirmar diez ranuras de habilidades.
6. Confirmar el botón `Habilidades` a la derecha de las ranuras.
7. Abrir y cerrar el panel.
8. Moverse, atacar y recoger objetos para verificar que los controles normales
   continúan funcionando.

### B. Objetos y afijos

1. Obtener o generar varias armas mágicas.
2. Encontrar al menos un prefijo de cada elemento.
3. Abrir el detalle del objeto.
4. Confirmar una sola fila de rango elemental por elemento.
5. Confirmar que el texto indique `ataque básico`.
6. Equipar el arma y atacar.
7. Confirmar un único gasto temporal.
8. Confirmar una única tirada de impacto y crítico.
9. Confirmar una única reducción de Vida.
10. Confirmar un mensaje con desglose físico y elemental.
11. Confirmar que el afijo no lance una habilidad.

### C. Resistencias de equipo

1. Obtener piezas con los cuatro sufijos defensivos.
2. Equipar una pieza y registrar la resistencia.
3. Equipar una segunda pieza compatible.
4. Confirmar que se acumulan una sola vez.
5. Confirmar que ninguna resistencia supera `75 %`.
6. Desequipar una pieza y comprobar una única actualización.
7. Comparar paquetes deterministas antes y después.

### D. Enemigos

1. Recibir un ataque de Cucaracha.
2. Confirmar físico + veneno en una sola acción.
3. Recibir un ataque de Zombi.
4. Confirmar físico + frío + veneno en una sola acción.
5. Confirmar una sola actualización de Vida y barra.
6. Confirmar un único mensaje.
7. Atacar esqueletos, Comandante y Señor de la Guerra con distintos elementos y
   comparar sus resistencias.

### E. Habilidades básicas

Para Ascua, Esquirla de hielo, Chispa y Aguijón tóxico:

1. aprender la habilidad;
2. asignarla a una ranura;
3. seleccionarla con el control real;
4. mover el selector Canvas;
5. confirmar el objetivo;
6. comprobar un único gasto de Maná;
7. comprobar un único avance temporal;
8. comprobar una única reducción de Vida;
9. comprobar experiencia y efectos una sola vez;
10. comprobar un solo mensaje;
11. comprobar actualización de Canvas, Vida, Maná y panel.

### F. Cambio de mapa y destrucción

1. Registrar `darkMoonDebug.magia.arquitectura.obtenerResumen()`.
2. Cambiar de mapa.
3. Repetir el resumen.
4. Confirmar una sola integración, barra, entrada, panel y sistema.
5. Ejecutar una habilidad y un ataque elemental.
6. Regresar a ciudad y repetir.
7. Confirmar que no aumenten listeners, mensajes ni ejecuciones.

## 12. Comandos de consola

### Contratos actuales de magia e interfaz

```javascript
darkMoonDebug.magia.validarTodo()
darkMoonDebug.magia.arquitectura.obtenerResumen()
darkMoonDebug.magia.interfaz.validarContratos()
darkMoonDebug.magia.barra.validarPersistencia()
darkMoonDebug.magia.catalizadores.validarContratos()
darkMoonDebug.magia.habilidades.validarContratos()
```

### Comparación de arquitectura antes y después del mapa

```javascript
console.table([
  darkMoonDebug.magia.arquitectura.obtenerResumen()
]);
```

### Paquete físico y elemental determinista

```javascript
const danio = await import(
  "./src/juego/combate/ComponentesDanio.js"
);

const comparacion = {
  sinResistencia: danio.resolverPaqueteDanio({
    componentes: [
      { tipo: "fisico", danioBruto: 10 },
      { tipo: "fuego", danioBruto: 10 }
    ],
    armadura: 10,
    resistencias: {
      fuego: 0,
      frio: 0,
      rayo: 0,
      veneno: 0
    }
  }),
  conResistencia: danio.resolverPaqueteDanio({
    componentes: [
      { tipo: "fisico", danioBruto: 10 },
      { tipo: "fuego", danioBruto: 10 }
    ],
    armadura: 10,
    resistencias: {
      fuego: 50,
      frio: 0,
      rayo: 0,
      veneno: 0
    }
  })
};

console.table([
  {
    caso: "Sin resistencia",
    fisico: comparacion.sinResistencia.desgloseDanio.fisico.danioFinal,
    fuego: comparacion.sinResistencia.desgloseDanio.fuego.danioFinal,
    total: comparacion.sinResistencia.danioFinal
  },
  {
    caso: "50 % fuego",
    fisico: comparacion.conResistencia.desgloseDanio.fisico.danioFinal,
    fuego: comparacion.conResistencia.desgloseDanio.fuego.danioFinal,
    total: comparacion.conResistencia.danioFinal
  }
]);
```

Resultado esperado: la resistencia reduce solamente fuego; la Armadura afecta
solamente físico.

### Inspección determinista de los catálogos

```javascript
const rutas = {
  enemigos: "./src/config/entidades/Enemigos.json",
  especiales: "./src/config/entidades/EnemigosEspeciales.json",
  prefijos: "./src/config/objetos/afijos/Prefijos.json",
  sufijos: "./src/config/objetos/afijos/Sufijos.json"
};

const entradas = Object.fromEntries(
  await Promise.all(
    Object.entries(rutas).map(async ([clave, ruta]) => [
      clave,
      await fetch(ruta).then((respuesta) => respuesta.json())
    ])
  )
);

console.table(
  ["ardiente", "glacial", "electrificado", "venenoso"].map((id) => ({
    id,
    estado: entradas.prefijos[id].estado,
    peso: entradas.prefijos[id].pesoBase,
    grados: entradas.prefijos[id].grados.length,
    tipos: entradas.prefijos[id].aplicaA.tipos.join(", ")
  }))
);

console.table(
  ["de_ascuas", "de_escarcha", "de_tormenta", "del_antidoto"].map((id) => ({
    id,
    estado: entradas.sufijos[id].estado,
    peso: entradas.sufijos[id].pesoBase,
    grados: entradas.sufijos[id].grados.length,
    tipos: entradas.sufijos[id].aplicaA.tipos.join(", ")
  }))
);
```

### Verificación del Canvas y la barra

```javascript
const canvas = document.querySelector("canvas");
const barra = document.querySelector(
  "#barra-habilidades, .barra-habilidades, [data-barra-habilidades]"
);
const ranuras = barra
  ? barra.querySelectorAll(".ranura-habilidad, [data-ranura-habilidad]")
  : [];
const boton = document.querySelector(
  ".boton-habilidades-maestrias, [data-accion-habilidades]"
);

const cajaBarra = barra?.getBoundingClientRect() ?? null;
const cajaBoton = boton?.getBoundingClientRect() ?? null;

console.table([{
  canvasExiste: canvas instanceof HTMLCanvasElement,
  canvasVisible:
    canvas instanceof HTMLCanvasElement &&
    getComputedStyle(canvas).display !== "none",
  ranuras: ranuras.length,
  botonExiste: Boolean(boton),
  botonALaDerecha:
    Boolean(cajaBarra && cajaBoton) &&
    cajaBoton.left >= cajaBarra.left
}]);
```

El conteo esperado es `10`. La posición final debe comprobarse visualmente, ya
que el contenedor de la barra también incluye el propio botón.

### Potencia de Habilidad general

```javascript
darkMoonDebug.magia.catalizadores.calcularPotenciaDeObjetos([
  {
    nombre: "Objeto A",
    propiedades: { potenciaHabilidad: 12 }
  },
  {
    nombre: "Objeto B",
    propiedades: { potenciaHabilidad: 8 }
  }
]);
```

Resultado esperado: `20 %`, multiplicador `1.2` y una sola ejecución de
habilidad. Los afijos elementales de arma no deben cambiar este resultado.

## 13. Criterios de aceptación

| Criterio | Estado de esta entrega |
|---|---|
| JSON canónicos, sin configuraciones paralelas | Comprobado |
| Daño local de cuatro elementos soportado | Comprobado en Chromium |
| Cuatro prefijos ofensivos activos | Comprobado |
| Cuatro sufijos defensivos activos | Comprobado |
| Rareza Rara deshabilitada | Comprobado por ausencia de cambios |
| Resistencias enemigas `0–75 %` | Comprobado |
| Cucaracha y Zombi como fuentes elementales | Comprobado en contratos |
| Un paquete físico + elemental | Comprobado en Chromium |
| Armadura y resistencia diferenciadas | Comprobado en Chromium |
| Presentación del rango elemental | Comprobado en Chromium |
| Sin `.mjs`, `.patch`, Node ni dependencias | Comprobado |
| Sin nombres numéricos de etapa en producción | Comprobado |
| Selector, Canvas y controles reales | Pendiente dentro del juego |
| Vida y Maná visuales | Pendiente dentro del juego |
| Mensajes, barra y paneles | Pendiente dentro del juego |
| Persistencia y cambio de mapa | Pendiente dentro del juego |
| Ausencia runtime de duplicaciones | Pendiente dentro del juego |

## 14. Riesgos pendientes

1. La página completa no pudo ejecutarse en este entorno.
2. El balance de pesos y grados debe observarse con botín real de niveles 1–10.
3. Los enemigos armados todavía no causan fuego o rayo de forma inherente; no se
   agregó daño oculto para evitar romper la prioridad de armas.
4. Debe comprobarse que las rutas y mayúsculas funcionen en el servidor local
   utilizado por el proyecto.
5. Debe comprobarse que objetos antiguos sin campos elementales continúen
   cargando con rangos `0–0`.
6. Debe medirse que el panel no realice redibujados redundantes durante una
   ejecución de habilidad.

## 15. Fuera de alcance

- Habilidades intermedias o avanzadas.
- Nuevas maestrías.
- Penetración elemental.
- Resistencias negativas.
- Estados alterados aplicados por afijos.
- Daño elemental porcentual global.
- Potencia de Habilidad aplicada a ataques básicos.
- Activación de la rareza Rara.
- Nuevos paneles, modales, CSS o animaciones.
- Migración durable de partidas inexistentes.
- Commit, push o avance automático a ETAPA 10.

## 16. Ausencia de nombres de etapa en producción

Ejecutar después de copiar:

```bash
rg -n -i \
  --glob '!docs/**' \
  --glob '!*.md' \
  '(etapa|stage)[ _-]*[0-9]+' \
  .
```

Resultado esperado: vacío.

## 17. Restricciones respetadas

- No se creó `.patch`.
- No se creó `.mjs`.
- No se utilizó Node.js ni `node:test`.
- No se instalaron dependencias.
- No se instalaron librerías, runtimes ni frameworks.
- Los archivos se entregan completos.
- No se realizó commit ni push.
- No se avanzó a ETAPA 10.
- No se introdujeron nombres numéricos de etapa en producción.

## 18. Conventional Commit propuesto

Usar solamente después de completar la validación manual:

```text
feat(combate): incorporar enemigos y afijos elementales

- habilita daño elemental local en ataques básicos de armas
- agrega fuentes de frío y veneno a ataques naturales enemigos
- configura resistencias elementales en enemigos normales y especiales
- activa prefijos ofensivos y sufijos defensivos elementales
- integra componentes mixtos en la resolución canónica de combate
- muestra rangos elementales y resistencias en el detalle de objetos
- mantiene deshabilitada la rareza rara
```
