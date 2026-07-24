# ETAPA 0 — Revalidación y congelamiento de especificación

## 1. Identificación

| Campo | Valor |
|---|---|
| Proyecto | Dark Moon |
| Repositorio | `https://github.com/Lordtias/Dark-Moon.git` |
| Rama revisada | `main` |
| Documento rector | `Plan_Maestro_Magia_Habilidades_Maestrias_Dark_Moon_v1.2.docx` |
| Versión del documento | 1.2 |
| Fecha del documento | 24 de julio de 2026 |
| Commit informado | `c0bd3d16cbc83a1b9c4f9fff3753e63043f45cd4` |
| HEAD visible confirmado | `c0bd3d16cbc83a1b9c4f9fff3753e63043f45cd4` |
| Fecha del HEAD | 23 de julio de 2026, 20:07:22, UTC−03:00 |
| Mensaje del HEAD | `refactor(interfaz): extraer plantillas HTML de creación y curación` |
| Resultado de la comparación | El commit informado y el HEAD visible coinciden. No hay cambios posteriores que deban incorporarse a esta etapa. |
| Tipo de etapa | Documental; sin cambios funcionales |

Este SHA queda congelado como referencia oficial para iniciar el hito de magia, habilidades y maestrías. Después de cualquier futuro `push`, deberá repetirse la comparación de `main` antes de comenzar una nueva etapa.

## 2. Alcance ejecutado

Esta etapa:

- revalida el estado real del repositorio frente al plan maestro v1.2;
- inventaría los contratos actuales de combate, tiempo, atributos, jugador, objetos, afijos, interfaz, persistencia y progresión;
- congela las decisiones funcionales y técnicas que deberán respetar las etapas posteriores;
- registra contradicciones entre el diseño objetivo y la implementación actual;
- identifica los contratos y archivos que condicionan la ETAPA 1;
- confirma que la ETAPA 0 no incorpora código, balance jugable ni infraestructura adelantada.

No se modificaron JavaScript, JSON, HTML, CSS ni recursos visuales.

## 3. Cambios recientes revisados

El último commit visible modificó exclusivamente:

- `index.html`;
- `src/interfaz/MenuCreacionPersonaje.js`;
- `src/interfaz/curacion/ModalCuracion.js`.

El cambio extrajo estructuras HTML de creación de personaje y curación desde JavaScript hacia plantillas declaradas en `index.html`. El contrato arquitectónico que queda vigente es:

- las estructuras visuales extensas deben permanecer en HTML;
- JavaScript debe clonar, enlazar y controlar las plantillas;
- no deben introducirse bloques HTML extensos mediante `innerHTML` o generadores de cadenas en las futuras interfaces de habilidades y maestrías.

## 4. Estado real por subsistema

### 4.1 Combate

Archivos críticos revisados:

- `src/juego/combate/SistemaCombate.js`;
- `src/entidad/destructible/combatiente/EstadisticasDerivadas.js`;
- `src/entidad/destructible/combatiente/ConfiguracionAtaque.js`;
- `src/entidad/destructible/Destructible.js`;
- `src/entidad/destructible/combatiente/Combatiente.js`.

Estado confirmado:

- el ataque actual utiliza una tubería física;
- el daño se obtiene desde `estadisticasDerivadas.danioFisico`;
- puede haber varios golpes o componentes por mano, pero siguen siendo resoluciones físicas;
- se resuelven impacto, crítico, bloqueo, Armadura, daño recibido y destrucción/muerte;
- el consumo de munición se realiza una vez por acción de ataque;
- no existe todavía un modelo común de componentes tipados `fisico`, `fuego`, `frio`, `rayo` y `veneno`;
- no existe una quinta categoría genérica de daño mágico o arcano.

Conclusión congelada:

> La magia debe extender la tubería de combate existente. No se creará un sistema de combate paralelo.

### 4.2 Tiempo

Archivos críticos revisados:

- `src/juego/tiempo/SistemaTiempo.js`;
- `src/juego/tiempo/CoordinadorTiempoPartida.js`;
- `src/entidad/destructible/combatiente/ConfiguracionAtaque.js`.

Estado confirmado:

- los actores poseen próxima disponibilidad temporal;
- menor coste temporal implica una acción más rápida;
- existen factores separados para movimiento, ataque, acción, consumo y espera;
- la regeneración se procesa mediante pulsos de 100 unidades temporales;
- la regeneración fraccionaria de Vida y Maná dispone de acumuladores;
- el coordinador contiene un punto de extensión para eventos, pero no un motor general de efectos temporales;
- no existen todavía zonas persistentes, quemaduras, venenos, ralentizaciones, aturdimientos ni vencimiento de duraciones como infraestructura común.

Conclusión congelada:

> Los costes de habilidades y los efectos futuros deben integrarse con `SistemaTiempo` y `CoordinadorTiempoPartida`, sin restaurar el antiguo modelo de rondas completas.

### 4.3 Atributos, recursos y resistencias

Archivos críticos revisados:

- `src/config/ConfiguracionCombate.js`;
- `src/entidad/destructible/combatiente/Combatiente.js`;
- `src/entidad/destructible/combatiente/EstadisticasDerivadas.js`;
- `src/config/ConfiguracionPersonaje.json`.

Estado confirmado:

- existen Fuerza, Destreza, Constitución, Inteligencia, Sabiduría y Carisma;
- existen Vida, Maná, regeneración de Vida y regeneración de Maná;
- existen resistencias separadas a Fuego, Frío, Rayo y Veneno;
- Inteligencia ya aporta Maná máximo;
- Sabiduría ya aporta regeneración de Maná, potencia de efectos y resistencias;
- las fórmulas actuales no coinciden todavía con las fórmulas mágicas combinadas de la versión 1.2;
- la configuración actual admite resistencias negativas, mientras que el diseño v1.2 exige inicialmente un rango de 0 % a 75 %.

Conclusión congelada:

> La ETAPA 1 usará únicamente Fuego, Frío, Rayo y Veneno como resistencias elementales, limitadas entre 0 % y 75 %. Las fórmulas completas de Inteligencia, Sabiduría y Maná pertenecen a la ETAPA 3.

### 4.4 Jugador y progresión general

Archivos críticos revisados:

- `src/entidad/destructible/combatiente/Player.js`;
- `src/juego/progresion/SistemaProgresion.js`;
- `src/interfaz/PanelPersonaje.js`.

Estado confirmado:

- `Player` conserva nivel, experiencia general y puntos de atributo disponibles;
- no existen puntos universales de habilidad;
- no existen puntos específicos por maestría;
- no existen nivel o experiencia por maestría;
- no existen grados aprendidos ni habilidades asignadas;
- el código actual entrega un punto de atributo por nivel y dos puntos extra en niveles múltiplos de cinco;
- por tanto, actualmente los niveles 5 y 10 entregan tres puntos de atributo, en contradicción con el plan v1.2, que define exactamente uno por nivel general.

Conclusión congelada:

> La progresión de maestrías deberá agregarse en la ETAPA 4. El ajuste de puntos de atributo requiere una decisión explícita antes de esa etapa y no se modifica en la ETAPA 0.

### 4.5 Estado y persistencia

Archivo crítico revisado:

- `src/Partida/EstadoPartida.js`.

Estado confirmado:

- la misma instancia del jugador se conserva entre ciudad y mapas durante una partida;
- el estado actual mantiene jugador, ubicación y expediciones;
- no existe todavía serialización completa en disco ni un sistema general de guardar/cargar partidas;
- los futuros datos de maestrías podrán sobrevivir a transiciones de mapa si forman parte del jugador o de un componente de dominio referenciado por el estado de partida;
- la persistencia durable fuera de la sesión deberá tratarse como una capacidad distinta y no suponerse implementada.

Conclusión congelada:

> “Persistencia” en las primeras etapas significa conservar el progreso dentro de la instancia de partida y entre transiciones válidas. Cualquier guardado durable deberá verificarse o implementarse expresamente cuando corresponda.

### 4.6 Objetos, bastones y varitas

Archivos críticos revisados:

- `src/config/objetos/Armas.json`;
- `src/objetos/Objeto.js`;
- `src/objetos/FabricaObjetos.js`;
- módulos actuales de inventario y equipamiento.

Estado confirmado:

- existen bastones y varitas en el catálogo;
- son implementaciones físicas provisionales basadas en Inteligencia;
- la varita actual no consume Maná en su ataque básico;
- no existe `costoManaAtaqueBasico`;
- la varita todavía no está habilitada en la ranura secundaria;
- todavía no existe doble varita;
- el bastón conserva un ataque básico cuerpo a cuerpo;
- los cambios funcionales de catalizadores, varitas y doble varita pertenecen a la ETAPA 6.

Conclusión congelada:

> La existencia actual de bastones y varitas no implica que el sistema mágico esté implementado. Sus propiedades actuales son provisionales y deberán migrarse sin romper inventario, equipamiento, doble arma, arco ni munición.

### 4.7 Rarezas y afijos

Archivos críticos revisados:

- `src/config/objetos/Rarezas.json`;
- `src/config/objetos/afijos/Prefijos.json`;
- `src/config/objetos/afijos/Sufijos.json`;
- generadores y validadores actuales de rareza y afijos.

Estado confirmado:

- la rareza Mágica está disponible para uno o dos afijos compatibles;
- la rareza Rara mantiene peso cero y estado pendiente;
- existen conceptos preparados de daño elemental plano y resistencia elemental;
- esos afijos no deben activarse antes de existir una tubería funcional de daño elemental y fuentes enemigas correspondientes;
- la compatibilidad actual de los sufijos defensivos deberá restringirse a armaduras, escudos y accesorios cuando se activen;
- no se habilitarán daño elemental porcentual global, penetración, resistencia negativa ni estados alterados por afijos en la primera pasada.

Conclusión congelada:

> La rareza Rara permanece deshabilitada durante todo este hito salvo aprobación explícita posterior. La ETAPA 9 activará únicamente los afijos que ya posean soporte funcional y contenido jugable.

### 4.8 Interfaz

Archivos críticos revisados:

- `index.html`;
- `src/interfaz/PanelPersonaje.js`;
- `src/interfaz/MenuCreacionPersonaje.js`;
- `src/interfaz/curacion/ModalCuracion.js`;
- hojas de estilo relacionadas.

Estado confirmado:

- el panel ya muestra Vida, Maná, atributos y resistencias;
- no existe todavía un panel funcional de maestrías ni grados;
- no existe todavía una barra funcional de habilidades aprendidas;
- la interfaz reciente adopta plantillas HTML declarativas y controladores JavaScript;
- la futura interfaz debe explicar nivel y experiencia de maestría, origen de puntos, requisitos, grados, costes, Maná, alcance, bloqueos y resultados.

Conclusión congelada:

> La ETAPA 7 deberá agregar estructura HTML declarativa y mantener la lógica de interacción en módulos JavaScript, sin introducir Phaser ni bloques HTML extensos dentro del código.

## 5. Especificación funcional congelada

### 5.1 Maestrías iniciales

Se confirman cuatro maestrías mágicas activas:

1. Fuego.
2. Frío.
3. Rayo.
4. Veneno.

La arquitectura futura podrá representar categorías de magia, arma y armadura, pero en este hito solo se activarán las cuatro escuelas mágicas anteriores.

### 5.2 Doce habilidades confirmadas

| Escuela | Básica — 4 grados | Intermedia — 3 grados | Avanzada — 3 grados |
|---|---|---|---|
| Fuego | Ascua | Explosión ígnea | Incinerar |
| Frío | Esquirla de hielo | Nova de escarcha | Prisión glacial |
| Rayo | Chispa | Cadena de rayos | Descarga fulminante |
| Veneno | Aguijón tóxico | Nube tóxica | Plaga corrosiva |

Se confirma el reparto total de diez grados por escuela:

```text
4 + 3 + 3
```

No se agregará una cuarta habilidad activa por escuela dentro de este hito.

### 5.3 Requisitos de aprendizaje

Valores iniciales congelados y configurables:

- habilidad básica: nivel de maestría 0;
- habilidad intermedia: nivel de maestría 3;
- habilidad avanzada: nivel de maestría 6.

Alcanzar el requisito solamente habilita la inversión. La habilidad permanece en grado 0 hasta gastar un punto y aprende el grado 1 con esa inversión.

### 5.4 Puntos y experiencia

Modelo congelado:

- el personaje comienza en nivel 1 con un punto universal de habilidad;
- cada nivel general entrega un punto de atributo y un punto universal de habilidad;
- cada maestría posee experiencia y nivel independientes;
- cada subida de nivel de maestría entrega un punto específico de esa escuela;
- un punto universal puede gastarse en cualquier habilidad cuyo requisito esté cumplido;
- un punto específico solo puede gastarse dentro de la maestría que lo generó;
- los puntos pueden guardarse y no caducan;
- no existe respecialización en la primera versión;
- la experiencia sobrante se conserva al subir de nivel;
- una ejecución válida concede experiencia de maestría una sola vez, no por objetivo ni por tick.

### 5.5 Eliminación del modelo anterior de 100 puntos

El modelo vigente no utiliza una cifra abstracta de cien puntos de maestría, umbrales 10/40/70 ni distribuciones como 70/30 o 50/50.

Los puntos se gastan directamente en grados explícitos de habilidades. El nivel de maestría se obtiene mediante experiencia de uso y se utiliza para habilitar requisitos y entregar puntos específicos; no agrega un multiplicador abstracto de daño.

La versión 1.0 del documento conservada fuera del repositorio contiene el modelo antiguo, pero queda expresamente reemplazada por la versión 1.2 y no es fuente de verdad para la implementación.

## 6. Registro de decisiones

### 6.1 Aceptadas y congeladas

| ID | Decisión | Estado |
|---|---|---|
| D-001 | `main` coincide con el commit informado `c0bd3d16...`. | Aceptada |
| D-002 | La magia extiende combate y tiempo actuales; no crea sistemas paralelos. | Aceptada |
| D-003 | Tipos de daño del hito: físico, fuego, frío, rayo y veneno. | Aceptada |
| D-004 | No existe daño mágico o arcano genérico en este hito. | Aceptada |
| D-005 | Resistencias elementales iniciales entre 0 % y 75 %. | Aceptada; requiere código en ETAPA 1 |
| D-006 | Cuatro maestrías: Fuego, Frío, Rayo y Veneno. | Aceptada |
| D-007 | Doce habilidades y reparto 4/3/3. | Aceptada |
| D-008 | Requisitos iniciales de nivel de maestría 0/3/6. | Aceptada |
| D-009 | Puntos universales y específicos se gastan directamente en grados. | Aceptada |
| D-010 | Se descarta el modelo abstracto anterior de 100 puntos. | Aceptada |
| D-011 | Rareza Rara deshabilitada. | Aceptada |
| D-012 | Plantillas HTML declarativas; controladores JavaScript sin bloques HTML extensos. | Aceptada |
| D-013 | Sin Phaser. | Aceptada |
| D-014 | Balance, costes, grados y umbrales deben residir en JSON o configuración central. | Aceptada |

### 6.2 Diferencias registradas con acción futura definida

| ID | Diferencia | Acción congelada |
|---|---|---|
| R-001 | El código permite resistencias desde −50 %, pero v1.2 exige 0–75 %. | ETAPA 1 deberá cambiar el límite inferior a 0 y validar 0/25/75. |
| R-002 | Daño actual representado como `danioFisico`, sin componentes elementales. | ETAPA 1 deberá introducir componentes tipados conservando compatibilidad física. |
| R-003 | Inteligencia y Sabiduría no siguen todavía las fórmulas combinadas del plan. | ETAPA 3 deberá centralizar y aplicar las fórmulas v1.2. |
| R-004 | Varitas actuales son armas físicas sin consumo de Maná ni ranura secundaria. | ETAPA 6 deberá migrarlas al contrato de catalizador y ataque básico mágico. |
| R-005 | Los afijos elementales preparados no poseen todavía soporte completo. | ETAPA 9 deberá activarlos solo después de daño elemental y fuentes enemigas. |
| R-006 | No hay maestrías, puntos de habilidad ni grados en `Player`. | ETAPA 4 deberá agregarlos mediante un modelo genérico y persistente en partida. |
| R-007 | No hay motor general de efectos temporales. | ETAPA 2 deberá incorporarlo sobre el reloj actual. |

### 6.3 Decisiones pendientes

#### P-001 — Puntos de atributo adicionales

Situación:

- v1.2 define exactamente un punto de atributo por nivel general;
- el código actual entrega además dos puntos extra en niveles múltiplos de cinco.

Recomendación:

- alinear la progresión con v1.2 y eliminar la bonificación extra cuando se implemente la entrega de puntos universales;
- no realizar el cambio dentro de ETAPA 1, porque no pertenece al modelo elemental;
- resolver formalmente antes de ETAPA 4.

Estado: **pendiente de aprobación funcional**.

#### P-002 — Coste temporal de doble arma y doble varita

Situación:

- el código actual usa el coste del arma más lenta más 30 % del arma más rápida;
- v1.2 describe el coste de la principal más 30 % del coste de la secundaria.

Recomendación:

- unificar todas las combinaciones en “principal + 30 % de secundaria”, porque conserva identidad de ranuras y evita una excepción exclusiva de varitas;
- verificar impacto sobre doble arma física antes de modificar el contrato.

Estado: **pendiente de aprobación funcional antes de ETAPA 6**.

#### P-003 — Persistencia durable

Situación:

- el estado del jugador persiste entre mapas dentro de una partida;
- no se confirmó un guardado/cargado durable completo desde almacenamiento.

Recomendación:

- distinguir en criterios futuros “persistencia en sesión” de “serialización durable”;
- no prometer guardado durable hasta verificar o implementar explícitamente ese flujo.

Estado: **pendiente de definición de alcance para ETAPA 4**.

## 7. Contratos que deberá respetar la ETAPA 1

La ETAPA 1 — Modelo de daño elemental y resistencias deberá partir de estos contratos:

1. Mantener una única tubería de combate.
2. Representar daño mediante componentes tipados.
3. Soportar, como mínimo, `fisico`, `fuego`, `frio`, `rayo` y `veneno`.
4. No crear `magico`, `arcano` ni una quinta resistencia elemental.
5. Conservar el comportamiento actual de ataques físicos, armas por mano, crítico, bloqueo, Armadura, munición, muerte y mensajes.
6. Aplicar Armadura únicamente al componente físico.
7. Aplicar la resistencia correspondiente a cada componente elemental.
8. Limitar resistencias inicialmente entre 0 % y 75 %.
9. Mantener compatibilidad temporal con los consumidores actuales de `estadisticasDerivadas.danioFisico` o migrarlos de forma atómica dentro de la etapa.
10. Centralizar nombres de tipos, límites y reglas en configuración o constantes de dominio.
11. No implementar efectos temporales, habilidades, maestrías, catalizadores, afijos activos ni interfaz de habilidades.
12. No activar objetos Raros.

Archivos que probablemente requerirán revisión o modificación en ETAPA 1:

- `src/config/ConfiguracionCombate.js`;
- `src/entidad/destructible/combatiente/EstadisticasDerivadas.js`;
- `src/juego/combate/SistemaCombate.js`;
- `src/entidad/destructible/Destructible.js`;
- `src/entidad/destructible/combatiente/Combatiente.js`;
- módulos de registro o interfaz que hoy asuman un único número de daño;
- pruebas automatizadas nuevas, si se incorpora un ejecutor mínimo dentro del alcance aprobado.

La lista es orientativa. Antes de ETAPA 1 deberá repetirse la revisión de `main` y confirmarse el diff desde este SHA.

## 8. Validaciones realizadas

### 8.1 Historial y commit

- comparación del HEAD visible de `main` con el SHA informado;
- apertura del commit por SHA completo;
- revisión del parche inmutable del último commit;
- identificación de fecha, mensaje, archivos y propósito del cambio.

Resultado: **cumplido**.

### 8.2 Revisión estática

Se revisaron los contratos críticos de:

- combate físico;
- estadísticas derivadas;
- recursos y resistencias;
- agenda temporal y pulsos;
- jugador y progresión;
- estado de partida;
- armas, bastones y varitas;
- rarezas y afijos;
- interfaz y plantillas HTML.

Resultado: **cumplido para la ETAPA 0**.

### 8.3 Imports, rutas y referencias obsoletas

La ETAPA 0 no modifica imports ni rutas. No se agregaron referencias ejecutables.

Se verificó conceptualmente que los archivos inventariados pertenecen a la estructura visible del commit congelado. Al no existir cambios de código, no se introduce ninguna referencia obsoleta nueva.

Resultado: **cumplido para el cambio documental**.

### 8.4 Pruebas automatizadas y navegador

No se ejecutaron pruebas automatizadas ni prueba de humo en navegador porque:

- la etapa no modifica código funcional;
- no se obtuvo una copia local ejecutable del repositorio en el entorno de revisión;
- el entorno no pudo resolver el dominio de GitHub al intentar clonar;
- la raíz visible del repositorio no muestra un `package.json` ni un ejecutor automático de pruebas.

Resultado: **no aplicable al cambio funcional; limitación registrada**.

### 8.5 Búsqueda del modelo anterior de 100 puntos

Se revisaron los archivos críticos y se intentaron búsquedas públicas por:

- `100 puntos`;
- `puntosMaestria`;
- `10/40/70`;
- `maestria`.

No se encontraron referencias activas en los archivos críticos revisados. La búsqueda exhaustiva de todo el árbol no pudo completarse porque:

- el clon local falló por resolución DNS;
- la búsqueda de código de GitHub exige autenticación.

Para cerrar la comprobación exhaustiva en una copia local del repositorio deberá ejecutarse:

```bash
rg -n -i \
  --glob '!docs/magia/ETAPA_0_REVALIDACION_ESPECIFICACION.md' \
  '(100\s+puntos|puntos?\s+de\s+maestr[ií]a|puntosMaestria|10/40/70|70/30|50/50|25.?x.?4)'
```

Resultado actual: **sin referencias encontradas en el conjunto revisado; comprobación exhaustiva local pendiente**.

## 9. Confirmación de no adelanto

El cambio de ETAPA 0 agrega únicamente este documento.

No se implementaron:

- componentes de daño elemental;
- mitigación elemental funcional;
- motor de efectos;
- fórmulas mágicas de atributos;
- maestrías, experiencia o puntos de habilidad;
- motor de habilidades;
- cambios en bastones o varitas;
- doble varita;
- panel de maestrías ni barra funcional;
- enemigos o afijos elementales activos;
- habilidades básicas, intermedias o avanzadas;
- balance 1–10;
- rareza Rara;
- Phaser.

## 10. Criterios de aceptación

| Criterio | Estado | Evidencia o pendiente |
|---|---|---|
| Identificar HEAD, fecha y mensaje | Cumplido | Sección 1 |
| Comparar con commit informado | Cumplido | Coincidencia exacta |
| Revisar subsistemas críticos | Cumplido | Sección 4 |
| Registrar decisiones aceptadas, modificadas y pendientes | Cumplido | Sección 6 |
| Confirmar cuatro maestrías y doce habilidades | Cumplido | Sección 5 |
| Confirmar reparto 4/3/3 | Cumplido | Sección 5.2 |
| Confirmar puntos universales y específicos | Cumplido | Sección 5.4 |
| Identificar contratos de ETAPA 1 | Cumplido | Sección 7 |
| No modificar código ni balance | Cumplido | Único archivo documental |
| No adelantar etapas futuras | Cumplido | Sección 9 |
| Eliminar referencias al modelo anterior de 100 puntos | Parcial | No existen en archivos críticos; falta `rg` exhaustivo local |
| Ejecutar pruebas disponibles | No aplicable/limitado | Sin cambio funcional y sin copia local ejecutable |
| Actualizar memoria del proyecto | Debe confirmarse en la entrega del asistente | No es una operación del repositorio |

## 11. Riesgos abiertos

1. **Búsqueda no exhaustiva:** puede existir una referencia textual al modelo de cien puntos fuera de los archivos críticos revisados.
2. **Puntos de atributo:** la bonificación actual de niveles 5 y 10 contradice el plan v1.2.
3. **Resistencias negativas:** la configuración actual admite un rango no permitido por el diseño congelado.
4. **Doble empuñadura:** el contrato temporal actual no coincide con la formulación principal/secundaria de doble varita.
5. **Persistencia:** conservar una instancia entre mapas no equivale a guardar/cargar durablemente.
6. **Regresión física:** ETAPA 1 tocará una tubería central y deberá proteger arco, munición, doble arma, bloqueo, Armadura, destructibles, IA y jefe.
7. **Activación prematura de afijos:** resistencias y daño elemental local no deben entrar en el botín antes de contar con soporte y fuentes reales.

## 12. Resultado de la etapa

La ETAPA 0 queda implementada como congelamiento documental sobre:

```text
main @ c0bd3d16cbc83a1b9c4f9fff3753e63043f45cd4
```

No se realizó commit.

La próxima etapa del plan es:

```text
ETAPA 1 — Modelo de daño elemental y resistencias
```

Antes de iniciarla deben cumplirse dos acciones:

1. verificar nuevamente el HEAD de `main` después de incorporar este documento;
2. decidir si el criterio de “toda diferencia resuelta antes de ETAPA 1” exige resolver inmediatamente P-001, P-002 y P-003 o si se acepta mantenerlas registradas hasta la etapa que las afecta.

## 13. Mensaje de Conventional Commit propuesto

```text
docs(magia): congelar especificación del sistema de maestrías
```

Cuerpo opcional:

```text
- registrar main en c0bd3d16 como referencia oficial
- inventariar contratos actuales de combate, tiempo, progreso y objetos
- congelar cuatro escuelas, doce habilidades y grados 4/3/3
- documentar divergencias y dependencias de la etapa elemental
```

## 14. Bloque de continuidad para el siguiente chat

```text
DARK MOON — CONTINUIDAD DEL HITO DE MAGIA, HABILIDADES Y MAESTRÍAS

Documento rector:
Plan_Maestro_Magia_Habilidades_Maestrias_Dark_Moon_v1.2.docx

Etapa completada:
ETAPA 0 — Revalidación y congelamiento de especificación.

Referencia oficial congelada:
Rama main @ c0bd3d16cbc83a1b9c4f9fff3753e63043f45cd4
Commit: refactor(interfaz): extraer plantillas HTML de creación y curación
Fecha: 23 de julio de 2026, 20:07:22 UTC−03:00.

Cambio realizado:
Se agregó únicamente docs/magia/ETAPA_0_REVALIDACION_ESPECIFICACION.md.
No se modificó código, JSON, HTML, CSS ni balance. No se realizó commit.

Decisiones congeladas:
- Cuatro maestrías: Fuego, Frío, Rayo y Veneno.
- Tres habilidades por escuela, con grados 4 + 3 + 3.
- Habilidades:
  Fuego: Ascua, Explosión ígnea, Incinerar.
  Frío: Esquirla de hielo, Nova de escarcha, Prisión glacial.
  Rayo: Chispa, Cadena de rayos, Descarga fulminante.
  Veneno: Aguijón tóxico, Nube tóxica, Plaga corrosiva.
- Requisitos iniciales de nivel de maestría: 0/3/6.
- Nivel 1: un punto universal inicial.
- Cada nivel general: un punto de atributo y un punto universal.
- Cada nivel de maestría: un punto específico de su escuela.
- Los puntos se gastan directamente en grados; queda descartado el modelo abstracto de 100 puntos.
- Tipos del hito: físico, fuego, frío, rayo y veneno. No hay daño arcano genérico.
- Resistencias iniciales: 0 % a 75 %, sin penetración ni valores negativos.
- Rareza Rara deshabilitada.
- Magia integrada a combate y tiempo existentes; no subsistema paralelo.
- HTML declarativo y controladores JavaScript; no bloques HTML extensos dentro de JS.
- No Phaser.

Divergencias registradas:
1. El código actual entrega dos puntos extra de atributo en niveles 5 y 10; v1.2 exige uno por nivel. Decisión pendiente antes de ETAPA 4.
2. El código admite resistencias desde −50 %; ETAPA 1 debe llevar el mínimo a 0 %.
3. El coste dual actual usa arma más lenta + 30 % de la más rápida; v1.2 describe principal + 30 % de secundaria. Decisión pendiente antes de ETAPA 6.
4. EstadoPartida conserva la instancia en sesión, pero no se confirmó guardado durable.
5. Los afijos elementales están preparados pero no deben activarse hasta ETAPA 9.

Limitación de validación:
No pudo clonarse el repositorio por fallo de resolución DNS y GitHub exige autenticación para búsqueda de código. No se encontraron referencias al modelo de 100 puntos en los archivos críticos revisados, pero queda pendiente ejecutar un rg exhaustivo local.

Próxima etapa:
ETAPA 1 — Modelo de daño elemental y resistencias.
Antes de implementarla, revisar main nuevamente, comparar contra el SHA congelado y presentar plan para aprobación explícita.
```
