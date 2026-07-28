# ENTREGA ETAPA 11 — Habilidades avanzadas y catálogo canónico de efectos

## 1. Estado de la entrega

- Repositorio: `https://github.com/Lordtias/Dark-Moon.git`
- Rama de referencia: `main`
- Commit base y HEAD verificado: `0b2f91967bac687fa640146352a415d9261094d7`
- Commit realizado: no.
- Push realizado: no.
- Dependencias instaladas: ninguna.
- Archivos `.patch`: ninguno.
- Archivos `.mjs`: ninguno.
- Node.js y `node:test`: no utilizados.

El ZIP de ETAPA 10A incluía el directorio `.git`, pero sus finales de línea hacían que Git mostrara cambios técnicos en todos los archivos. Para no confundirlos con esta implementación, se creó una copia de trabajo limpia directamente desde el commit confirmado. El HEAD permaneció sin cambios durante toda la entrega.

## 2. Objetivo implementado

Se incorporaron las cuatro habilidades avanzadas:

- **Incinerar**;
- **Prisión glacial**;
- **Descarga fulminante**;
- **Plaga corrosiva**.

Cada una:

- requiere nivel 6 de su maestría;
- tiene exactamente tres grados;
- consume Maná y tiempo mediante el sistema canónico;
- utiliza las geometrías, selectores, daño, resistencias elementales, crítico, Potencia de Habilidad, efectos temporales, experiencia de maestría y derrotas ya existentes;
- puede lanzarse sin equipar un arma específica;
- no posee un motor propio ni condiciones identificadas por el nombre de la habilidad.

Además, se centralizó la lógica reutilizable de efectos en un catálogo canónico y se incorporaron las cuatro resistencias aprobadas:

- Congelamiento;
- Aturdimiento;
- Envenenamiento;
- Quemadura.

## 3. Arquitectura anterior

Antes de esta entrega, cada habilidad declaraba dentro de `Habilidades.json` tanto los valores como las reglas completas de sus efectos:

```text
Habilidades.json
  └─ habilidad
      └─ efecto
          ├─ tipo
          ├─ acumulación
          ├─ duración
          ├─ intervalo
          ├─ daño
          └─ etiquetas

SistemaEfectosTemporales
  ├─ crea instancias
  ├─ renueva o acumula
  └─ procesa ticks y vencimientos
```

Esto permitía ejecutar efectos temporales, pero obligaba a repetir políticas y no ofrecía una definición común para:

- resistencia a la aplicación;
- inmunidad explícita;
- conservación de la potencia más alta;
- perfiles diferentes para un mismo efecto;
- resultados diferenciados entre aplicado, resistido, inmune o rechazado.

## 4. Arquitectura final

```text
Efectos.json
  └─ definición canónica
      ├─ nombre y tipo
      ├─ grupo de acumulación
      ├─ resistencia e inmunidad
      ├─ política de potencia
      └─ perfiles permitidos

Habilidades.json
  └─ referencia a efecto
      ├─ efectoId
      ├─ perfilAplicacion
      ├─ probabilidadBase
      ├─ duración
      ├─ intervalo
      ├─ daño o valor
      └─ límites por grado

CatalogoEfectos
  ├─ valida el catálogo
  └─ resuelve referencias configurables

MotorEfectosHabilidad
  └─ adapta la habilidad al contrato temporal común

SistemaEfectosTemporales
  ├─ comprueba inmunidad
  ├─ calcula resistencia
  ├─ realiza la tirada
  ├─ crea, rechaza, renueva o intensifica
  ├─ conserva una sola instancia y cadencia
  └─ retira efectos al adquirir inmunidad

MotorDanioHabilidad
  └─ daño directo y periódico canónico

ResolutorDerrotasJugador
  └─ experiencia general y botín una sola vez
```

Las habilidades, armas, ataques enemigos o fuentes futuras podrán referenciar los mismos efectos sin duplicar su lógica.

## 5. Catálogo canónico de efectos

Se agregó:

```text
src/config/magia/Efectos.json
```

El catálogo contiene los efectos existentes `ralentizacion` y `electrizacion`, además de los cuatro aprobados:

### Congelamiento

- Tipo temporal: inmovilización.
- Perfil: `ignorar_mientras_activo`.
- No acumula.
- No renueva la duración mientras continúa activo.
- Puede volver a aplicarse después de vencer.
- Usa Resistencia a Congelamiento.
- Puede tener inmunidad explícita.

### Aturdimiento

- Tipo temporal: aturdimiento.
- Perfil: `ignorar_mientras_activo`.
- No acumula.
- No renueva la duración mientras continúa activo.
- Puede volver a aplicarse después de vencer.
- Usa Resistencia a Aturdimiento.
- Puede tener inmunidad explícita.

### Envenenamiento

- Tipo temporal: daño periódico de Veneno.
- Perfil `refrescar_mayor_potencia`: renueva duración, no aumenta intensidad y conserva la aplicación más fuerte.
- Perfil `intensificar`: aumenta una intensidad por reaplicación hasta el máximo configurado y renueva duración.
- Conserva una sola instancia y una sola cadencia.
- Usa Resistencia a Envenenamiento.
- Puede tener inmunidad explícita.

### Quemadura

- Tipo temporal: daño periódico de Fuego.
- Perfil `refrescar_mayor_potencia`.
- No aumenta intensidad.
- Renueva duración únicamente si la reaplicación supera la tirada de resistencia.
- Conserva la potencia más alta.
- Mantiene una sola instancia y cadencia.
- Usa Resistencia a Quemadura.
- Puede tener inmunidad explícita.

## 6. Resistencias e inmunidades

### 6.1 Resistencias a efectos

La resistencia efectiva se limita entre 0 % y 75 %.

Para los cuatro efectos iniciales se usa:

```text
probabilidadFinal = probabilidadBase × (1 - resistencia / 100)
```

Ejemplo de Descarga fulminante grado 2:

```text
Probabilidad base de Aturdimiento: 30 %
Resistencia a Aturdimiento: 75 %
Probabilidad final: 30 × 0,25 = 7,5 %
```

La tirada usa valores enteros entre 1 y 100. Una tirada de 7 aplica; una tirada de 8 resiste.

Las resistencias elementales continúan actuando únicamente sobre el daño:

```text
Daño de Rayo bruto: 30
Resistencia a Rayo: 75 %
Daño final: 7
```

Por tanto, la Resistencia a Rayo y la Resistencia a Aturdimiento son defensas independientes.

El catálogo admite otros modos futuros:

- ninguna resistencia;
- reducir probabilidad de aplicación;
- reducir duración;
- reducir daño.

Solo `reducir_probabilidad_aplicacion` se utiliza para los cuatro estados iniciales.

### 6.2 Inmunidad explícita

La inmunidad no es una resistencia de 100 %. Se declara como una lista separada:

```json
{
  "inmunidadesEfectos": ["aturdimiento"]
}
```

Orden de resolución:

```text
1. Comprobar inmunidad.
2. Si es inmune, no consumir una tirada de efecto.
3. Si no es inmune, calcular la probabilidad final.
4. Realizar la tirada.
5. Aplicar la política del efecto si la tirada tiene éxito.
```

La inmunidad al efecto no cancela el daño directo de la habilidad.

El motor distingue:

- `aplicado`;
- `resistido`;
- `inmune`;
- `rechazado_por_politica`.

Si una entidad adquiere una inmunidad mientras el efecto está activo, la fuente que modificó sus inmunidades debe invocar el punto de integración canónico:

```javascript
juego.coordinadorTiempo.sincronizarInmunidadesEfectos(objetivo);
```

El efecto correspondiente se retira inmediatamente con motivo `inmunidad_adquirida` y no reaparece cuando la inmunidad desaparece.

## 7. Habilidades avanzadas

### 7.1 Incinerar

- Maestría: Fuego.
- Requisito: nivel 6.
- Selección: enemigo.
- Forma: línea hacia el objetivo, ancho 1.
- Atraviesa enemigos.
- Se detiene ante paredes o casillas no transitables.
- Daño directo de Fuego con crítico permitido.
- Aplica Quemadura al sobreviviente.

| Grado | Maná | Tiempo | Alcance/línea | Daño base | Quemadura |
|---:|---:|---:|---:|---:|---|
| 1 | 9 | 110 | 5 | 12 | 2 cada 100 durante 300 |
| 2 | 12 | 108 | 6 | 16 | 3 cada 100 durante 300 |
| 3 | 15 | 105 | 7 | 21 | 4 cada 100 durante 400 |

La Quemadura tiene probabilidad base 100 %, pero puede ser resistida. Una reaplicación aceptada renueva la duración y conserva la potencia más alta sin crear ticks paralelos.

### 7.2 Prisión glacial

- Maestría: Frío.
- Requisito: nivel 6.
- Selección: un enemigo.
- Daño directo de Frío.
- Aplica Congelamiento con probabilidad base 100 %.
- Congelamiento impide desplazarse, pero no convierte automáticamente todas las acciones en inválidas.
- Reaplicar mientras continúa activo no renueva la duración.

| Grado | Maná | Tiempo | Alcance | Daño base | Congelamiento |
|---:|---:|---:|---:|---:|---:|
| 1 | 8 | 115 | 5 | 9 | 80 |
| 2 | 10 | 112 | 6 | 12 | 90 |
| 3 | 13 | 110 | 6 | 16 | 100 |

### 7.3 Descarga fulminante

- Maestría: Rayo.
- Requisito: nivel 6.
- Selección: enemigo.
- Forma: línea hacia el objetivo, ancho 1.
- Atraviesa enemigos y se corta ante paredes.
- Cada enemigo resuelve impacto y Aturdimiento de forma independiente.
- El daño puede ser crítico.
- Fallar el Aturdimiento no cancela el daño.
- Reaplicar Aturdimiento mientras continúa activo no renueva su duración.

| Grado | Maná | Tiempo | Alcance/línea | Daño base | Aturdimiento |
|---:|---:|---:|---:|---:|---|
| 1 | 10 | 115 | 5 | 16 | 20 %, duración 70 |
| 2 | 13 | 112 | 6 | 21 | 30 %, duración 80 |
| 3 | 16 | 110 | 7 | 27 | 40 %, duración 90 |

### 7.4 Plaga corrosiva

- Maestría: Veneno.
- Requisito: nivel 6.
- Selección: un enemigo.
- Daño directo de Veneno.
- Aplica el efecto canónico Envenenamiento mediante el perfil `intensificar`.
- Comparte la misma instancia con Aguijón tóxico y Nube tóxica.
- Cada aplicación aceptada aumenta una intensidad hasta el máximo del grado.
- Al llegar al máximo, nuevas aplicaciones solo renuevan duración.
- La cadencia del próximo tick no se reinicia.

| Grado | Maná | Tiempo | Alcance | Daño directo | Periódico | Máximo |
|---:|---:|---:|---:|---:|---|---:|
| 1 | 9 | 105 | 5 | 7 | 2 cada 100 durante 300 | 2 |
| 2 | 12 | 102 | 6 | 9 | 3 cada 100 durante 400 | 3 |
| 3 | 15 | 100 | 6 | 12 | 4 cada 100 durante 400 | 3 |

Secuencia verificada:

```text
Aguijón tóxico       → intensidad 1
Primera Plaga G3     → intensidad 2
Segunda Plaga G3     → intensidad 3
Tercera Plaga G3     → intensidad 3 y renueva
Cuarta Plaga G3      → intensidad 3 y renueva
```

Durante toda la secuencia permanecen el mismo ID de instancia, un único efecto activo y una única agenda de ticks.

## 8. Resistencias visibles del personaje

Las tres profesiones comienzan con:

```json
{
  "resistenciasEfectos": {
    "congelamiento": 0,
    "aturdimiento": 0,
    "envenenamiento": 0,
    "quemadura": 0
  },
  "inmunidadesEfectos": []
}
```

El panel del personaje muestra siempre:

- Congelamiento;
- Aturdimiento;
- Envenenamiento;
- Quemadura.

Las estadísticas derivadas suman base y equipamiento. No dependen de Inteligencia ni Sabiduría en esta entrega.

## 9. Afijos de accesorios

Se agregaron como sufijos activos dentro de `Sufijos.json`:

| ID | Nombre | Estadística |
|---|---|---|
| `del_deshielo` | Del deshielo | Resistencia a Congelamiento |
| `de_firmeza` | De firmeza | Resistencia a Aturdimiento |
| `de_purificacion` | De purificación | Resistencia a Envenenamiento |
| `de_ceniza` | De ceniza | Resistencia a Quemadura |

Solo pueden aparecer en:

- collar;
- anillo derecho;
- anillo izquierdo.

Valores iniciales:

- grado 1: 3–6 %;
- grado 2: 7–10 %;
- grado 3: 11–15 %.

No existen afijos de inmunidad.

## 10. Enemigos

Todos los enemigos normales y especiales poseen dentro de su propia definición:

```json
{
  "resistenciasEfectos": {
    "congelamiento": 0,
    "aturdimiento": 0,
    "envenenamiento": 0,
    "quemadura": 0
  },
  "inmunidadesEfectos": []
}
```

Se asignaron valores iniciales coherentes con su identidad para disponer de casos reales de prueba. No se agregaron condiciones por nombre de enemigo dentro de los motores.

Valores destacables:

- esqueletos: alta Resistencia a Envenenamiento;
- zombi: resistencia elevada a Envenenamiento y moderada a control;
- Caballero Óseo: 75 % a Envenenamiento y resistencia alta a control;
- Señor de la Guerra: 50 % a Aturdimiento y valores moderados en las demás.

El balance definitivo se revisará en ETAPA 12.

## 11. Recompensas y prevención de duplicados

Las habilidades y efectos no conceden directamente experiencia general ni botín.

```text
Daño directo o tick periódico
        ↓
Motor canónico de daño
        ↓
Estado derrotado
        ↓
ResolutorDerrotasJugador
        ↓
Experiencia general y botín una sola vez
```

Protecciones verificadas:

- una geometría no procesa dos veces al mismo enemigo;
- cada lanzamiento utiliza un solo identificador de ejecución;
- la experiencia de maestría se concede una vez por lanzamiento;
- una instancia periódica mantiene una sola cadencia;
- el resolutor marca cada instancia enemiga ya recompensada;
- invocar nuevamente el resolutor devuelve cero derrotas procesadas;
- esperar después de una muerte periódica no vuelve a conceder experiencia ni botín.

## 12. Corrección genérica del tiempo

Durante la prueba de Aturdimiento se detectó que una duración inferior al coste temporal de la acción podía dejar el turno base del actor en un instante anterior al tiempo actual. Eso provocaba el error «El sistema de tiempo no puede retroceder» al vencer el estado.

Se corrigió de forma genérica en `SistemaTiempo`: el próximo turno efectivo nunca puede ser anterior al tiempo actual. No se añadió una excepción para Descarga fulminante ni para Aturdimiento.

## 13. Archivos modificados o agregados

### Configuración y presentación

- `index.html`: agrega las cuatro resistencias al panel.
- `src/config/ConfiguracionPersonaje.json`: bases a 0 % y sin inmunidades.
- `src/config/entidades/Enemigos.json`: resistencias e inmunidades por enemigo normal.
- `src/config/entidades/EnemigosEspeciales.json`: resistencias e inmunidades por enemigo especial.
- `src/config/magia/Habilidades.json`: migra referencias y activa las cuatro habilidades avanzadas.
- `src/config/magia/Efectos.json`: nuevo catálogo canónico.
- `src/config/objetos/afijos/Sufijos.json`: cuatro sufijos exclusivos de accesorios.
- `assets/licencias/Kenney_CC0.txt`: elimina una referencia histórica por número de etapa del contenido distribuido.

### Entidades, estadísticas e interfaz

- `src/entidad/destructible/combatiente/Combatiente.js`: incorpora inmunidades y resistencias base.
- `src/entidad/destructible/combatiente/EstadisticasDerivadas.js`: suma resistencias de equipo y limita el resultado.
- `src/interfaz/PanelPersonaje.js`: presenta las cuatro resistencias.
- `src/interfaz/objetos/PresentadorObjeto.js`: muestra los nuevos atributos en detalles y comparadores.

### Daño, efectos y habilidades

- `src/juego/combate/ComponentesDanio.js`: mantiene normalización compatible con componentes periódicos.
- `src/juego/efectos/CatalogoEfectos.js`: nuevo validador y resolutor del catálogo.
- `src/juego/efectos/ResistenciasEfectos.js`: IDs, propiedades, límites e inmunidades.
- `src/juego/efectos/ContratosEfectosTemporales.js`: amplía el contrato canónico.
- `src/juego/efectos/SistemaEfectosTemporales.js`: resistencia, inmunidad, perfiles, potencia y resultados.
- `src/juego/habilidades/DepuradorMagiaHabilidades.js`: comandos deterministas y validación de habilidades avanzadas.
- `src/juego/habilidades/MotorDanioHabilidad.js`: conserva el contexto determinista y canónico de los efectos.
- `src/juego/habilidades/MotorEfectosHabilidad.js`: aplica referencias del catálogo.
- `src/juego/habilidades/SistemaHabilidadesJugador.js`: mensajes y tiradas de efecto por objetivo.
- `src/juego/habilidades/ValidadorConfiguracionEjecucionHabilidades.js`: carga y valida el catálogo junto a las habilidades.
- `src/juego/maestrias/ContextoProgresoMagico.js`: carga `Efectos.json` como configuración obligatoria.

### Objetos, progreso y tiempo

- `src/juego/objetos/ValidadorConfiguracionGeneracionObjetos.js`: acepta las propiedades de resistencia nuevas.
- `src/juego/progresion/SistemaProgresion.js`: elimina un nombre temporal histórico de un comentario de producción.
- `src/juego/tiempo/CoordinadorTiempoPartida.js`: expone sincronización de inmunidades.
- `src/juego/tiempo/SistemaTiempo.js`: impide retroceder al resolver turnos suspendidos.

### Documentación

- `docs/magia/ENTREGA_ETAPA_11.md`: este documento.

## 14. Instalación y reemplazo

La entrega de archivos completos conserva sus rutas relativas.

Procedimiento recomendado:

1. Confirmar que la copia local parte del commit `0b2f91967bac687fa640146352a415d9261094d7`.
2. Cerrar el juego y cualquier servidor local que esté sirviendo archivos antiguos.
3. Copiar el contenido del ZIP de archivos completos sobre la raíz del repositorio.
4. Aceptar el reemplazo de los archivos existentes.
5. Conservar los tres archivos nuevos en sus rutas:

```text
src/config/magia/Efectos.json
src/juego/efectos/CatalogoEfectos.js
src/juego/efectos/ResistenciasEfectos.js
```

6. No eliminar otros archivos.
7. Iniciar el juego mediante el mismo servidor HTTP utilizado normalmente.
8. Crear una partida nueva para la validación.

No se necesita ejecutar un instalador, migrador, script de Node ni comando de dependencias.

## 15. Comandos deterministas para consola del navegador

Ejecutar primero una partida como Mago y luego abrir la consola.

### 15.1 Validación global

```javascript
const dm = darkMoonDebug.magia;
dm.validarTodo();
```

Resultado esperado:

```javascript
{ aprobado: true, ... }
```

### 15.2 Preparar Incinerar grado 3 con tres enemigos en línea

```javascript
const dm = darkMoonDebug.magia;
dm.progreso.prepararHabilidadParaPrueba({
  idHabilidad: "incinerar",
  grado: 3,
});
dm.barra.vaciar();
dm.barra.asignar(1, "incinerar");
const escenario = dm.habilidades.prepararEnemigosEnLineaParaPrueba({
  cantidad: 3,
  distanciaInicial: 1,
  separacion: 1,
});
dm.habilidades.configurarTiradasDeterministas({
  impacto: [1, 1, 1],
  critico: [100, 100, 100],
  efecto: [1, 1, 1],
});
dm.habilidades.seleccionarPorRanura(1);
const destino = escenario.posiciones[2];
dm.habilidades.fijarSelector(destino.x, destino.y);
dm.habilidades.obtenerSeleccion();
```

Confirmar con:

```javascript
dm.habilidades.confirmar();
```

### 15.3 Probar resistencia a Aturdimiento

```javascript
const objetivo = dm.habilidades.obtenerEnemigosVivos()[0];
dm.efectos.establecerResistenciaParaPrueba({
  objetivo,
  id: "aturdimiento",
  valor: 75,
});
```

Para Descarga grado 2, una tirada 8 debe resistir 7,5 %:

```javascript
dm.habilidades.configurarTiradasDeterministas({
  impacto: [1],
  critico: [100],
  efecto: [8],
});
```

Una tirada 7 debe aplicar:

```javascript
dm.habilidades.configurarTiradasDeterministas({
  impacto: [1],
  critico: [100],
  efecto: [7],
});
```

### 15.4 Probar inmunidad explícita

```javascript
dm.efectos.establecerInmunidadesParaPrueba({
  objetivo,
  inmunidades: ["aturdimiento"],
});
```

Al lanzar Descarga, el daño de Rayo continúa, el efecto devuelve `inmune`, la probabilidad final es 0 y no consume la tirada preparada para el efecto.

### 15.5 Probar retirada inmediata al adquirir inmunidad

Después de aplicar una Quemadura:

```javascript
dm.efectos.obtenerActivos(objetivo);
dm.efectos.establecerInmunidadesParaPrueba({
  objetivo,
  inmunidades: ["quemadura"],
});
dm.efectos.obtenerActivos(objetivo);
```

El resultado intermedio debe informar una retirada con motivo `inmunidad_adquirida` y la última consulta debe devolver una lista vacía.

### 15.6 Probar Plaga sobre el mismo Envenenamiento

```javascript
const efectosAntes = dm.efectos.obtenerActivos(objetivo);
// Lanzar Aguijón tóxico una vez y Plaga corrosiva varias veces.
const efectosDespues = dm.efectos.obtenerActivos(objetivo);
efectosDespues.map(({ id, efectoId, intensidad, proximoTick, venceEn }) => ({
  id,
  efectoId,
  intensidad,
  proximoTick,
  venceEn,
}));
```

Resultado esperado:

- un solo `id` de instancia;
- `efectoId: "envenenamiento"`;
- intensidad máxima respetada;
- un único próximo tick.

### 15.7 Probar lanzamiento sin arma específica

```javascript
const juego = darkMoonAplicacion.controladorPartida.juego;
const antes = dm.catalizadores.obtenerPotenciaHabilidad();
juego.player.equipamiento.desequipar("arma");
const despues = dm.catalizadores.obtenerPotenciaHabilidad();
({ antes, despues });
```

Incinerar, Prisión, Descarga y Plaga deben continuar siendo seleccionables y ejecutables. En la prueba realizada, la Potencia de Habilidad pasó de 15 % a 0 % y el lanzamiento siguió siendo válido.

### 15.8 Probar muerte periódica y recompensa única

1. Aplicar Quemadura o Envenenamiento.
2. Dejar al objetivo con 1 de Vida:

```javascript
dm.habilidades.establecerVidaObjetivoParaPrueba({
  objetivo,
  valor: 1,
});
```

3. Esperar con Espacio hasta el tick.
4. Consultar experiencia y botín.
5. Esperar nuevamente.

El segundo avance no debe volver a otorgar recompensas.

## 16. Pruebas realizadas y resultados

La validación se ejecutó cargando los archivos reales del juego en Chromium, iniciando una partida real desde la pantalla de creación y usando la interfaz, el teclado, Canvas y la fachada de consola.

El entorno de ejecución bloqueaba la navegación directa a un servidor local. Para no modificar el código de producción, los mismos archivos se sirvieron al navegador mediante una ruta de prueba de Playwright. No se instalaron dependencias.

### Inicio completo e interfaz

- partida iniciada correctamente;
- contenedor del juego visible;
- `darkMoonDebug.magia.validarTodo().aprobado === true`;
- sin errores de página ni de consola;
- las cuatro resistencias aparecen en el panel a 0 %;
- el selector lineal de Incinerar se representa en Canvas;
- el lanzamiento por teclado actualiza Maná, Vida, selector y registro de eventos.

### Cuatro habilidades y tres grados

- 12 de 12 combinaciones aprobadas;
- Maná exacto;
- tiempo exacto;
- forma y cantidad de objetivos exactas;
- daño positivo y mitigación elemental;
- efecto correcto por objetivo;
- experiencia de maestría una vez por lanzamiento;
- sin errores del navegador.

### Resistencias e inmunidad

- Descarga grado 2 con 75 % a Rayo y 75 % a Aturdimiento:
  - daño bruto 30;
  - daño final 7;
  - probabilidad base 30 %;
  - probabilidad final 7,5 %;
  - tirada 8: resistido;
  - tirada 7: aplicado.
- inmunidad a Aturdimiento:
  - daño directo aplicado;
  - efecto inmune;
  - tirada de efecto no consumida.
- adquirir inmunidad a Quemadura:
  - una instancia retirada inmediatamente;
  - motivo `inmunidad_adquirida`;
  - ninguna Quemadura activa después.

### Acumulación y cadencia

- Aguijón seguido por Plaga grado 3:
  - intensidades 1, 2, 3, 3 y 3;
  - un único ID de instancia;
  - un único efecto activo;
  - el próximo tick conservó la cadencia y no se reinició.
- Congelamiento y Aturdimiento reaplicados mientras estaban activos:
  - primera aplicación aceptada;
  - segunda rechazada por política;
  - duración y ID sin cambios.

### Resistencias elementales cercanas al máximo

Con 75 % elemental:

- Incinerar: bruto 17, final 4;
- Prisión glacial: bruto 13, final 3;
- Descarga fulminante: bruto 23, final 5;
- Plaga corrosiva: bruto 10, final 2.

### Crítico

- Incinerar produjo crítico determinista;
- multiplicador 1,5;
- la Quemadura se aplicó una sola vez después del impacto.

### Casos fallidos

Aprobados:

- maestría nivel 5;
- intento de grado 4;
- grado máximo alcanzado;
- Maná insuficiente sin gastar tiempo ni Maná;
- objetivo inválido;
- objetivo fuera de alcance.

### Recompensas

- ataque normal: una muerte, experiencia y botín una sola vez;
- Incinerar: tres muertes directas en línea, tres recompensas individuales y ninguna repetición;
- muerte por Quemadura: experiencia y botín una vez; un segundo avance no repitió la recompensa;
- ejecutar nuevamente el resolutor devolvió cero procesados.

### Jefes y élites

- Señor de la Guerra:
  - contrato común;
  - Resistencia a Aturdimiento 50 %;
  - Descarga grado 3 quedó en 20 % y pudo aplicarse con tirada 20;
  - sin rama especial por nombre.
- Lancero élite:
  - Prisión grado 3 aplicó el mismo contrato común;
  - sin errores ni excepciones específicas.

### Regresión de habilidades existentes

Aprobadas:

- Esquirla de hielo → Ralentización;
- Chispa → Electrización;
- Aguijón tóxico → Envenenamiento;
- Nova de escarcha → Ralentización múltiple;
- Cadena de rayos → Electrización múltiple;
- Nube tóxica → zona persistente y Envenenamiento.

### Sin arma específica

- Potencia de Habilidad con bastón: 15 %;
- Potencia tras desequiparlo: 0 %;
- Incinerar continuó ejecutándose con éxito;
- el resultado registró Potencia de Habilidad 0 %;
- sin errores de página o consola.

## 17. Criterios comprobados

- [x] cuatro habilidades avanzadas activas;
- [x] nivel de maestría requerido 6;
- [x] exactamente tres grados por habilidad;
- [x] sin desbloqueos 10/40/70;
- [x] sin requisito de arma específica;
- [x] Potencia de Habilidad canónica;
- [x] catálogo genérico de efectos;
- [x] resistencias a efectos visibles;
- [x] personajes iniciales en 0 %;
- [x] afijos solo para anillos y collares;
- [x] resistencias en enemigos normales y especiales;
- [x] inmunidad explícita diseñada y operativa;
- [x] resistencia aplicada sobre probabilidad;
- [x] una instancia y una cadencia por efecto;
- [x] controles sin renovación permanente;
- [x] Plaga con intensidad limitada;
- [x] muertes directas y periódicas;
- [x] experiencia general y botín una sola vez;
- [x] experiencia de maestría una vez por lanzamiento;
- [x] jefes y élites con contrato común;
- [x] validación desde interfaz real del navegador;
- [x] comandos deterministas reproducibles.

## 18. Riesgos pendientes

1. Los valores de daño, Maná, tiempo, resistencias enemigas y afijos son iniciales. Su balance formal corresponde a ETAPA 12.
2. La configuración actual posee ranuras de collar y anillos, pero no existen todavía plantillas naturales de accesorios que entren en la generación normal. Los afijos están habilitados y validados, pero aparecerán naturalmente cuando se incorpore ese contenido.
3. El motor admite inmunidades innatas o adquiridas, pero esta entrega no crea afijos, consumibles ni habilidades que otorguen inmunidad al jugador.
4. La relación de las resistencias con Inteligencia o Sabiduría queda deliberadamente pendiente para ETAPA 12.
5. Los modos futuros `reducir_duracion` y `reducir_danio` están validados como contrato, pero no se utilizan todavía en los cuatro efectos iniciales.

## 19. Ausencia de nombres temporales

Se comprobó que no existen en código, configuración, nombres de archivos ni documentación de licencias distribuida referencias temporales de producción como:

```text
Etapa10
ETAPA_10
Etapa11
InstaladorEtapaX
```

Los únicos nombres por etapa permanecen dentro de `docs/magia`, donde son parte del historial documental solicitado.

## 20. Confirmación de restricciones

- No se creó ningún `.patch`.
- No se creó ningún `.mjs`.
- No se utilizó Node.js.
- No se utilizó `node:test`.
- No se instalaron dependencias, librerías, runtimes ni frameworks.
- No se creó un motor por habilidad.
- No se agregaron JSON paralelos para enemigos, objetos o afijos.
- No se creó un instalador ni migrador temporal.
- No se realizó commit.
- No se realizó push.
- No se avanzó a ETAPA 12.

## 21. Conventional Commit propuesto

```text
feat(habilidades): incorporar habilidades avanzadas y efectos canónicos

- activar Incinerar, Prisión glacial, Descarga fulminante y Plaga corrosiva
- centralizar políticas de efectos, resistencias e inmunidades
- agregar resistencias visibles a Congelamiento, Aturdimiento, Envenenamiento y Quemadura
- habilitar sufijos de resistencia exclusivos para anillos y collares
- configurar resistencias de enemigos normales, especiales, élites y jefes
- conservar una instancia y cadencia por efecto con acumulación limitada
- mantener recompensas únicas en muertes directas y periódicas
- ampliar la fachada de pruebas deterministas del navegador
- corregir el turno efectivo de actores al vencer controles breves
```
