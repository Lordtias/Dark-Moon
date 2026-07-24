# ETAPA 3 — Inteligencia, Sabiduría y economía de Maná

## Estado de la entrega

Implementación preparada sobre el commit base:

```text
22362a788c61b2f6d99ee60ac6451f1de262f917
feat(efectos): agregar motor de efectos temporales
```

No se realizó ningún commit y no se avanzó a la ETAPA 4.

La ETAPA 3A — Estado de combate y regeneración de Vida queda únicamente
planificada para ejecutarse después de esta etapa y antes de la ETAPA 4.
Durante la ETAPA 3 la Vida continúa regenerando dentro y fuera de combate.

## Resumen de implementación

- Se centralizaron las fórmulas mágicas en una configuración independiente del
  combate físico.
- Inteligencia y Sabiduría ahora producen multiplicadores derivados de daño
  mágico y potencia de efectos.
- El Maná máximo combina base profesional, crecimiento por nivel, Inteligencia,
  Sabiduría y bonificaciones planas de equipo.
- Sabiduría aporta regeneración de Maná fraccionaria en cada pulso temporal ya
  existente de 100 unidades.
- El Maná conserva su proporción al cambiar el máximo por nivel, atributos o
  equipo; la Vida conserva el comportamiento histórico de cantidad faltante.
- Vida y Maná se regeneran mediante operaciones separadas, preparando la ETAPA
  3A sin cambiar todavía la regla de combate.
- Se definió un contrato de instantánea para efectos mágicos: valor y duración
  se fijan al aplicar; los ticks posteriores consultan las defensas actuales del
  objetivo.
- El panel Personaje muestra una sección compacta de Magia sin modificar la
  plantilla HTML ni agregar CSS nuevo.
- El Plan Maestro se actualizó a v1.4 e incorpora formalmente la ETAPA 3A entre
  las ETAPAS 3 y 4.

## Fórmulas implementadas

### Daño mágico

```text
máximo(0,50;
  1
  + 0,035 × (Inteligencia − 10)
  + 0,015 × (Sabiduría − 10)
)
```

### Potencia de efectos

```text
máximo(0,50;
  1
  + 0,015 × (Inteligencia − 10)
  + 0,035 × (Sabiduría − 10)
)
```

### Maná máximo

```text
Maná de profesión
+ crecimiento por nivel
+ 2 × (Inteligencia − 10)
+ 1 × (Sabiduría − 10)
+ bonificaciones planas de equipo
```

### Regeneración de Maná por pulso

```text
regeneración base de profesión
+ 0,10 × Sabiduría
+ regeneración plana de equipo
+ porcentaje configurado sobre Maná máximo
```

El pulso continúa utilizando `TIEMPO_REFERENCIA = 100` como única fuente de
verdad del reloj temporal.

## Arquitectura final

### Configuración

`src/config/ConfiguracionMagia.js` contiene solamente coeficientes de balance
mágico. `ConfiguracionCombate.js` conserva fórmulas físicas, resistencias,
bloqueo y doble arma, evitando mantener dos contratos mágicos simultáneos.

### Cálculo puro

`src/juego/magia/CalculadorAtributosMagicos.js` expone funciones puras para:

- multiplicadores de daño y efectos;
- Maná máximo y regeneración;
- escalado de daño;
- instantáneas de efectos;
- captura y restauración segura de recursos.

### Estadísticas derivadas

`EstadisticasDerivadas.js` integra los cálculos mágicos al mismo objeto de
estadísticas que utiliza el resto del juego. También conserva
`potenciaEfectos` como porcentaje de compatibilidad para consumidores previos.

### Recursos

Al recalcular máximos:

- la Vida conserva la cantidad que faltaba, como antes de esta etapa;
- el Maná conserva `actual / máximoAnterior`, limitado al nuevo máximo;
- Maná lleno permanece lleno y Maná vacío permanece vacío;
- el redondeo se realiza al entero más cercano.

La regla se aplica después de subir nivel, asignar atributos, equipar o
desequipar correctamente. Las operaciones rechazadas no alteran recursos.

### Regeneración

`Combatiente` separa `procesarRegeneracionVida` y
`procesarRegeneracionMana`. `procesarPulsoRegeneracion` continúa invocando
ambas durante la ETAPA 3. La ETAPA 3A podrá omitir únicamente la operación de
Vida cuando el estado de combate esté activo.

### Efectos temporales

La instantánea copia la definición trasladable, conserva la identidad real del
objetivo y reduce la fuente a un descriptor estable. Cada efecto decide si
escala valor, duración, ambos o ninguna magnitud.

Una reaplicación aceptada puede usar los atributos actuales del lanzador porque
entrega una instantánea nueva al motor de la ETAPA 2. El motor actualiza la
potencia base y renueva el vencimiento, pero conserva el próximo tick de la
instancia existente.

### Interfaz

`PanelPersonaje` agrega dinámicamente una sección Magia antes de Resistencias.
Muestra:

- `Daño mágico` como multiplicador;
- `Potencia de efectos` como multiplicador.

El Maná máximo y la regeneración ya se muestran mediante los campos existentes.

## Archivos nuevos

```text
src/config/ConfiguracionMagia.js
src/juego/magia/CalculadorAtributosMagicos.js
docs/magia/VALIDACION_CONSOLA_ETAPA_3.md
docs/magia/ETAPA_3A_ESTADO_COMBATE_REGENERACION_VIDA.md
docs/magia/Plan_Maestro_Magia_Habilidades_Maestrias_Dark_Moon_v1.4.docx
docs/magia/ENTREGA_ETAPA_3.md
```

## Archivos modificados

```text
src/config/ConfiguracionCombate.js
src/entidad/destructible/combatiente/EstadisticasDerivadas.js
src/entidad/destructible/combatiente/Combatiente.js
src/entidad/destructible/combatiente/Player.js
src/juego/inventario/SistemaInventarioEquipamiento.js
src/interfaz/PanelPersonaje.js
```

Todos los JavaScript modificados se entregan como archivos completos.

## Archivos eliminados

Ninguno.

## Validaciones realizadas en el entorno de entrega

### Revisión estática

Resultado: correcto.

- Los ocho archivos JavaScript superaron una comprobación léxica de cadenas,
  comentarios y delimitadores.
- Las cuatro combinaciones de referencia `15/8`, `12/12`, `8/15` y `8/8`
  produjeron los multiplicadores, máximos y regeneraciones esperados.
- Guerrero nivel 1 y Rogue nivel 10 conservaron máximos de Maná válidos en los
  casos extremos comprobados.
- Los coeficientes mágicos anteriores ya no permanecen en
  `ConfiguracionCombate.js`.
- No se encontraron archivos `.mjs` ni `.patch`.
- No se modificó ninguna ruta de curación o curandera.
- El documento de consola contiene 41 comprobaciones deterministas.

### Documento maestro

Resultado: correcto.

- El DOCX v1.4 se renderizó a PDF de 39 páginas.
- Se inspeccionaron visualmente las 39 páginas.
- Se corrigieron los formatos de portada, encabezado de ETAPA 3A y cierre.
- No se observaron textos cortados, tablas desbordadas ni páginas ilegibles.

### Juego en navegador

No se ejecutó una partida real desde este entorno porque no fue posible obtener
un checkout ejecutable completo del repositorio. Por ese motivo no se declara
como realizada una prueba manual de juego que no pudo comprobarse.

El archivo `VALIDACION_CONSOLA_ETAPA_3.md` contiene un bloque autocontenido para
el navegador. El resultado esperado es:

```text
ETAPA 3: 41 comprobaciones correctas; 0 fallidas.
```

## Pruebas manuales que debe ejecutar el usuario

1. Reemplazar los archivos completos y abrir el juego normalmente.
2. Crear un Mago y comprobar la nueva sección Magia.
3. Asignar Inteligencia con Maná parcial; verificar daño mágico, máximo y
   conservación aproximada del porcentaje.
4. Asignar Sabiduría; verificar potencia de efectos y regeneración.
5. Subir de nivel con Maná parcial.
6. Equipar y desequipar objetos con Maná parcial.
7. Esperar pulsos de 100 unidades y comprobar acumulación fraccionaria.
8. Restaurar Maná mediante el servicio existente sin cambios de curandera.
9. Cambiar mazmorra–ciudad–mazmorra y comprobar continuidad de jugador y
   efectos de sesión.
10. Ejecutar regresión de ataque físico, arco, munición, doble arma,
    inventario, consumibles y equipamiento.
11. Copiar el bloque completo de `VALIDACION_CONSOLA_ETAPA_3.md` en la consola.
12. Confirmar ausencia de errores, `NaN`, recursos negativos y eventos
    huérfanos.

## Criterios de aceptación comprobados estáticamente

- [x] Inteligencia altera daño mágico y Maná máximo.
- [x] Sabiduría altera potencia de efectos y regeneración de Maná.
- [x] Las fórmulas y coeficientes viven en configuración centralizada.
- [x] Guerrero y Rogue admiten atributos mágicos bajos sin Maná negativo.
- [x] El Maná máximo se limita y redondea de forma determinista.
- [x] El Maná conserva proporción al cambiar el máximo.
- [x] Vida y Maná poseen operaciones y acumuladores separados.
- [x] Los efectos pueden fijar valor y duración al aplicarse.
- [x] La instantánea conserva objetivo y descriptor estable de fuente.
- [x] Reaplicar puede entregar potencia nueva sin crear otra instancia.
- [x] El panel consume estadísticas de dominio y no recalcula fórmulas.
- [x] No se modificó la curandera.
- [x] No se incorporaron `.mjs`, `.patch`, Node.js ni dependencias externas.
- [x] Se documentó formalmente la ETAPA 3A posterior.

## Criterios pendientes de comprobación en navegador

- [ ] La sección Magia se integra correctamente en todas las resoluciones.
- [ ] La barra de Maná conserva visualmente la proporción tras cada flujo real.
- [ ] La regeneración fraccionaria coincide con acciones de distintos costes.
- [ ] La curandera recupera hasta el nuevo máximo sin regresiones.
- [ ] Las transiciones conservan recursos y efectos sin errores de consola.
- [ ] Ataques físicos, inventario, equipamiento y mapas no presentan regresión.
- [ ] El bloque de consola finaliza con 41 correctas y 0 fallidas.

## Riesgos y limitaciones pendientes

- Todavía no existen habilidades activas normales que consuman los nuevos
  multiplicadores; la comprobación funcional directa se realiza desde consola.
- La conservación proporcional redondea a enteros y puede variar un punto en
  proporciones no representables exactamente.
- `potenciaEfectos` permanece como alias porcentual de compatibilidad; los
  sistemas nuevos deben preferir `multiplicadorEfectos`.
- La progresión continúa entregando puntos adicionales en niveles 5 y 10; esa
  contradicción histórica no pertenece a la ETAPA 3.
- La Vida todavía regenera durante combate. La corrección queda explícitamente
  fuera de esta entrega y planificada para la ETAPA 3A.
- La persistencia durable de recursos derivados y efectos continúa reservada a
  la ETAPA 4.

## Confirmación de restricciones

- No se incorporaron archivos `.patch`.
- No se incorporaron archivos `.mjs`.
- No se utilizó `node:test`.
- No se utilizó Node.js.
- No se instalaron runtimes, librerías ni dependencias externas.
- No se modificó la curandera.
- No se realizó commit.
- No se avanzó a la ETAPA 4.

## Conventional Commit propuesto

```text
feat(personaje): integrar inteligencia sabiduria y economia de mana

- centraliza los coeficientes mágicos en una configuración independiente
- calcula daño mágico y potencia de efectos desde Inteligencia y Sabiduría
- incorpora ambos atributos al Maná máximo y Sabiduría a su regeneración
- conserva proporcionalmente el Maná al subir nivel, asignar atributos o cambiar equipo
- separa las operaciones de regeneración de Vida y Maná para preparar la ETAPA 3A
- agrega instantáneas de valor y duración para efectos mágicos ya aplicados
- muestra los multiplicadores mágicos derivados en el panel del personaje
- documenta 41 comprobaciones deterministas para la consola del navegador
- actualiza el Plan Maestro a v1.4 y planifica el estado de combate posterior
```

## Prompt para la ETAPA 3A

Después de aplicar, probar, confirmar y crear el commit de esta ETAPA 3, abrir
un chat nuevo del proyecto y usar el siguiente texto, reemplazando el marcador
del SHA:

```text
Quiero continuar el Plan Maestro de Magia, Habilidades y Maestrías de Dark Moon.

Repositorio: https://github.com/Lordtias/Dark-Moon.git
Rama: main
Especificación operativa: docs/magia/ETAPA_0_REVALIDACION_ESPECIFICACION.md
Documento maestro actualizado: docs/magia/Plan_Maestro_Magia_Habilidades_Maestrias_Dark_Moon_v1.4.docx
Plan específico: docs/magia/ETAPA_3A_ESTADO_COMBATE_REGENERACION_VIDA.md
Último commit confirmado de la ETAPA 3:
[PEGAR_SHA_COMPLETO_DEL_COMMIT_DE_ETAPA_3]
Etapa solicitada: ETAPA 3A — Estado de combate y regeneración de Vida

Revisá directamente el último estado de main, el historial reciente, la
especificación, el documento maestro v1.4, el plan específico de la ETAPA 3A y
el código relacionado. Verificá el HEAD real y comparalo con el SHA indicado.
No asumas que continúa siendo el último commit.

Antes de escribir código, comprobá especialmente:
- la separación entre regeneración de Vida y Maná incorporada en la ETAPA 3;
- el reloj de pulsos de 100 unidades y los acumuladores fraccionarios;
- la IA de percepción, persecución, pérdida de objetivo y acciones hostiles;
- el ciclo ciudad–mazmorra, destrucción de mapas, muerte y nueva partida;
- la agenda temporal, efectos, aturdimiento y limpieza de combatientes;
- todos los flujos que causan o reciben daño;
- que la curandera y las recuperaciones explícitas no sean regeneración natural.

Decisiones vigentes:
- fuera de combate regeneran Vida y Maná;
- en combate no regenera la Vida natural y el Maná continúa regenerando;
- no se inicia combate por abrir, mover o cancelar un selector;
- no se inicia combate por la mera existencia de enemigos vivos en el mapa;
- el estado se activa por participación hostil real, detección con persecución,
  intento hostil válido, daño causado o daño recibido;
- los enemigos ocultos, lejanos o no involucrados no bloquean regeneración;
- el estado se limpia al finalizar el enfrentamiento, morir, volver a ciudad,
  destruir el mapa o iniciar una nueva partida;
- pociones, consumibles, servicios y curaciones explícitas siguen funcionando;
- la curandera no debe modificarse;
- no agregar todavía otras restricciones de inventario, equipo, viaje o UI.

Restricción obligatoria de pruebas:
- no incorporar archivos .patch;
- entregar archivos completos aunque el cambio sea mínimo;
- no incorporar archivos .mjs;
- no utilizar node:test ni Node.js;
- no instalar runtimes, librerías ni dependencias externas;
- validar mediante pruebas manuales dentro del juego y comandos deterministas
  copiables en la consola del navegador.

Antes de implementar, explicame:
1. HEAD actual y relación con el commit de ETAPA 3;
2. definición exacta del estado de combate;
3. eventos de entrada y salida;
4. participantes y fuente única de verdad;
5. interacción con IA, tiempo, efectos, muerte y mapas;
6. archivos a crear, modificar o eliminar;
7. contradicciones, decisiones y riesgos;
8. pruebas manuales y comandos deterministas;
9. criterios de aceptación;
10. fuera de alcance.

Después de presentar la revisión y el plan, detenete y esperá mi aprobación
explícita. No escribas código hasta que responda exactamente:

Aprobado. Podés implementar la etapa.

Al terminar, entregame resumen, commit base, archivos, arquitectura, pruebas,
comandos de consola, resultados, criterios comprobados, riesgos, confirmación
de restricciones, Conventional Commit completo y prompt para la ETAPA 4.

No realices el commit ni avances a la ETAPA 4.
```
