# ENTREGA ETAPA 10A — Zonas temporales persistentes

## 1. Estado de la entrega

- Repositorio: `https://github.com/Lordtias/Dark-Moon.git`
- Rama de referencia: `main`
- Commit base confirmado: `1f64b092c5273567c8297437fa646eaa167252af`
- Commit realizado: no.
- Push realizado: no.
- Dependencias instaladas: ninguna.
- Archivos `.patch`: ninguno.
- Archivos `.mjs`: ninguno.
- Node.js y `node:test`: no utilizados.

La implementación fue realizada sobre una copia limpia del contenido del commit base. El HEAD no fue modificado porque esta entrega no crea commits.

## 2. Objetivo implementado

Se incorporó un sistema genérico de zonas temporales persistentes sobre el mapa activo.

La primera habilidad que utiliza el sistema es **Nube tóxica**. Ahora la habilidad:

1. puede colocarse sobre una zona válida aunque no haya enemigos presentes;
2. deja una zona visible durante una duración configurable;
3. intenta aplicar su contenido a los enemigos presentes al crearla;
4. intenta aplicar su contenido a los enemigos que entren posteriormente;
5. vuelve a aplicar o renovar el efecto por intervalos mientras permanezcan dentro;
6. desaparece al vencer su duración;
7. utiliza los motores canónicos de impacto, efectos, tiempo, derrotas, experiencia y botín.

No se agregó **Muro de fuego** ni ninguna otra habilidad nueva.

La geometría quedó preparada para futuras formas de tipo línea o muro mediante una forma genérica `linea`, pero esas zonas no bloquean el movimiento.

## 3. Arquitectura anterior

Antes de esta entrega:

```text
Habilidades.json
  └─ formaImpacto
      ├─ individual
      ├─ radio
      └─ cadena

SistemaHabilidadesJugador
  └─ aplica daño o efectos una sola vez al confirmar

CoordinadorTiempoPartida
  ├─ actores
  ├─ regeneración
  └─ efectos temporales ligados a entidades
```

Nube tóxica afectaba únicamente a los enemigos presentes al momento del lanzamiento. No existía un estado espacial que permaneciera en el mapa.

## 4. Arquitectura final

```text
Habilidades.json
  ├─ formaImpacto
  │   ├─ individual
  │   ├─ radio
  │   ├─ cadena
  │   └─ linea
  └─ zonaTemporal
      ├─ duración
      ├─ intervalo
      ├─ activadores
      ├─ objetivos
      ├─ superposición
      ├─ apariencia
      └─ reglas de impacto

SistemaHabilidadesJugador
  ├─ ejecución instantánea tradicional
  └─ creación configurable de zona

CoordinadorTiempoPartida
  ├─ SistemaTiempo
  ├─ SistemaEfectosTemporales
  └─ SistemaZonasTemporales
      ├─ creación
      ├─ entrada
      ├─ intervalos
      ├─ superposición
      └─ vencimiento

AplicadorContenidoZonaTemporal
  ├─ MotorDanioHabilidad
  └─ MotorEfectosHabilidad

AdaptadorEscenaJuego
  └─ zonasTemporales
      └─ RenderizadorCanvas2D
```

Las zonas no conocen nombres de habilidades. Nube tóxica funciona mediante datos dentro de `Habilidades.json`.

## 5. Contrato genérico de zonas

Una zona temporal puede declarar:

```json
{
  "duracion": 300,
  "intervalo": 100,
  "activadores": [
    "al_crear",
    "al_entrar",
    "por_intervalo"
  ],
  "afecta": "hostiles",
  "politicaSuperposicion": "renovar_duracion",
  "grupoSuperposicion": "nube_toxica",
  "apariencia": "veneno",
  "resolverImpacto": true,
  "resolverCritico": false
}
```

### Activadores disponibles

- `al_crear`: afecta a los objetivos que ya ocupan la zona.
- `al_entrar`: afecta a un actor que pasa desde fuera hacia una casilla de la zona.
- `por_intervalo`: afecta nuevamente a los ocupantes en los instantes configurados.

### Objetivos disponibles

- `hostiles`
- `aliados`
- `todos`
- `fuente`

### Políticas de superposición

- `renovar_duracion`
- `reemplazar`
- `permitir_superposicion`

Para renovar una zona deben coincidir:

- la misma fuente;
- el mismo grupo de superposición;
- exactamente el mismo conjunto de casillas.

Las zonas parcialmente superpuestas pueden coexistir.

## 6. Geometría de línea preparada

Se agregó la forma genérica:

```json
{
  "tipo": "linea",
  "longitud": 3,
  "ancho": 1,
  "orientacion": "perpendicular"
}
```

Orientaciones disponibles:

- `hacia_objetivo`: avanza desde el lanzador hacia el punto seleccionado.
- `perpendicular`: centra una línea perpendicular a la dirección de lanzamiento.

La forma línea puede utilizarse en el futuro para:

- muros dañinos;
- barreras con efectos;
- ataques de lanza;
- ondas lineales;
- zonas de hielo o veneno.

No incluye bloqueo de movimiento, navegación dinámica ni cambios en la IA para evitar casillas peligrosas.

## 7. Nube tóxica por grado

### Grado 1

- Maná: 6.
- Tiempo base: 100.
- Alcance: 4.
- Radio: 1.
- Duración de zona: 300.
- Intervalo: 100.
- Veneno: valor base 2 durante 300.

### Grado 2

- Maná: 8.
- Tiempo base: 98.
- Alcance: 5.
- Radio: 1.
- Duración de zona: 400.
- Intervalo: 100.
- Veneno: valor base 3 durante 400.

### Grado 3

- Maná: 10.
- Tiempo base: 95.
- Alcance: 5.
- Radio: 2.
- Duración de zona: 500.
- Intervalo: 100.
- Veneno: valor base 4 durante 400.

La zona no causa daño directo. Aplica el efecto periódico configurado.

## 8. Orden temporal

Cuando coinciden eventos en el mismo instante, el coordinador mantiene este orden:

```text
1. Regeneración.
2. Ticks o vencimientos de efectos ligados a entidades.
3. Activaciones o vencimientos de zonas.
```

Una zona no se registra como actor falso. Su siguiente activación y su vencimiento participan en la agenda temporal mediante el coordinador canónico.

Una misma zona no activa dos veces al mismo objetivo en el mismo instante aunque coincidan `al_entrar` y `por_intervalo`.

## 9. Recompensas y derrotas

Las zonas no conceden directamente:

- experiencia general;
- botín;
- niveles;
- puntos de atributo;
- puntos universales.

Las muertes continúan pasando por `ResolutorDerrotasJugador`.

Flujo verificado:

```text
Nube tóxica crea el efecto
→ el efecto periódico produce daño
→ el enemigo muere
→ el resolutor canónico procesa la derrota
→ experiencia general y botín se entregan una sola vez
```

Volver a ejecutar el resolutor sobre la misma derrota devuelve cero enemigos procesados y no modifica nuevamente experiencia ni botín.

## 10. Archivos nuevos

### `src/juego/zonas/ContratosZonasTemporales.js`

Define y valida:

- activadores;
- objetivos;
- políticas de superposición;
- duración e intervalo;
- apariencia;
- reglas de impacto y crítico;
- casillas válidas de suelo.

### `src/juego/zonas/SistemaZonasTemporales.js`

Administra el ciclo de vida de las zonas:

- creación;
- renovación o reemplazo;
- activación sobre ocupantes;
- entrada de actores;
- intervalos;
- vencimiento;
- deduplicación por objetivo e instante;
- resumen visual plano;
- destrucción al cerrar el mapa.

### `src/juego/zonas/AplicadorContenidoZonaTemporal.js`

Adapta el contenido de una zona a los motores canónicos existentes. No reemplaza ni duplica el motor de daño o de efectos.

## 11. Archivos modificados

### `src/config/magia/Habilidades.json`

- incrementa la versión del catálogo a 5;
- convierte Nube tóxica en una zona persistente;
- incorpora configuración por grado dentro de la propia habilidad.

### `src/juego/habilidades/GeometriaHabilidades.js`

- agrega la forma `linea`;
- agrega orientaciones hacia el objetivo y perpendicular;
- expone el cálculo reutilizable de casillas;
- permite que una habilidad que crea zona sea válida sobre suelo sin enemigos.

### `src/juego/habilidades/ValidadorConfiguracionEjecucionHabilidades.js`

- valida y normaliza la forma línea;
- valida y normaliza `zonaTemporal` dentro de cada grado.

### `src/juego/habilidades/SistemaHabilidadesJugador.js`

- distingue una ejecución instantánea de una creación de zona;
- permite áreas vacías cuando existe `zonaTemporal`;
- descuenta Maná una sola vez;
- consume tiempo una sola vez;
- concede experiencia de maestría una sola vez;
- delega la persistencia al juego y al coordinador.

### `src/juego/tiempo/CoordinadorTiempoPartida.js`

- crea una única instancia de `SistemaZonasTemporales`;
- incorpora activaciones y vencimientos al avance temporal;
- filtra hostiles, aliados, todos o fuente;
- reaprovecha los sistemas canónicos de efectos y hostilidad;
- limpia actores derrotados por una zona o por sus efectos.

### `src/juego/movimiento/SistemaMovimientoJugador.js`

Notifica el movimiento real del jugador con posición anterior y nueva después de confirmar un desplazamiento válido.

### `src/juego/ia/SistemaAccionesEnemigos.js`

Notifica el movimiento real de cada enemigo después de que la búsqueda de caminos modifica su posición.

### `src/juego/Juego.js`

Expone las fachadas canónicas:

- `crearZonaTemporal()`;
- `obtenerZonasTemporales()`;
- `notificarMovimientoActor()`;
- `sistemaZonasTemporales`.

### `src/interfaz/graficos/AdaptadorEscenaJuego.js`

Incorpora un resumen plano de las zonas activas a la escena gráfica.

### `src/interfaz/graficos/RenderizadorCanvas2D.js`

Dibuja las zonas entre el terreno y las entidades, con estilos genéricos para:

- veneno;
- fuego;
- frío;
- electricidad;
- apariencia genérica.

No usa nombres de habilidades para decidir cómo dibujar.

### `src/juego/habilidades/DepuradorMagiaHabilidades.js`

Agrega herramientas para:

- consultar zonas activas;
- crear una línea persistente de prueba;
- notificar movimientos deterministas;
- validar contratos;
- incluir zonas dentro de `validarTodo()` y de la instantánea de ejecución.

## 12. Archivos eliminados

Ninguno.

## 13. Instalación y reemplazo

Antes de reemplazar, verificar desde la raíz del repositorio:

```bash
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short
```

El commit esperado como base es:

```text
1f64b092c5273567c8297437fa646eaa167252af
```

Descomprimir el paquete de archivos completos sobre la raíz del repositorio, conservando las rutas.

Después verificar:

```bash
git status --short
git diff --check
git diff --stat
```

No hay archivos que eliminar manualmente.

## 14. Pruebas manuales realizadas

Las pruebas se ejecutaron en Chromium cargando la aplicación real, sus módulos, su interfaz, teclado y Canvas.

### Contratos y carga

- carga completa sin errores de JavaScript;
- `darkMoonDebug.magia.validarTodo()` aprobado;
- contratos de zonas aprobados;
- veinte archivos JSON parseados correctamente.

### Nube tóxica grado 1

- lanzamiento desde la barra y el selector reales;
- área vacía aceptada;
- coste de Maná 6;
- coste temporal 100;
- experiencia de Veneno 6;
- zona de nueve casillas;
- zona visible;
- una segunda ejecución sobre las mismas casillas renueva la zona existente;
- no se crea una segunda zona duplicada;
- vencimiento y desaparición comprobados.

### Nube tóxica grado 2

- coste de Maná 8;
- coste temporal 98;
- experiencia de Veneno 8;
- área de nueve casillas;
- aplicación inicial a un objetivo;
- efecto periódico activo.

### Nube tóxica grado 3

- coste de Maná 10;
- coste temporal 95;
- radio 2;
- aplicación inicial a múltiples objetivos;
- diferencia visual comprobada mediante captura real de la página.

### Entrada y permanencia

- enemigo movido por la IA atraviesa una línea persistente;
- mensaje de entrada visible;
- efecto aplicado al enemigo;
- jugador movido mediante teclado entra en una zona creada por un enemigo;
- efecto aplicado al jugador;
- la activación por intervalo renueva el vencimiento del efecto;
- salir de la zona no activa nuevamente su contenido.

### Derrotas y recompensas

- muerte por daño periódico;
- experiencia general aumentada;
- botín garantizado generado;
- segundo intento de resolución devuelve `cantidadProcesada: 0`;
- experiencia y cantidad de botines sin cambios adicionales.

### Cambio de mapa

- una zona existente desaparece al regresar a la ciudad;
- el sistema anterior se destruye con el mapa;
- el nuevo mapa comienza sin zonas residuales.

### Geometría de línea

- longitud 3 perpendicular: tres casillas verticales centradas;
- longitud 3 hacia el objetivo: tres casillas desde el jugador hacia el punto;
- ninguna habilidad `muro_fuego` o `muro_de_fuego` agregada al catálogo.

### Regresiones

- Ascua continúa ejecutándose como habilidad instantánea;
- Cadena de rayos continúa impactando múltiples objetivos;
- no se crea una zona para esas habilidades.

Los resultados estructurados se entregan además en `ETAPA_10A_RESULTADOS_PRUEBAS.json`.

## 15. Comandos deterministas para la consola

Estos comandos son de prueba. Se recomienda recargar la partida después de usarlos.

### 15.1 Validación general

```javascript
const validacion10A = darkMoonDebug.magia.validarTodo();
console.table(
  Object.entries(validacion10A.resultados).map(([sistema, resultado]) => ({
    sistema,
    aprobado: resultado.aprobado,
  })),
);
validacion10A;
```

Resultado esperado:

```text
aprobado: true
```

### 15.2 Iniciar un mapa reproducible

```javascript
darkMoonAplicacion.controladorPartida.iniciarNuevaExpedicion({
  idMapaForzado: "alcantarilla",
  nivelMapaForzado: 1,
  semillaMapa: "zona-10a",
  ignorarNivelDesbloqueo: true,
});
```

### 15.3 Preparar Nube tóxica grado 1

```javascript
const magia = darkMoonDebug.magia;
magia.progreso.prepararHabilidadParaPrueba({
  idHabilidad: "nube_toxica",
  grado: 1,
});
magia.barra.asignar(1, "nube_toxica");
magia.habilidades.establecerManaActualParaPrueba(999);
magia.habilidades.configurarTiradasDeterministas({
  impacto: Array(100).fill(1),
  critico: Array(100).fill(100),
});
```

Después, desde la interfaz:

1. presionar `1`;
2. elegir una casilla válida;
3. confirmar con `F`.

### 15.4 Consultar zonas activas

```javascript
console.table(
  darkMoonDebug.magia.zonas.obtenerActivas().map((zona) => ({
    id: zona.id,
    nombre: zona.nombre,
    grado: zona.grado,
    casillas: zona.casillas.length,
    creadaEn: zona.creadaEn,
    venceEn: zona.venceEn,
    tiempoRestante: zona.tiempoRestante,
    proximaActivacion: zona.proximaActivacion,
  })),
);
```

### 15.5 Crear una línea perpendicular de prueba

En el mapa reproducible, las coordenadas siguientes son transitables:

```javascript
darkMoonDebug.magia.zonas.crearLineaParaPrueba({
  x: 13,
  y: 5,
  longitud: 3,
  ancho: 1,
  orientacion: "perpendicular",
  duracion: 300,
  intervalo: 100,
  apariencia: "veneno",
});
```

Casillas esperadas con el jugador en `(10, 5)`:

```text
(13, 4), (13, 5), (13, 6)
```

### 15.6 Crear una línea hacia el objetivo

```javascript
darkMoonDebug.magia.zonas.crearLineaParaPrueba({
  x: 13,
  y: 5,
  longitud: 3,
  ancho: 1,
  orientacion: "hacia_objetivo",
  duracion: 300,
  intervalo: 100,
  apariencia: "veneno",
});
```

Casillas esperadas con el jugador en `(10, 5)`:

```text
(11, 5), (12, 5), (13, 5)
```

### 15.7 Avanzar el reloj hasta el siguiente intervalo

```javascript
const juego = darkMoonAplicacion.controladorPartida.juego;
const siguiente = juego.obtenerZonasTemporales()[0]?.proximaActivacion;
const resultadoTemporal = Number.isFinite(siguiente)
  ? juego.coordinadorTiempo.procesarPulsosTemporalesHasta(siguiente)
  : null;
({
  siguiente,
  resultadoTemporal,
  zonas: juego.obtenerZonasTemporales(),
});
```

Para una comprobación completamente jugable, también puede avanzarse usando `Espacio` desde la interfaz.

### 15.8 Restaurar tiradas aleatorias

```javascript
darkMoonDebug.magia.habilidades.restaurarTiradasAleatorias();
```

## 16. Criterios comprobados

- configuración dentro de `Habilidades.json`;
- un único sistema de zonas por mapa;
- ninguna lógica de producción por nombre de Nube tóxica;
- forma de línea reutilizable;
- zona sobre área vacía;
- activación al crear;
- activación al entrar;
- activación por intervalo;
- duración configurable;
- superposición configurable;
- daño y efectos delegados a motores canónicos;
- movimiento de jugador e IA integrado;
- representación visual persistente;
- Maná, tiempo y experiencia de maestría una vez por lanzamiento;
- experiencia general y botín una vez por enemigo;
- limpieza al cambiar de mapa;
- regresión de habilidades existentes.

## 17. Riesgos y límites pendientes

1. Las zonas no se guardan en la persistencia durable. Pertenecen solamente al mapa activo.
2. Una zona no bloquea movimiento. Una barrera física necesitaría integrar navegación, colisiones e IA.
3. Los enemigos no intentan evitar zonas peligrosas. Las atraviesan según su búsqueda de camino actual.
4. El efecto aplicado puede continuar sobre el actor después de salir hasta que venza su propia duración. Salir únicamente impide nuevas renovaciones por permanencia.
5. Las zonas parcialmente superpuestas coexistirán. Solo una coincidencia exacta de fuente, grupo y casillas renueva la misma zona.
6. La apariencia Canvas es genérica y estática. No se agregaron sprites ni animaciones específicas.
7. La forma línea está validada mediante el depurador, pero todavía no existe una habilidad jugable que la utilice.
8. Los valores de duración, intervalo y potencia de Nube tóxica pueden requerir una etapa posterior de balance.

## 18. Ausencia de nombres temporales en producción

Se comprobó dentro de `src` la ausencia de:

```text
Etapa10A
ETAPA_10A
Etapa_10A
InstaladorEtapa
```

El nombre `ENTREGA_ETAPA_10A.md` existe solamente en documentación.

## 19. Confirmación de restricciones

- No se crearon archivos `.patch`.
- No se crearon archivos `.mjs`.
- No se utilizó Node.js.
- No se utilizó `node:test`.
- No se instalaron dependencias.
- No se instalaron librerías, runtimes ni frameworks.
- No se realizó commit.
- No se realizó push.
- No se avanzó a una etapa posterior.
- No se agregó Muro de fuego como habilidad.
- Se entregan archivos completos.

## 20. Conventional Commit propuesto

```text
feat(habilidades): incorporar zonas temporales persistentes

- convertir Nube tóxica en una zona persistente configurable
- permitir lanzar zonas sobre casillas válidas sin objetivos presentes
- agregar activaciones al crear, al entrar y por intervalo
- incorporar duración, superposición y vencimiento de zonas
- reutilizar los motores canónicos de impacto, daño y efectos
- integrar zonas con el coordinador temporal y el movimiento de actores
- mostrar zonas activas de forma persistente en Canvas
- agregar geometría de línea hacia el objetivo y perpendicular
- preparar lógica reutilizable para futuros muros sin agregar habilidades
- conservar experiencia general y botín únicos mediante el resolutor canónico
- unificar la autoselección de ataques básicos y habilidades
```

## 21. Ajuste posterior: autoselección unificada

Antes de cerrar la entrega se unificó la prioridad automática de objetivos entre el ataque básico y las habilidades.

La regla canónica es:

1. elegir únicamente enemigos vivos y válidos para el alcance o patrón actual;
2. elegir al enemigo más cercano;
3. si dos enemigos están a la misma distancia, elegir al que tenga menos Vida actual;
4. si distancia y Vida también empatan, conservar el primero según el orden estable de objetivos del mapa.

La regla reside en:

```text
src/juego/combate/SelectorObjetivoPrioritario.js
```

`SistemaCombateJugador` y `SistemaHabilidadesJugador` consumen esa misma función. Las habilidades conservan sus propias casillas seleccionables y su fallback de casilla cuando no existe ningún enemigo válido. Las habilidades de objetivo propio continúan centradas en el jugador.

Se validaron en navegador los siguientes casos deterministas:

- misma distancia y distinta Vida;
- distinta distancia y distinta Vida;
- destructible más cercano que debe ignorarse en la autoselección enemiga;
- empate completo conservando el orden estable;
- habilidad de objetivo propio sin modificaciones.
