# PLAN MAESTRO — HABILIDADES PASIVAS Y MODIFICADORES CANÓNICOS

**Proyecto:** Dark Moon
**Hito:** Habilidades pasivas
**Idioma obligatorio:** Español para código nuevo, nombres técnicos nuevos, comentarios, documentación y configuraciones nuevas.
**Fuente de verdad de implementación:** el repositorio real entregado al iniciar cada etapa.
**Estado:** Plan maestro rector. HP0 quedó documentada y HP1, HP2, HP3, HP4, HP5 y HP6 están cerradas. HP4 quedó cerrada por el usuario en `70f78115dffe96a223128b5cffbbab0ef58024ce`, HP5 en `bc33b5d90f8ea8d451a80b594bde9889cf9bfbdc` y HP6 quedó cerrada documentalmente tras la validación manual satisfactoria informada por el usuario el 18/08/2026. El hito de habilidades/pasivas continúa completado. Posteriormente se aprobó `HP-AUD`, una auditoría extraordinaria post-hito sin crear HP7; sus tres correcciones acotadas están implementadas sobre `e47d2caef9257e64cd663fc8bbc49852b19f163e` y quedan pendientes únicamente de validación manual antes del cierre documental definitivo de la auditoría.

---

## 1. PROPÓSITO

Este Plan Maestro guía la incorporación de habilidades pasivas a Dark Moon sin crear un motor paralelo de reglas ni introducir excepciones específicas por habilidad, aura, maldición, objeto o nombre visible.

El objetivo no es únicamente agregar tres pasivas concretas. El hito debe dejar una infraestructura canónica y extensible capaz de soportar posteriormente muchas fuentes de modificación sobre estadísticas, combate y habilidades.

La evolución buscada es:

**Habilidad aprendida / efecto temporal / equipo → modificador declarativo → cálculo canónico existente → resultado canónico → interfaz o Phaser representa el resultado.**

Las pasivas deben compartir el mismo sistema de progresión de habilidades y los mismos puntos universales/específicos que las habilidades activas. No debe existir un `SistemaPasivasJugador` independiente que duplique progresión, persistencia o reglas.

Las auras y maldiciones deben considerarse hermanas temporales de las pasivas:

- una **pasiva** aporta modificadores mientras esté aprendida y se cumplan sus condiciones; en este hito las pasivas pertenecen al jugador salvo decisión futura explícita;
- una **aura** aporta modificadores positivos mientras su efecto temporal permanezca activo;
- una **maldición** aporta modificadores negativos mientras su efecto temporal permanezca activo;
- auras y maldiciones deben poder modificar a **cualquier combatiente afectado**, incluido un enemigo, sin crear un resolutor separado para enemigos;
- un **afijo global de equipo** aporta modificadores mientras el objeto correspondiente esté equipado;
- un **afijo local de objeto** continúa modificando únicamente al objeto que lo contiene.

El resolutor general se diseña para **combatientes**, no exclusivamente para el jugador. La fuente del modificador puede diferir por entidad: el jugador puede aportar pasivas, equipo y efectos temporales; un enemigo puede no tener pasivas propias y aun así recibir auras, maldiciones u otros efectos que modifiquen sus valores canónicos.

---

## 2. PRINCIPIOS RECTORES

### 2.1. Una sola lógica canónica

Todo el hito debe respetar:

- una sola lógica canónica;
- un solo estado real;
- un solo cálculo de movimiento;
- un solo cálculo de combate;
- una sola resolución de muerte;
- una sola entrega de experiencia;
- una sola entrega de botín;
- una sola persistencia;
- datos configurables;
- integración genérica;
- ausencia de excepciones por nombre visible.

Phaser representa resultados. HTML/CSS representa paneles, tooltips y estados. Ninguna capa visual debe recalcular estadísticas o habilidades.

### 2.2. No existe un sistema por atributo

No deben crearse sistemas independientes del tipo:

```text
SistemaEvasion
SistemaAlcance
SistemaCritico
SistemaArmadura
SistemaPotencia
...
```

Las ecuaciones canónicas actuales continúan siendo responsables de calcular sus valores base.

Debe existir un único contrato de objetivos modificables y un único resolutor genérico de modificadores.

Conceptualmente:

```text
Ecuación canónica
  ↓
calcula valor base
  ↓
resolver(OBJETIVO_CANONICO, base, contexto)
  ↓
valor modificado
  ↓
aplicar límites/redondeos propios de la regla
  ↓
resultado canónico
```

### 2.3. Una habilidad no modifica código

Una pasiva, aura, maldición o afijo global no debe contener lógica específica dentro de `SistemaCombate`, `EstadisticasDerivadas`, escenas Phaser o paneles.

Debe declarar únicamente:

- qué objetivo modifica;
- qué operación utiliza;
- qué valor aporta;
- qué condición debe cumplirse;
- de qué fuente proviene.

Está prohibido resolver contenido mediante condiciones equivalentes a:

```text
si tiene Ojo de halcón...
si tiene Armadura ligera...
si tiene Aura de precisión...
si objeto es X...
```

### 2.4. Sin nombres visibles como contrato

Los nombres traducibles sirven únicamente para presentación.

La lógica debe trabajar con IDs y claves canónicas estables.

Ejemplo:

```text
ojo_halcon
alcanceAtaque
arco
```

Nunca con:

```text
"Ojo de halcón"
"Alcance"
"Arco corto"
```

### 2.5. No crear un lenguaje ejecutable dentro del JSON

Las configuraciones pueden declarar datos, operaciones y condiciones soportadas por contratos canónicos.

No deben introducir:

- `eval`;
- funciones serializadas;
- expresiones JavaScript en texto;
- fragmentos de código dentro de JSON;
- callbacks configurables arbitrarios.

La extensibilidad se obtiene ampliando contratos explícitos, no ejecutando código proveniente de configuración.

---

## 3. ESTADO HEREDADO RELEVANTE

Al redactar HP0, el repositorio real dispone de estas bases aprovechables:

- `ProgresoMagicoJugador` conserva puntos universales, puntos específicos, niveles de maestría, experiencia y grados de habilidad;
- `mejorarHabilidad()` ya valida requisitos y consumo de puntos;
- la progresión actual está restringida conceptualmente y por validación a las maestrías mágicas existentes;
- `PanelHabilidadesMaestrias` ya muestra familias Mágicas, Básicas, Armas y Armaduras, aunque Armas y Armaduras todavía no poseen progresión funcional;
- antes de HP2, `PercepcionJugador` poseía un mini-resolutor propio; HP2 lo elimina y traslada Percepción al centralizador común;
- `SistemaEfectosTemporales` ya conserva duración, acumulación, renovación y eliminación de efectos;
- los efectos temporales actuales pueden modificar factores temporales, pero todavía no forman un sistema general de modificadores de estadísticas/habilidades;
- `SistemaAfijos` ya genera prefijos/sufijos mediante propiedades, operaciones, grados, pesos y compatibilidades sin depender del nombre visible;
- los catálogos actuales mezclan afijos locales del objeto con afijos que repercuten sobre estadísticas del portador;
- la persistencia de progreso actual espera las maestrías y habilidades conocidas por la configuración; para este hito se parte explícitamente de **cero partidas guardadas previas**, por lo que HP1 puede adoptar directamente el esquema nuevo sin migraciones, parches ni compatibilidad retroactiva.

El hito debe aprovechar estas piezas. No debe reemplazarlas por motores paralelos cuando sea posible generalizarlas.

### 3.1. Estado actual tras HP1

HP1 reemplazó la progresión exclusivamente mágica por el contrato general vigente:

- `ProgresoHabilidadesJugador` es la única fuente de puntos, niveles de maestría, experiencia y grados de habilidad;
- `ContextoProgresoHabilidades` carga y valida los catálogos generales;
- `ValidadorConfiguracionProgresoHabilidades` acepta categorías, maestrías y cantidades de habilidades configurables sin conocer una lista fija de elementos;
- `src/config/habilidades/Maestrias.json` y `src/config/habilidades/Habilidades.json` son las ubicaciones canónicas generales;
- cada habilidad declara `tipo: activa | pasiva`;
- las pasivas pueden progresar, pero no poseen ejecución directa, no pueden asignarse a la barra y no requieren perfil visual de ejecución;
- el panel obtiene categorías y maestrías desde configuración y admite categorías vacías sin placeholders de negocio codificados;
- la persistencia utiliza `progresoHabilidades` y versiones nuevas, sin migración ni aliases del esquema anterior;
- no sobreviven wrappers, configuraciones ni clases productivas de `ProgresoMagicoJugador`;
- las doce habilidades actuales continúan declaradas como activas; las maestrías físicas y el catálogo amplio de pasivas permanecen deliberadamente pendientes para HP3.


### 3.2. Estado actual tras la auditoría e implementación de HP2

HP2 confirmó que el motor de modificadores debe pertenecer al concepto general de `Combatiente` y no al jugador, a una pasiva concreta ni a una familia de contenido.

La regla arquitectónica cerrada es:

> **Todo valor declarado como objetivo modificable del combatiente debe obtener su valor final mediante `SistemaModificadoresCombatiente` antes de ser consumido por combate, movimiento, tiempo, percepción, habilidades o interfaz. Ningún consumidor puede volver a aplicar pasivas, afijos del portador, efectos temporales, terreno, zonas, auras o maldiciones por su cuenta.**

Regla complementaria:

> **Las propiedades locales de los objetos se resuelven dentro del objeto y pueden formar parte del valor base utilizado por el combatiente. Un modificador dirigido al portador nunca se fusiona con esas propiedades locales.**

HP2 deja como implementación canónica:

```text
src/juego/modificadores/ContratosModificadoresCombatiente.js
src/juego/modificadores/SistemaModificadoresCombatiente.js
```

El mismo sistema es propiedad de `Combatiente`, por lo que sirve tanto para `Player` como para `Enemigo`.

Fuentes canónicas ya contempladas por el contrato:

- afijos `portador` del equipo actual;
- efectos temporales vigentes;
- terreno consultado en la casilla actual;
- zonas temporales que contengan al actor;
- modificadores iniciales declarativos del combatiente, utilizados actualmente por variantes enemigas cuando afectan objetivos registrados;
- proveedores futuros como pasivas, auras, maldiciones y otras fuentes declarativas equivalentes.

El origen no decide la matemática. Cada fuente entrega descriptores al mismo resolutor.

Ejemplo de terreno futuro:

```text
Terreno lodoso
objetivo: factorMovimiento
operacion: multiplicar
valor: 1.50
origen: terreno
```

Mientras el actor permanezca sobre esa casilla, el terreno participa de la resolución. Al salir, la fuente deja de existir porque se consulta desde el estado espacial real; no se copia un estado persistente `ralentizadoPorBarro` al combatiente.

Una zona puede, según su diseño:

- aportar un modificador directo mientras el actor está dentro;
- aplicar un efecto temporal, como ocurre conceptualmente con una nube tóxica que envenena;
- hacer ambas cosas si un contenido futuro lo requiere.

Si cualquiera de esas consecuencias modifica un objetivo registrado, la composición numérica final pertenece al centralizador.

#### 3.2.1. Percepción

`PercepcionJugador` se elimina como mini-resolutor paralelo.

La Percepción del jugador conserva base 10 y la de los enemigos conserva su base de configuración, pero ambas siguen ahora el mismo flujo:

```text
base de Percepción
  ↓
SistemaModificadoresCombatiente
  ↓
Percepción final
  ↓
visibilidad / IA / persecución
```

#### 3.2.2. Factores temporales

Los efectos temporales ya no recalculan ni escriben factores finales sobre el combatiente. Exponen sus multiplicadores como fuentes y el centralizador realiza la composición.

Esto conserva el comportamiento multiplicativo real existente:

```text
1 × 1.40 × 1.60 = 2.24
```

No se posterga esta centralización a HP4.

#### 3.2.3. Variantes enemigas

La auditoría detectó que Enfermo, Gigante y Élite ya eran fuentes reales de modificaciones antes de HP2.

Se clasifican así:

- multiplicador de Vida máxima: fuente canónica de `vidaMaxima`;
- multiplicadores temporales: fuentes canónicas de los factores correspondientes;
- multiplicador de atributos primarios: permanece por ahora en la construcción base del enemigo, porque los seis atributos requieren una decisión posterior explícita;
- multiplicador de experiencia otorgada: permanece fuera del motor de modificadores del combatiente porque pertenece al dominio de recompensas.

Las variantes temporales históricamente multiplicaban y redondeaban inmediatamente antes de que actuaran efectos temporales posteriores. Para no cambiar balance, esa semántica se convirtió en una operación explícita del centralizador y no en una excepción externa.

#### 3.2.4. Persistencia

HP2 adopta esquema de jugador `v3`, sin migración de estados anteriores.

Los objetos persisten sus fuentes canónicas:

- plantilla/ID;
- cantidad;
- rareza;
- nivel de objeto;
- prefijos;
- sufijos;
- contenido cuando corresponde.

No se persisten propiedades locales derivadas como una segunda fuente de verdad. Al cargar:

```text
plantilla + afijos local_objeto
  ↓
FabricaObjetos
  ↓
propiedades locales reconstruidas
```

Los efectos `portador` tampoco se guardan como estadísticas calculadas; reaparecen naturalmente al consultar el equipo reconstruido.

#### 3.2.5. Afijos y presentación

Cada efecto de afijo declara obligatoriamente:

```text
ambito: local_objeto
```

o:

```text
ambito: portador
```

Un afijo `portador` continúa siendo parte visible del objeto que constituye su fuente.

Ejemplo de varita:

```text
Potencia propia de la varita: 12
Afijo Enfocado: +4 Potencia de habilidad
```

Internamente no se transforma la propiedad local de la varita en 16. Equipada, la potencia intrínseca 12 forma el valor base y el +4 del afijo participa como fuente `portador`; el valor final 16 lo obtiene el centralizador. El tooltip puede mostrar el afijo y su valor, pero la interfaz no recalcula la estadística final.


---

## 4. PROGRESIÓN GENERAL DE HABILIDADES

### 4.1. Generalización obligatoria

La progresión deja de estar conceptualmente limitada a magia.

`ProgresoMagicoJugador` debe evolucionar a un único sistema general equivalente a:

```text
ProgresoHabilidadesJugador
```

La generalización reemplaza al sistema anterior. No deben convivir dos progresiones independientes.

El nuevo sistema conserva:

- puntos universales;
- puntos específicos por maestría;
- nivel de maestría;
- experiencia de maestría;
- grado de habilidad;
- requisitos de nivel de maestría;
- grados máximos configurables;
- validación de que un punto específico solo se utilice dentro de su maestría.

### 4.2. Configuración

Las definiciones generales de maestrías y habilidades deben salir del directorio conceptual exclusivo de magia.

Dirección aprobada:

```text
src/config/habilidades/Maestrias.json
src/config/habilidades/Habilidades.json
```

La ubicación de configuraciones exclusivamente mágicas, como efectos elementales específicos, no debe cambiar solo por uniformidad si no existe necesidad real.

### 4.3. Tipos de habilidad

Cada habilidad debe declarar un tipo canónico como mínimo:

```text
activa
pasiva
```

Una habilidad pasiva:

- puede tener grados;
- puede consumir puntos universales o específicos;
- puede requerir nivel de maestría;
- no tiene ejecución directa;
- no consume una acción por activación;
- no debe poder asignarse a la barra como habilidad ejecutable;
- deriva sus modificaciones de su definición y grado aprendido.

Una habilidad activa conserva el flujo actual de ejecución.

### 4.4. Familias y maestrías físicas

El contrato general debe permitir incorporar maestrías de armas y armaduras sin modificar validadores cada vez que aparezca una nueva familia.

Las familias visuales ya anticipadas en la interfaz deben poder estar respaldadas por datos configurables:

- Mágicas;
- Básicas;
- Armas;
- Armaduras;
- futuras categorías que utilicen el mismo contrato.

No deben fijarse en código cantidades exactas de maestrías, habilidades por maestría o secuencias de grados salvo que una regla funcional lo exija realmente.

---

## 5. CONTRATO CANÓNICO DE MODIFICADORES

### 5.1. Registro único de objetivos modificables

La fuente única de verdad quedó implementada en:

```text
src/juego/modificadores/ContratosModificadoresCombatiente.js
```

HP2 auditó estadísticas de jugador y enemigos, ataques y armas, armaduras, escudos, quiver, recursos, regeneraciones, resistencias, crítico, bloqueo, precisión/evasión, alcance, percepción, economía temporal, efectos, terreno/zonas, equipamiento, afijos, variantes enemigas y persistencia.

El resultado no es una lista de "todos los números del juego". Cada variable auditada queda explícitamente en una de cuatro categorías para distinguir una ausencia deliberada de un olvido.

#### Implementados y conectados en HP2

```text
vidaMaxima
manaMaximo
regeneracionVida
regeneracionMana
precision
evasion
armadura
probabilidadCritico
multiplicadorCritico
probabilidadBloqueo
mitigacionBloqueo
potenciaEfectos
potenciaHabilidad
resistenciaFuego
resistenciaFrio
resistenciaRayo
resistenciaVeneno
resistenciaCongelamiento
resistenciaAturdimiento
resistenciaEnvenenamiento
resistenciaQuemadura
alcanceAtaque
percepcion
factorTiempo
factorMovimiento
factorAtaque
factorAccion
factorConsumo
multiplicadorDanioFuente
```

Cada uno dispone de un consumidor canónico real y su valor final pasa por `SistemaModificadoresCombatiente`.

`multiplicadorDanioFuente` cubre, entre otros casos, el factor de cada mano en un ataque dual. La penalización base de la mano secundaria permanece en el contrato de ataque, pero una futura pasiva puede modificar ese factor mediante contexto sin introducir un `if` específico dentro del combate.

#### Incorporados en HP4

HP4 cierra la auditoría de los parámetros internos que ya poseen consumidor real. En vez de crear un objetivo global distinto para cada campo, el centralizador incorpora dos objetivos canónicos:

```text
danoHabilidad
atributoHabilidad
```

`danoHabilidad`
: representa el daño base interno de una habilidad antes de escalado mágico, crítico y defensas. El contexto permite distinguir maestría, tipo de daño y fase (`impacto_directo`, `efecto_periodico` o `zona`).

`atributoHabilidad`
: representa un atributo interno numérico validado de la configuración efectiva de una habilidad. Todo descriptor dirigido a este objetivo debe declarar explícitamente la condición `atributoHabilidad`; una clave desconocida produce error.

El registro productivo de atributos internos queda formado por:

| Atributo | Significado | Unidad/semántica | Consumidor canónico |
|---|---|---|---|
| `costoMana` | Maná consumido por una ejecución confirmada | puntos de Maná | validación/consumo de habilidad |
| `costoTemporal` | tiempo base propio de la habilidad antes de factores globales | unidades de `SistemaTiempo` | resolución temporal de la acción |
| `alcance` | distancia máxima al centro/objetivo seleccionado | casillas | geometría/selección |
| `radioImpacto` | radio de una forma de impacto radial | casillas | geometría radial |
| `longitudLinea` | longitud máxima de una forma lineal | casillas | geometría lineal |
| `anchoLinea` | ancho transversal de una forma lineal | casillas | geometría lineal |
| `cantidadObjetivos` | máximo de objetivos distintos de una cadena | cantidad entera | geometría de cadena |
| `alcanceSalto` | distancia máxima entre saltos consecutivos | casillas | geometría de cadena |
| `factorDanioPorSalto` | factor aplicado al daño de saltos posteriores | multiplicador | daño de cadena |
| `probabilidadEfecto` | probabilidad base de aplicar un efecto | porcentaje 0–100 | `SistemaEfectosTemporales` |
| `duracionEfecto` | duración de una instancia temporal | unidades de `SistemaTiempo` | `SistemaEfectosTemporales` |
| `intervaloEfecto` | separación entre ticks de un efecto periódico | unidades de `SistemaTiempo` | agenda de efectos |
| `maximoAcumulacionesEfecto` | tope de intensidad/cantidad de un efecto acumulable | cantidad | acumulación temporal |
| `incrementoAcumulacionEfecto` | incremento aportado por una reaplicación acumulable | cantidad | acumulación temporal |
| `magnitudModificadorEfecto` | magnitud de un descriptor numérico aportado por un efecto | depende del objetivo | `SistemaModificadoresCombatiente` |
| `duracionZona` | duración de una zona temporal estática | unidades de `SistemaTiempo` | `SistemaZonasTemporales` |
| `intervaloZona` | separación entre activaciones periódicas de zona | unidades de `SistemaTiempo` | `SistemaZonasTemporales` |
| `radioAura` | radio de una emisión móvil alrededor de su emisor | casillas | coordinador espacial de auras |

Estos nombres y significados también están comentados junto al registro productivo en `src/juego/habilidades/ContratosAtributosHabilidad.js`. `ConfiguracionHabilidadEfectiva` resuelve un snapshot derivado y congelado para la ejecución/vista previa sin modificar `Habilidades.json` ni persistir resultados.

#### Reservados a corto plazo

La auditoría identificó dos campos especialmente probables para habilidades de arco y proyectiles:

```text
cantidadProyectiles
maximoProyectilesSimultaneos
```

- `cantidadProyectiles`: número de proyectiles generados por una única ejecución;
- `maximoProyectilesSimultaneos`: tope de proyectiles de esa misma fuente que pueden coexistir en el mundo.

Se consideran **candidatos de corto plazo**, por ejemplo para Disparo múltiple, Abanico de proyectiles o Lluvia de flechas. Están documentados y comentados en código como reservados, pero no forman parte del registro productivo hasta que exista un consumidor canónico real.

#### Pendientes de decisión explícita en una etapa posterior

La auditoría mantiene como candidatos que no deben incorporarse automáticamente:

```text
fuerza
destreza
constitucion
inteligencia
sabiduria
carisma
potenciaAura
multiplicadorDanioMagico
danoFisicoGlobal
danoElementalGlobal
danoHechizosGlobal
probabilidades globales especiales de estados
precisionHechizos
potenciaHechizos
roboVida
roboMana
cantidadObjetosEncontrados
rarezaObjetosEncontrados
```

`resistenciaMental` deja de pertenecer a esta lista: HP4 la activa como objetivo canónico real para Maldiciones. `velocidadLanzamiento` tampoco necesita una estadística global separada para el contenido actual: una fuente que aumente la velocidad de lanzamiento modifica `atributoHabilidad/costoTemporal` mediante `porcentaje_inverso`.

`potenciaAura` permanece deliberadamente pendiente: las auras iniciales escalan por grado y no por Potencia de Efectos ni por una estadística especial de aura.

Las habilidades transformativas —por ejemplo convertir una habilidad individual en radial, cambiar su elemento o alterar políticas de obstáculos— permanecen pendientes de un diseño explícito. No se habilita un `reemplazar` genérico sobre strings/booleanos para permitir transformaciones arbitrarias.

#### Deliberadamente fuera del sistema

No son objetivos de `SistemaModificadoresCombatiente`:

```text
vidaActual
manaActual
cantidad de flechas/munición
tipo de munición
capacidad del quiver o contenedor
cantidad de manos del arma
patrón de ataque
tipo estructural de ataque
nivel
experiencia
IDs
cantidades de inventario
inmunidades como lista estructural
constantes internas de fórmulas
multiplicadores de recompensas/experiencia otorgada por variantes enemigas
```

Quiver no necesita un motor particular. Sus datos de contenido permanecen en su dominio; si un quiver obtiene un afijo `portador` sobre Evasión, Resistencia u otro objetivo registrado, ese aporte entra al mismo centralizador que cualquier otra pieza equipada.

Los escudos conservan sus propiedades locales de Armadura, probabilidad de Bloqueo y mitigación de Bloqueo. Esas propiedades forman parte del valor base del combatiente; cualquier modificación global/contextual posterior sobre esos objetivos pasa por el centralizador.

En habilidades, estos campos estructurales también quedan deliberadamente fuera del motor numérico mientras no exista un diseño transformativo aprobado:

```text
tipoObjetivo
patronAtaque
requiereLineaVision
hostil
formaImpacto.tipo
orientacion
politicaObstaculos
tipo de daño como identidad
activadores de zona
afecta
politicaSuperposicion
grupoSuperposicion
apariencia
resolverImpacto
resolverCritico
bloqueaMovimiento
bloqueaVision
perfilAplicacion
grupoAcumulacion
inmunidades estructurales
```

No se olvidan: se excluyen conscientemente porque modificarlos implica transformar estructura y flujo, no solamente componer una magnitud numérica.


### 5.2. Constantes en código y strings validados en configuración

El código productivo debe preferir constantes canónicas equivalentes a:

```text
OBJETIVOS_MODIFICADOR.EVASION
OBJETIVOS_MODIFICADOR.ALCANCE_ATAQUE
OBJETIVOS_MODIFICADOR.FACTOR_MOVIMIENTO
OBJETIVOS_MODIFICADOR.MULTIPLICADOR_DANIO_FUENTE
```

Los JSON necesitan representar esas claves como texto, pero todo texto debe validarse contra el mismo catálogo.

Una clave desconocida debe producir error de configuración explícito.

No debe ignorarse silenciosamente una clave como:

```text
"evacion"
```

### 5.3. El registro no contiene las ecuaciones

El registro canónico define qué se puede modificar y qué operaciones/contextos son válidos.

No debe convertirse en un segundo `SistemaCombate`.

No debe implementar funciones específicas como:

```text
calcularEvasion()
calcularCritico()
calcularArmadura()
```

Las ecuaciones continúan en sus dominios actuales.

### 5.4. Resolutor único

Debe existir un único servicio equivalente a:

```text
SistemaModificadoresCombatiente
```

Responsabilidades:

- recibir objetivo canónico;
- recibir valor base;
- recibir contexto canónico;
- resolver para el combatiente propietario del cálculo, sea jugador o enemigo;
- reunir modificadores vigentes;
- descartar modificadores cuyas condiciones no se cumplan;
- aplicar operaciones en orden canónico;
- devolver resultado y desglose de fuentes.

No es responsable de:

- calcular la estadística base;
- decidir daño bruto;
- resolver impacto;
- ejecutar habilidades;
- mantener duración de auras/maldiciones;
- generar afijos;
- presentar HTML o Phaser.

---

## 6. OPERACIONES Y ORDEN MATEMÁTICO

### 6.1. Operaciones canónicas vigentes tras HP4

El centralizador soporta ocho operaciones explícitas:

```text
sumar
porcentaje_base
porcentaje_total
porcentaje_multiplicativo
porcentaje_inverso
multiplicar_redondear
multiplicar
limitar_maximo
```

La regla arquitectónica permanece:

> **Si una fuente real modifica un objetivo registrado mediante una semántica matemática que el contrato todavía no representa, se amplía el contrato común. No se permite dejar el cálculo por fuera de `SistemaModificadoresCombatiente` para evitar agregar una operación.**

Tampoco se agregan operaciones sin necesidad real.

### 6.2. Significado

`sumar`
: suma o resta un valor plano.

`porcentaje_base`
: suma porcentajes calculados exclusivamente sobre el valor base original.

`porcentaje_total`
: suma porcentajes aplicados sobre el subtotal posterior a planos y porcentaje sobre base.

`porcentaje_multiplicativo`
: representa modificadores de tipo «más/menos multiplicativo» que se componen entre sí. `+10% más` y `+20% más` producen `×1,10 ×1,20 = ×1,32`.

`porcentaje_inverso`
: representa aumentos/disminuciones de velocidad cuando la magnitud almacenada es tiempo/coste. `+20% velocidad` divide el tiempo por `1,20`; no multiplica por `0,80`.

`multiplicar_redondear`
: multiplica y redondea en esa etapa antes de continuar. Existe para preservar semánticas reales previas, como ciertos factores de variantes enemigas.

`multiplicar`
: compone factores multiplicativos sin redondeo intermedio. Efectos temporales como ralentizaciones utilizan este camino cuando su contrato lo requiere.

`limitar_maximo`
: impone un techo a la magnitud resultante después de la composición matemática. HP4 la incorpora por una necesidad concreta: Ceguera limita Percepción a 1 independientemente de si la base era 6, 10 o 15.

Los antiguos nombres reservados de afijos `multiplicarMas` y `aumentarVelocidad` dejan de existir. Se expresan respectivamente como `porcentaje_multiplicativo` y `porcentaje_inverso`, incluso aunque esos afijos continúen inactivos.

### 6.3. Orden canónico

Para un valor base `B`:

```text
P   = suma de sumar
PB  = suma de porcentaje_base / 100
PT  = suma de porcentaje_total / 100
PM  = producto de (1 + porcentaje_multiplicativo / 100)
PI  = producto de (1 + porcentaje_inverso / 100)
MR  = producto de multiplicar_redondear
M   = producto de multiplicar
LM  = menor limitar_maximo declarado, si existe

subtotal = B + P + (B × PB)
despuesTotal = subtotal × (1 + PT)
despuesMas = despuesTotal × PM
despuesInverso = despuesMas / PI

despuesRedondeo =
  si existen MR: round(despuesInverso × MR)
  si no: despuesInverso

despuesMultiplicadores = despuesRedondeo × M
resultado =
  si existe LM: min(despuesMultiplicadores, LM)
  si no: despuesMultiplicadores
```

Ejemplo de porcentajes:

```text
Base 100
+20 plano
+10% base
+25% total
→ subtotal 130
→ resultado 162,5
```

Ejemplo de velocidad:

```text
costo temporal base 100
+20% velocidad de lanzamiento
→ 100 / 1,20
→ 83,333...
→ normalización final del atributo según su dominio
```

Ejemplo de Ceguera:

```text
Percepción base 15
+ otras fuentes → 18
limitar_maximo 1
→ Percepción final del centralizador 1
```

### 6.4. Límites/redondeos del dominio

`limitar_maximo` y `multiplicar_redondear` pertenecen al motor porque describen la composición de una fuente. Los clamps finales propios de una regla continúan en su dominio.

Ejemplos: resistencia 0–75, Bloqueo máximo, mínimo entero de alcance, Vida/Maná enteros.

### 6.5. Valores negativos

Las operaciones aditivas y porcentuales admiten valores negativos cuando su semántica lo permite. Los porcentajes multiplicativos/inversos deben permanecer por encima de `-100%`; multiplicadores directos no pueden ser negativos.

---

## 7. CONTEXTO Y CONDICIONES

### 7.1. Contexto consolidado de HP3

HP3 formaliza y utiliza estas claves de contexto del combatiente/equipo. El significado queda fijado para evitar reinterpretaciones futuras:

| Clave | Significado |
|---|---|
| `tipoCombatiente` | clase funcional del actor que resuelve: jugador, enemigo u otra futura categoría registrada |
| `familiaArma` | familia del arma que controla la fuente principal (`daga`, `arco`, etc.) |
| `familiaSecundaria` | familia del objeto secundario, útil para escudo o segunda arma |
| `mano` | fuente concreta del ataque: principal/secundaria |
| `tipoAtaque` | tipo canónico del ataque físico, por ejemplo cuerpo a cuerpo/distancia |
| `esAtaqueDual` | indica que la resolución pertenece a un ataque con dos fuentes |
| `categoriaArmadura` | `ligera`, `media`, `pesada`, `mixta` o `null` para las cinco piezas corporales |
| `conjuntoArmaduraCompleto` | verdadero solo si cabeza, torso, manos, piernas y pies forman un conjunto completo coherente |

El escudo no participa de la clasificación corporal. Una mezcla produce `mixta`; quitar una pieza vuelve el conjunto incompleto.

Estas claves están comentadas en `ContratosModificadoresCombatiente.js`. Una clave desconocida falla explícitamente.

### 7.2. Contexto incorporado por HP4

HP4 agrega contexto específico para resolver una configuración de habilidad sin introducir excepciones por ID:

| Clave | Significado |
|---|---|
| `idHabilidad` | ID canónico de la habilidad cuya ejecución se resuelve |
| `maestriaHabilidad` | maestría propietaria de la habilidad |
| `tipoObjetivoHabilidad` | objetivo estructural (`propio`, `enemigo`, `casilla`, etc.) |
| `formaImpactoHabilidad` | forma estructural (`individual`, `radio`, `linea`, `cadena`) |
| `atributoHabilidad` | atributo interno canónico que se está resolviendo |
| `tipoDanioHabilidad` | tipo físico/elemental del componente de daño actual |
| `faseHabilidad` | `impacto_directo`, `efecto_periodico` o `zona` |
| `efectoIdHabilidad` | efecto temporal concreto asociado a la resolución |
| `tipoEfectoHabilidad` | tipo canónico del efecto temporal, cuando está disponible |
| `objetivoModificadorEfecto` | objetivo numérico modificado por un descriptor interno del efecto |

`atributoHabilidad` se valida además contra `ContratosAtributosHabilidad.js`; no basta con que sea texto.

### 7.3. Condiciones declarativas

Las condiciones comparan claves conocidas contra valores escalares o listas no vacías. No admiten funciones ni expresiones ejecutables.

Ejemplos:

```text
familiaArma = arco
familiaSecundaria = escudo
mano = secundaria
esAtaqueDual = true
idHabilidad = explosion_ignea
maestriaHabilidad = fuego
atributoHabilidad = radioImpacto
faseHabilidad = efecto_periodico
```

Una pasiva aprendida puede permanecer inactiva si su condición actual no se cumple. El proveedor entrega el descriptor; el centralizador decide aplicabilidad.

---

## 8. MODIFICADORES DE HABILIDADES ACTIVAS — CONTRATO CERRADO EN HP4

### 8.1. Configuración efectiva única

HP4 adopta `ConfiguracionHabilidadEfectiva.js` como traductor entre la definición base y los consumidores. No es un segundo resolutor: cada magnitud pide su valor a `SistemaModificadoresCombatiente` y genera un snapshot derivado, congelado y no persistido.

```text
Habilidades.json + grado base
        ↓
ConfiguracionHabilidadEfectiva
        ↓
SistemaModificadoresCombatiente
        ↓
snapshot efectivo
        ↓
selección / Maná / tiempo / geometría / daño / efectos / zona
```

Así no puede ocurrir que la vista previa utilice alcance modificado pero el impacto use alcance base, o que una zona use daño distinto al confirmado en la ejecución.

### 8.2. Daño de habilidad

`danoHabilidad` modifica el daño base interno antes de Inteligencia/Sabiduría según corresponda, Potencia de Habilidad, crítico y defensas del objetivo.

El contexto permite distinguir:

```text
maestriaHabilidad
tipoDanioHabilidad
faseHabilidad = impacto_directo | efecto_periodico | zona
```

Una afinidad elemental puede afectar todos los daños derivados de su habilidad; una futura especialización podría limitarse solo al daño periódico sin tocar el motor del efecto concreto.

### 8.3. Atributos internos

Los 18 atributos productivos están registrados en la sección 5.1 y en código. Todo modificador de `atributoHabilidad` debe indicar la clave exacta que modifica.

Ejemplo:

```text
objetivo: atributoHabilidad
operacion: sumar
valor: 1
condiciones:
  atributoHabilidad: radioImpacto
  idHabilidad: explosion_ignea
```

No existen objetivos paralelos como `radioHabilidad`, `manaHabilidad`, etc.

### 8.4. Snapshot

Los valores internos se resuelven al confirmar/aplicar la ejecución y quedan fijados para esa instancia. Las defensas/estadísticas del objetivo continúan siendo dinámicas.

Ejemplo: una Quemadura puede fijar su daño base modificado cuando se aplica; si el objetivo gana Resistencia a Fuego después, el siguiente tick consulta esa resistencia actual.

### 8.5. Estructura no transformable

HP4 no permite alterar mediante el resolutor numérico el patrón, tipo de objetivo, elemento, políticas de obstáculo o flags estructurales. Una futura habilidad transformativa requerirá un contrato específico aprobado.

---

## 9. PASIVAS

### 9.1. Definición

Una pasiva es una habilidad no ejecutable que, según su grado, declara uno o más modificadores permanentes condicionados.

El estado persistido guarda el grado aprendido, no los resultados derivados.

### 9.2. Flujo

```text
Grado aprendido
  ↓
definición de habilidad
  ↓
modificadores correspondientes al grado
  ↓
SistemaModificadoresCombatiente
  ↓
valor actual
```

### 9.3. Pasivas de referencia aprobadas

#### Ojo de halcón — Arco

Objetivo funcional:

```text
+1 Alcance con arcos
```

Debe condicionar el modificador por familia de arma y no por nombre del objeto.

#### Maestría dual — Dagas / combate dual

Objetivo funcional aprobado:

```text
reducir la penalización de daño de la mano secundaria
```

La penalización temporal por utilizar una segunda arma no forma parte de esta pasiva.

El valor exacto de reducción queda como parámetro de balance a fijar en la etapa de contenido correspondiente.

#### Armadura ligera — Armadura liviana

Objetivo funcional aprobado:

```text
aumentar Evasión cuando el conjunto defensivo completo sea ligero
```

Contrato de conjunto completo:

```text
cabeza
torso
manos
piernas
pies
```

Las cinco piezas deben poseer categoría `ligera`.

El escudo no forma parte de este conjunto.

El valor exacto de Evasión queda como parámetro de balance a fijar en la etapa de contenido correspondiente.

---

## 10. AURAS Y MALDICIONES

### 10.1. Reutilización del sistema temporal

No debe crearse un `SistemaAuras` ni un `SistemaMaldiciones` independiente para mantener duración.

`SistemaEfectosTemporales` continúa siendo responsable de:

- aplicación;
- duración;
- renovación;
- acumulación;
- expiración;
- resistencias e inmunidades cuando correspondan.

### 10.2. Relación con modificadores

Un efecto temporal puede declarar modificadores canónicos.

Mientras el efecto esté vigente, esos modificadores forman parte de las fuentes activas del resolutor **del combatiente afectado**.

Al vencer o retirarse el efecto, dejan de participar.

Conceptualmente:

```text
Aura / Maldición
  ↓
SistemaEfectosTemporales mantiene ciclo de vida sobre el objetivo
  ↓
modificadores vigentes del combatiente afectado
  ↓
SistemaModificadoresCombatiente
```

El mismo flujo debe funcionar si el objetivo es el jugador o un enemigo. No se creará un `SistemaModificadoresCombatienteEnemigo` paralelo. Si una maldición del jugador reduce la Precisión, Evasión, Armadura, Alcance, velocidad/tiempo u otro objetivo soportado de un enemigo, la ecuación canónica de ese enemigo debe consultar el mismo contrato general.

El sistema temporal no calcula el valor final de factores temporales ni de otras estadísticas. Conserva el ciclo de vida del efecto y expone sus descriptores vigentes; `SistemaModificadoresCombatiente` compone el valor numérico final. Daño periódico y demás consecuencias que no son modificadores de un objetivo continúan en sus dominios correspondientes.

### 10.3. Signo y semántica

Arquitectónicamente, aura y maldición comparten el mismo contrato matemático.

Su diferencia funcional y visual proviene del contenido y del origen:

- aura: normalmente favorable;
- maldición: normalmente perjudicial.

No hace falta duplicar operaciones para valores positivos y negativos.

---

## 11. PREFIJOS, SUFIJOS Y OBJETOS LEGENDARIOS FUTUROS

### 11.1. SistemaAfijos conserva su responsabilidad

`SistemaAfijos` debe continuar siendo responsable de:

- generación procedural;
- rareza;
- prefijo/sufijo;
- grados;
- pesos;
- compatibilidad;
- exclusiones;
- valores generados;
- persistencia del afijo dentro del objeto.

No debe convertirse en el sistema general de estadísticas.

### 11.2. Ámbitos explícitos

Los efectos de un afijo deben distinguir explícitamente su ámbito.

Dirección conceptual:

```text
local_objeto
portador
```

El campo implementado y validado es `ambito`.

No debe inferirse el ámbito únicamente por el nombre de la propiedad.

### 11.3. Afijo local

Un afijo local modifica únicamente al objeto que lo contiene.

Ejemplos actuales:

- daño físico local del arma;
- precisión propia del arma;
- probabilidad de crítico propia del arma;
- multiplicador crítico propio del arma.

Ese resultado pertenece al objeto incluso si está en el suelo, inventario o equipado por otra entidad.

Flujo:

```text
plantilla de objeto
  ↓
SistemaAfijos
  ↓
afijos local_objeto
  ↓
propiedades locales resueltas del objeto
```

### 11.4. Afijo global del portador

Un afijo global aporta modificadores al combatiente mientras el objeto esté equipado.

Ejemplos:

```text
+Evasión
+Vida máxima
+Resistencia
+Potencia de habilidad
+Daño de una familia de habilidades
+Alcance con armas a distancia
```

Flujo:

```text
objeto equipado
  ↓
afijo global
  ↓
modificador del portador
  ↓
SistemaModificadoresCombatiente
```

### 11.5. Legendarios futuros

Esta separación debe permitir que un objeto legendario futuro posea afijos globales potentes sin requerir código específico del objeto.

Ejemplos conceptuales:

```text
+20% daño de habilidades de fuego
+1 alcance con armas a distancia
+15% Evasión total
+2 objetivos a habilidades en cadena
```

El objeto sigue utilizando el contrato de afijos; el efecto global reutiliza el sistema común de modificadores.


### 11.6. Inventario de afijos auditado en HP2

HP2 clasificó todos los efectos actualmente declarados en `Prefijos.json` y `Sufijos.json`. El `ambito` queda explícito incluso para contenido todavía no activo, pero **clasificar el ámbito no activa ni completa el motor pendiente de ese afijo**.

#### Activos — `local_objeto`

```text
afilado            danioFisicoLocalMinimo
brutal             danioFisicoLocalPorcentaje
reforzado          armadura
ardiente           danioFuegoLocalMinimo / danioFuegoLocalMaximo
glacial            danioFrioLocalMinimo / danioFrioLocalMaximo
electrificado      danioRayoLocalMinimo / danioRayoLocalMaximo
venenoso           danioVenenoLocalMinimo / danioVenenoLocalMaximo
de_precision       precision
del_verdugo        probabilidadCritico
de_devastacion     multiplicadorCritico
del_guardian       probabilidadBloqueo
de_absorcion       mitigacionBloqueo
```

Continúan componiéndose dentro del objeto.

#### Activos — `portador`

```text
vigoroso            vidaMaxima
enfocado            potenciaHabilidad
de_evasion          evasion
de_regeneracion     regeneracionVida
de_ascuas           resistenciaFuego
de_escarcha         resistenciaFrio
de_tormenta         resistenciaRayo
del_antidoto        resistenciaVeneno
del_deshielo        resistenciaCongelamiento
de_firmeza          resistenciaAturdimiento
de_purificacion     resistenciaEnvenenamiento
de_ceniza           resistenciaQuemadura
```

Estos efectos dejan de contaminar las propiedades locales del objeto y participan como fuentes del combatiente mientras la pieza esté equipada.

#### No activos — ámbito local ya identificado

```text
ligero          velocidadAtaqueLocalPorcentaje     operacion: porcentaje_inverso
fortificado     armaduraLocalPorcentaje             operacion: sumar
abrasador       probabilidadQuemar                  operacion: sumar
congelante      probabilidadCongelar                operacion: sumar
aturdidor       probabilidadAturdir                 operacion: sumar
ponzonoso       probabilidadEnvenenar               operacion: sumar
del_vampiro     roboVidaPorcentaje                  operacion: sumar
del_devorador   roboManaPorcentaje                  operacion: sumar
```

El ámbito local expresa que, si se activan en el futuro, la propiedad pertenece a la fuente/objeto o a su impacto. Su semántica funcional todavía debe aprobarse donde corresponda.

#### No activos — ámbito `portador` ya identificado

```text
arcano              manaMaximo
sanguinario         danioFisicoGlobalMinimo / danioFisicoGlobalMaximo
del_conquistador    danioFisicoAumentadoPorcentaje
despiadado          danioFisicoMasPorcentaje            operacion: porcentaje_multiplicativo
igneo                danioFuegoAumentadoPorcentaje
invernal             danioFrioAumentadoPorcentaje
tempestuoso          danioRayoAumentadoPorcentaje
toxico               danioVenenoAumentadoPorcentaje
de_claridad          regeneracionMana
de_fatalidad         probabilidadCriticoGlobal
de_carniceria        multiplicadorCriticoAdicional
de_renovacion        regeneracionVidaPorcentaje
de_meditacion        regeneracionManaPorcentaje
del_oso              fuerza
del_lince            destreza
del_roble            constitucion
del_sabio            inteligencia
del_buho             sabiduria
del_soberano         carisma
de_celeridad         velocidadMovimientoPorcentaje      operacion: porcentaje_inverso
de_fortuna           rarezaObjetosEncontradosPorcentaje
de_abundancia        cantidadObjetosEncontradosPorcentaje
del_taumaturgo       danioHechizosAumentadoPorcentaje
de_canalizacion      velocidadLanzamientoPorcentaje     operacion: porcentaje_inverso
de_concentracion     precisionHechizos
del_archimago        potenciaHechizos / manaMaximo
```

Que un efecto sea `portador` **no implica que su objetivo ya esté registrado**. Los campos anteriores permanecen en sus estados actuales (`pendiente_motor`, `pendiente_diseno`, `pendiente_balance`, `reservado_raro`, etc.) hasta la etapa que analice y apruebe su semántica.


---

## 12. INTEGRACIÓN CON ECUACIONES CANÓNICAS

### 12.1. Punto de modificación único por valor

Cada valor modificable se conecta una sola vez al resolutor en el lugar donde su ecuación canónica ya produce o consume dicho valor.

Ejemplo Evasión:

```text
ANTES

evasionBase = fórmula existente
resultado = evasionBase
```

```text
DESPUÉS

evasionBase = fórmula existente
resultadoModificado = resolver(EVASION, evasionBase, contexto)
resultado = aplicarReglasFinales(resultadoModificado)
```

Después de esa integración, la pasiva número 50 que modifique Evasión no debe exigir cambios en la ecuación.

### 12.2. No recalcular resultados existentes

Cuando el sistema de combate ya produce un dato final útil, otros sistemas deben consumir ese resultado.

Ejemplos:

- XP de armas utiliza daño realmente aplicado informado por combate;
- XP de armaduras utiliza daño mitigado por armadura informado por combate;
- la interfaz utiliza el desglose producido por el mismo cálculo que determina el valor real.

No debe repetirse una ecuación únicamente para calcular experiencia, tooltip o presentación.

### 12.3. Maestría dual

La penalización base de mano secundaria continúa perteneciendo a la configuración/cálculo canónico de ataque.

La pasiva modifica el factor resultante para ese personaje/contexto.

No debe cambiar globalmente la penalización base del juego.

---

## 13. EXPERIENCIA DE MAESTRÍAS FÍSICAS

### 13.1. Principio y motor único

La progresión de todas las maestrías utiliza un único `SistemaExperienciaMaestrias`. Este sistema traduce hechos canónicos ya resueltos a XP y delega el almacenamiento de nivel, XP y puntos en `ProgresoHabilidadesJugador`.

No recalcula daño, Armadura, Bloqueo, Maná ni efectos. Las fuentes iniciales configurables son:

```text
mana_consumido
danio_aplicado_arma
danio_mitigado_armadura
danio_mitigado_bloqueo
```

Factores iniciales aprobados:

```text
mana_consumido              × 1
danio_aplicado_arma         × 0,75
danio_mitigado_armadura     × 8
danio_mitigado_bloqueo      × 4
```

Los factores viven en la configuración de cada maestría, no como constantes escondidas dentro del motor.

### 13.2. Maestrías de arma

La experiencia se basa exclusivamente en la Vida realmente retirada por cada fuente de arma que llegó a impactar.

```text
si dañoRealAplicado <= 0:
  XP = 0

si dañoRealAplicado > 0:
  XP = max(1, round(dañoRealAplicado × factor))
```

Consecuencias canónicas:

- un fallo o una fuente que produce 0 de daño otorgan 0 XP;
- el overkill no cuenta: si el objetivo tenía 3 de Vida, como máximo esa fuente acredita 3 de daño real;
- en dual cada mano conserva su familia y solo recompensa si realmente llegó a ejecutarse;
- si la primera fuente mata al objetivo, la segunda no obtiene XP;
- un ataque natural sin familia de arma no se atribuye artificialmente a ninguna maestría física.

La deduplicación usa el ID de resolución, componente/fuente y maestría. Es estado técnico de sesión y no se persiste.

### 13.3. Maestrías de armadura

La experiencia defensiva consume únicamente `danioMitigadoArmadura` expuesto por la resolución física canónica. Ese valor representa la reducción producida por la fórmula de Armadura antes del redondeo final y excluye Bloqueo.

No se contabiliza como mitigación de Armadura daño evitado por:

- Evasión;
- Bloqueo;
- resistencias elementales;
- inmunidades;
- redondeo final;
- cualquier otro mecanismo que no sea la fórmula de Armadura.

`EstadisticasDerivadas` expone el aporte de Armadura por procedencia:

```text
ligera
media
pesada
escudo
otras
```

La Armadura base y bonificaciones globales no atribuibles a una familia quedan en `otras` y no regalan XP de equipamiento. Si la Armadura final resulta inferior a la suma local, los aportes se reducen proporcionalmente para conservar el resultado canónico.

Cuando varias categorías clasificables participaron en el mismo golpe, primero se calcula un **único pool entero de XP de Armadura** y después se distribuye entre categorías por su contribución real mediante restos mayores. Por tanto, la mezcla de categorías no puede crear ni destruir XP por efecto de redondeos independientes.

Conceptualmente:

```text
XP_exacta_categoria = mitigacion_categoria × factor_categoria
XP_total = max(1, round(suma(XP_exacta_categoria)))
XP_total se reparte proporcionalmente conservando exactamente ese entero
```

Una categoría puede recibir 0 en un golpe extremadamente pequeño si el único punto entero del pool corresponde por restos a otra categoría; lo que se garantiza es que el total del golpe se conserve.

### 13.4. Escudos

Escudos utiliza dos fuentes reales, ambas ya resueltas por combate:

1. la parte de `danioMitigadoArmadura` atribuible a la Armadura local del escudo;
2. `danioMitigadoBloqueo` cuando se produjo un bloqueo real.

El primer aporte comparte el pool de Armadura del golpe. El segundo se recompensa de forma independiente con su factor configurado. Un bloqueo fallido no produce XP de Bloqueo. El escudo tampoco atribuye su Armadura a Ligera/Media/Pesada.

### 13.5. Progresión mágica dentro del mismo sistema

Fuego, Frío, Rayo y Veneno conservan la regla funcional anterior —XP proporcional al Maná realmente consumido—, pero dejan de depender de una fórmula especial dentro de `ProgresoHabilidadesJugador`. Cada ejecución efectiva emite `mana_consumido` con la maestría correspondiente y `SistemaExperienciaMaestrias` aplica el factor configurado.

### 13.6. Balance posterior

Los factores iniciales no se consideran balance definitivo. Pueden ajustarse con pruebas de juego modificando configuración, sin crear otro motor ni cambiar las fuentes canónicas de XP.

El balance fino de:

- factores de experiencia;
- velocidad de subida;
- requisitos;
- grados;
- magnitudes de pasivas;

queda habilitado para una etapa posterior de balance sin necesidad de cambiar la arquitectura.

---

## 14. PANEL DEL PERSONAJE Y DESGLOSE DE ESTADÍSTICAS

### 14.1. Panel HTML/CSS

El panel del personaje continúa siendo HTML/CSS.

No debe migrarse a Phaser para implementar este hito.

### 14.2. Sección de pasivas

El panel debe mostrar de forma compacta las pasivas aprendidas relevantes.

Debe poder distinguir:

```text
Activa
Inactiva por condición
```

Ejemplo:

```text
Ojo de halcón
Inactiva — requiere arco
```

### 14.3. Sección de efectos activos

El panel debe mostrar también auras y maldiciones activas relevantes.

Debe incluir, cuando corresponda:

- nombre localizado;
- efecto resumido;
- condición o acumulaciones;
- duración restante en la unidad canónica utilizada por el juego;
- diferenciación visual positiva/negativa sin depender únicamente del color.

### 14.4. Tooltip de estadísticas

Al hacer hover sobre una estadística modificable, la UI debe poder mostrar el desglose real utilizado por el cálculo.

Ejemplo:

```text
Alcance actual: 8

Base: 6
Ojo de halcón: +1
Aura del explorador: +2
Maldición: -1
```

La interfaz no debe volver a calcular el resultado.

Debe consumir el descriptor generado por la misma resolución que entrega el valor canónico.

### 14.5. Fuentes en el desglose

El descriptor de modificador debe conservar información suficiente para presentar su origen, por ejemplo:

```text
tipoOrigen
idOrigen
idObjeto cuando corresponda
valor
operacion
estado de condición
```

Los nombres visibles y traducciones se resuelven en presentación, no en la lógica.

---

## 15. PERSISTENCIA

### 15.1. No persistir valores derivados

No deben guardarse campos equivalentes a:

```text
bonusAlcance = 1
evasionPasivas = 5
ojoHalconActivo = true
```

La persistencia debe conservar la fuente real:

```text
grados de habilidades
objetos y sus afijos
estado temporal cuando la política de persistencia vigente lo requiera
```

Los modificadores se reconstruyen desde esas fuentes.

### 15.2. HP1 parte sin partidas guardadas

Para este hito se asume expresamente que **no existen partidas guardadas que deban conservarse**.

Por tanto HP1 debe:

- adoptar directamente el nuevo esquema general de progresión;
- realizar los cambios normales sobre contratos y persistencia;
- no crear migradores históricos;
- no crear parches de compatibilidad;
- no crear alias temporales destinados únicamente a partidas anteriores;
- no mantener estructuras obsoletas solo para poder leer un estado que se declaró inexistente.

La única obligación de persistencia es que el nuevo esquema pueda guardarse y cargarse correctamente a partir de la implementación del hito.

### 15.3. Una sola persistencia

No debe existir un archivo de guardado específico para pasivas ni un segundo estado paralelo de modificadores.

---

## 16. VALIDACIÓN DE CONFIGURACIÓN

Toda definición de modificador debe validarse al cargar.

Como mínimo debe comprobarse:

- objetivo existente;
- operación soportada;
- valor numérico válido;
- atributo de habilidad válido cuando `objetivo = atributoHabilidad`;
- condiciones con claves reconocidas;
- valores de condición compatibles con sus catálogos cuando corresponda;
- ámbito de afijo válido;
- ausencia de campos contradictorios;
- habilidad pasiva sin contrato de ejecución incompatible;
- habilidad activa con su contrato de ejecución vigente.

Los errores deben ser explícitos y fallar temprano.

No deben convertirse configuraciones inválidas en “sin efecto” silenciosamente.

---

## 17. FLUJOS CANÓNICOS

### 17.1. Pasiva

```text
Punto de habilidad
  ↓
ProgresoHabilidadesJugador
  ↓
grado aprendido
  ↓
definición de pasiva
  ↓
modificadores candidatos
  ↓
condiciones + contexto
  ↓
SistemaModificadoresCombatiente
  ↓
ecuación canónica
  ↓
resultado
```

### 17.2. Aura / Maldición

```text
Habilidad ejecutada
  ↓
SistemaEfectosTemporales
  ↓
efecto activo y duración
  ↓
modificadores candidatos
  ↓
SistemaModificadoresCombatiente
  ↓
ecuación canónica
```

### 17.3. Afijo global

```text
Objeto generado
  ↓
SistemaAfijos
  ↓
afijo persistido
  ↓
objeto equipado
  ↓
modificador del portador
  ↓
SistemaModificadoresCombatiente
```

### 17.4. Afijo local

```text
Objeto generado
  ↓
SistemaAfijos
  ↓
propiedad local del objeto
  ↓
ecuación consume propiedad del objeto
```

### 17.5. Modificador de habilidad

```text
Habilidad obtiene atributo base
  ↓
ATRIBUTO_HABILIDAD / DANO_HABILIDAD
  ↓
SistemaModificadoresCombatiente + contexto de habilidad
  ↓
atributo efectivo
  ↓
la ejecución canónica utiliza ese valor
```

---

## 18. REGLAS PARA NUEVO CONTENIDO

Una nueva pasiva, aura, maldición o afijo global no debe exigir cambios de código cuando:

- utiliza un objetivo ya registrado;
- utiliza una operación ya soportada;
- utiliza condiciones ya soportadas;
- utiliza un atributo de habilidad ya registrado.

Debe requerirse código únicamente cuando el contenido necesita una nueva clase real de comportamiento o un nuevo punto modificable que todavía no existe.

Cuando se agregue un nuevo objetivo modificable:

1. debe registrarse canónicamente;
2. debe validarse;
3. debe integrarse una sola vez en la ecuación propietaria;
4. debe probarse con al menos una fuente de modificación;
5. debe poder exponer desglose para presentación cuando sea visible al jugador.

---

## 19. ALCANCE VISUAL

Este hito mantiene HTML/CSS como tecnología canónica para el panel del personaje, pero **no se presume que la distribución actual alcance** para presentar correctamente pasivas, auras, maldiciones y desgloses de estadísticas.

HP5 debe realizar primero un análisis de usabilidad y densidad real del panel antes de implementar la presentación final. Si el panel actual no permite mostrar la nueva información con claridad, queda autorizado proponer un **rediseño acotado o profundo del panel Personaje**, siempre respetando `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md` y requiriendo aprobación previa de la propuesta visual.

El análisis debe considerar como mínimo:

- cantidad de estadísticas visibles;
- espacio requerido por Pasivas;
- espacio requerido por Auras/Maldiciones activas;
- estados activa/inactiva de pasivas condicionales;
- tooltips con desgloses extensos;
- resoluciones pequeñas;
- redimensionamiento;
- convivencia con el resto de paneles;
- legibilidad y jerarquía visual;
- necesidad o no de pestañas, agrupadores, secciones colapsables u otra organización.

No debe crearse una HUD paralela ni trasladarse lógica de cálculo al renderizador Phaser.

---

## 20. ETAPAS DEL HITO

### HP0 — Análisis y contrato rector

**Estado al crear este documento:** cierre documental pendiente de integrar el Plan Maestro al repositorio.

Objetivo:

- auditar la arquitectura real;
- definir progresión general;
- definir contrato de modificadores;
- acordar operaciones matemáticas;
- acordar relación con auras/maldiciones;
- acordar integración de afijos;
- acordar experiencia de armas/armaduras;
- acordar representación en Personaje;
- documentar el plan completo.

Criterio de cierre:

- este Plan Maestro queda incorporado al repositorio;
- no se implementa lógica productiva en HP0.

### HP1 — Generalización de progresión y configuración

**Estado:** Cerrada. Implementación, validación estructural/contractual y pruebas manuales básicas completadas.

Objetivo:

- reemplazar la progresión exclusivamente mágica por progresión general de habilidades;
- trasladar configuraciones generales de maestrías/habilidades;
- eliminar restricciones rígidas de las cuatro maestrías mágicas;
- declarar tipos activa/pasiva;
- conservar funcionamiento de habilidades activas actuales;
- adaptar guardado/carga al esquema nuevo partiendo de cero partidas previas.

Restricción específica de HP1:

> Se asume que no existen partidas guardadas que deban conservarse. No implementar migraciones, parches, compatibilidad histórica ni estructuras temporales para estados anteriores.

Resultado esperado:

```text
un único sistema de puntos, maestrías y grados capaz de contener magia, armas, armaduras y pasivas, con persistencia nueva limpia
```

No incluye todavía modificaciones efectivas de combate.

### HP2 — Auditoría exhaustiva, contrato, resolutor y afijos globales

**Estado:** Cerrada. Implementación, validación técnica y pruebas manuales aprobadas por el usuario. Commit final informado por el usuario: `f8ea59521d521e09cc0dfc0ccf2b805e6ca2fc65`.

HP2 realizó la auditoría arquitectónica fuerte sobre el repositorio real cerrado en HP1 (`f9eb1a9fd894d8c21a7103abe1b5a0a6abf3b481`). No se limitó a la lista inicial del Plan Maestro.

Dominios auditados:

- estadísticas de jugador y enemigos;
- armas, ataques naturales y fuentes de ataque;
- combate dual y mano secundaria;
- armaduras;
- escudos y bloqueo;
- quiver/munición;
- crítico;
- precisión/evasión;
- alcance;
- Vida/Maná y regeneraciones;
- resistencias de daño y de efectos;
- potencia de efectos y Potencia de Habilidad;
- percepción;
- factores temporales;
- efectos temporales;
- terreno y zonas;
- equipamiento;
- afijos activos y reservados;
- variantes enemigas;
- persistencia;
- herramientas y compatibilidades históricas tocadas por el flujo.

Resultado implementado:

- registro único de objetivos en `ContratosModificadoresCombatiente.js`;
- un solo `SistemaModificadoresCombatiente` para Player y Enemigo;
- operaciones `sumar`, `porcentaje_base`, `porcentaje_total`, `multiplicar_redondear` y `multiplicar`;
- error explícito ante objetivo, operación, ámbito o clave de contexto desconocidos;
- condiciones declarativas sin código ejecutable;
- desglose del valor resuelto y de fuentes aplicadas/omitidas;
- detección de IDs de modificador duplicados;
- afijos con `ambito: local_objeto | portador`;
- afijos locales compuestos únicamente dentro del objeto;
- afijos del portador obtenidos desde el equipo canónico actual, sin estados duplicados al equipar/desequipar;
- efectos temporales convertidos en fuentes del centralizador para sus factores;
- terreno y zonas preparados como fuentes consultadas desde la posición real;
- Percepción trasladada al centralizador y eliminación de `PercepcionJugador`;
- variantes enemigas conectadas al centralizador cuando afectan objetivos registrados;
- persistencia `v3` basada en fuentes, sin `propiedadesFinales` guardadas y sin migración;
- eliminación de wrappers/fallbacks históricos directamente afectados.

Regla de cierre de HP2:

> Todo objetivo registrado debe atravesar el centralizador para obtener su valor final. Si una nueva fuente real necesita una composición matemática todavía no representada, se amplía el contrato común; no se crea un cálculo paralelo.

HP2 no agrega contenido de pasivas físicas, auras/maldiciones nuevas ni atributos internos modificables de habilidades. Esos diseños continúan respectivamente en HP3 y HP4.

Resultado esperado alcanzado técnicamente:

```text
motor canónico general basado en el universo real de variables del juego, usable por cualquier combatiente y conectado con equipo, efectos temporales, terreno/zonas y variantes enemigas
```

Las pruebas manuales de HP2 fueron superadas y aprobadas por el usuario antes de iniciar HP3.


### HP3 — Diseño de contenido pasivo y progresión física

**Estado:** Cerrada. Commit base HP2 `f8ea59521d521e09cc0dfc0ccf2b805e6ca2fc65`; commit final confirmado de HP3 `f5e810d51172cd12b4063b40e0cdd0a90cdef646`. Implementación, validación técnica y pruebas manuales fueron superadas y aprobadas por el usuario.

HP3 cierra el primer catálogo amplio de progresión no mágica utilizando la arquitectura canónica de HP1–HP2. No crea un motor paralelo de pasivas ni una segunda progresión física.

#### 16 maestrías totales

Se conservan las cuatro mágicas: Fuego, Frío, Rayo y Veneno. Se agregan doce maestrías físicas, disponibles para Guerrero, Rogue y Mago porque el equipamiento actual no impone restricciones de clase artificiales:

- Armas: Dagas, Espadas, Hachas, Mandobles, Lanzas, Arcos, Bastones y Varitas.
- Armaduras: Armadura ligera, Armadura media, Armadura pesada y Escudos.

La categoría `Básicas` permanece deliberadamente vacía. No se inventa una maestría general hasta que exista una identidad jugable y una fuente natural de XP comparable a usar un arma, mitigar daño o gastar Maná.

#### 48 pasivas físicas

Cada maestría física posee cuatro pasivas con estructura `3/3/3/1` y requisitos de nivel `0/3/6/9`. Una maestría a nivel 10 entrega diez puntos específicos, exactamente los necesarios para completar sus diez grados si el jugador desea especializarla por completo. Los puntos universales siguen siendo compartidos.

Catálogo aprobado:

- **Dagas:** Ritmo de daga; Punto vital; Maestría dual; Danza de cuchillas.
- **Espadas:** Técnica de hoja; Corte maestro; Guardia de duelista; Esgrima fluida.
- **Hachas:** Golpe brutal; Cabeza equilibrada; Impacto decisivo; Ejecutor.
- **Mandobles:** Inercia; Dominio pesado; Guardia a dos manos; Quebrantador.
- **Lanzas:** Punta firme; Empuje profundo; Guardia de distancia; Dominio de alcance.
- **Arcos:** Tiro estable; Tensión controlada; Tiro letal; Ojo de halcón.
- **Bastones:** Canalización estable; Golpe disciplinado; Guardia de bastón; Foco profundo.
- **Varitas:** Canalización fina; Precisión arcana; Doble canalización; Canal extendido.
- **Armadura ligera:** Armadura ligera; Paso ligero; Flujo libre; Sin lastre.
- **Armadura media:** Defensa flexible; Movilidad entrenada; Preparación elemental; Equilibrio.
- **Armadura pesada:** Placas ajustadas; Aguante; Firmeza; Fortaleza.
- **Escudos:** Guardia firme; Bloqueo experto; Bastión; Muro.

Los valores concretos viven en `src/config/habilidades/Habilidades.json`, por grado, como descriptores declarativos del contrato HP2. Ninguna pasiva puede crear una rama `if (idPasiva)` dentro de combate, tiempo, estadísticas o interfaz.

#### Proveedor de pasivas

`ProveedorModificadoresPasivasAprendidas` tiene una responsabilidad deliberadamente pequeña:

```text
Habilidades.json
+ ProgresoHabilidadesJugador
        ↓
qué pasivas están aprendidas y en qué grado
        ↓
descriptores de ese grado
        ↓
SistemaModificadoresCombatiente
```

El proveedor **no** evalúa si las condiciones se cumplen, no consulta el arma para decidir por sí mismo si una pasiva está activa y no calcula estadísticas. `SistemaModificadoresCombatiente` sigue siendo el único intérprete de condiciones, operaciones y composición final.

Ejemplo: Ojo de halcón aprendido entrega siempre su descriptor; el centralizador aplica `+1 alcanceAtaque` solamente cuando el contexto real informa `familiaArma=arco`.

#### Contexto de equipo y conjuntos

HP3 formaliza además:

- `familiaSecundaria`;
- `conjuntoArmaduraCompleto`;
- `categoriaArmadura = ligera | media | pesada | mixta | null`.

El conjunto corporal utiliza exactamente cinco ranuras: cabeza, torso, manos, piernas y pies. El escudo no participa.

- cinco piezas de la misma categoría → categoría correspondiente + conjunto completo;
- piezas de categorías diferentes → `mixta`;
- una ranura corporal vacía → conjunto incompleto;
- sin armadura corporal → categoría `null`.

Las pasivas de Ligera/Media/Pesada exigen simultáneamente la categoría correcta y `conjuntoArmaduraCompleto=true`. Aprender una pasiva no implica que esté activa.

#### Un único SistemaExperienciaMaestrias

La XP deja de tener una fórmula mágica embebida dentro de `ProgresoHabilidadesJugador`. Existe un único traductor de hechos canónicos ya resueltos:

```text
resultado real de habilidad/combate
        ↓
SistemaExperienciaMaestrias
        ↓
fuentesExperiencia configuradas por maestría
        ↓
ProgresoHabilidadesJugador.agregarExperienciaMaestria
```

Fuentes iniciales:

- `mana_consumido`: factor 1 para Fuego/Frío/Rayo/Veneno;
- `danio_aplicado_arma`: factor 0,75 para la familia concreta;
- `danio_mitigado_armadura`: factor 8 para Ligera/Media/Pesada y aporte de Escudo;
- `danio_mitigado_bloqueo`: factor 4 para Escudos.

Los factores son configuración, no constantes dispersas.

Reglas de XP física:

- fallo o daño real 0 → 0 XP de arma;
- el overkill no cuenta: se usa la Vida realmente retirada por cada fuente;
- en dual se recompensa cada golpe/familia que realmente llegó a ejecutarse;
- un ataque natural no produce XP de una maestría de arma;
- la mitigación de Armadura se obtiene dentro de la resolución física, antes del redondeo final y excluyendo Bloqueo;
- Evasión, resistencia elemental, inmunidad y redondeo final no se confunden con mitigación de Armadura;
- Bloqueo usa su mitigación real ya resuelta;
- toda fuente positiva produce al menos 1 XP después de aplicar su factor; en mitigación de Armadura ese mínimo pertenece al pool total del golpe, no a cada categoría por separado, y la distribución entera conserva exactamente ese total.

Cada resolución de ataque recibe un ID técnico de sesión. Las recompensas se deduplican por resolución, componente, fuente y maestría; esos IDs no se persisten.

#### Distribución de mitigación entre armaduras

`EstadisticasDerivadas` expone un desglose canónico de la Armadura por procedencia: `ligera`, `media`, `pesada`, `escudo` y `otras`. El combate distribuye el daño realmente mitigado por Armadura según esa contribución.

La Armadura base del combatiente y bonificaciones globales no atribuibles a una familia quedan en `otras`, por lo que no regalan XP a una maestría física. Si un modificador global reduce la Armadura final, la contribución clasificable se ajusta proporcionalmente.

Esto evita dos errores:

- que un escudo otorgue XP de Armadura pesada solo porque el resto del equipo es pesado;
- que una bonificación global de Armadura se atribuya artificialmente a las piezas equipadas.

#### Persistencia HP3

No hay migración. El estado interno de `ProgresoHabilidadesJugador` pasa a `v3` y el guardado durable del jugador a `v4`. Se persisten niveles, XP, puntos y grados; no se persisten pasivas activas/inactivas, estadísticas derivadas, contexto del equipo, desgloses ni IDs de deduplicación.

#### Diseño de auras/maldiciones heredado hacia HP4

HP3 dejó una primera propuesta funcional de ocho auras y ocho maldiciones para forzar la validación arquitectónica del centralizador. Ese catálogo fue **refinado y reemplazado durante el diseño aprobado de HP4** antes de su implementación.

La fuente vigente para nombres, distribución, grados, valores y runtime es la sección HP4 de este Plan. En particular:

- Ceguera deja de reducir alcance: limita exclusivamente Percepción a 1 casilla;
- se incorpora Silencio;
- se incorporan Resistencia Mental y cuatro vulnerabilidades elementales específicas;
- las auras se distribuyen de forma jugable entre magia, armas y armaduras;
- el catálogo se amplía a contenido aprendible real en lugar de quedar solo como efectos futuros.

No debe utilizarse la propuesta preliminar de HP3 como tabla de balance vigente.

Resultado esperado de HP3:

```text
16 maestrías, 48 pasivas físicas funcionales y un único sistema configurable de XP de maestrías, con auras/maldiciones diseñadas para la etapa siguiente
```

### Ajustes de usabilidad detectados durante la validación manual de HP3

La validación manual de HP3 detectó dos ajustes necesarios antes de cerrar la etapa:

- aprender o mejorar una pasiva debe refrescar inmediatamente los valores HTML dependientes del jugador (Panel Personaje y HUD) sin exigir movimiento, ataque ni otro turno; el valor canónico ya cambia en el momento de aprenderla y la presentación debe representarlo de inmediato;
- las tarjetas de pasivas deben mostrar el beneficio concreto del grado usando directamente `modificadoresPorGrado` de `Habilidades.json`, con una presentación orientada al jugador (`Precisión +2`, `Armadura +8%`, `Velocidad de ataque +3%`). Las condiciones siguen existiendo y se evalúan canónicamente, pero no se repiten como una fila `Requiere` dentro del bloque de beneficio. No se deben exponer como dato principal nombres técnicos de operación como `multiplicar`, `porcentaje_base` ni el texto genérico `Efecto actual`. La interfaz solo traduce/formatea el descriptor y no recalcula estadísticas. Para una pasiva todavía no aprendida se muestra el grado 1 como vista previa. El tipo `Activa`/`Pasiva` se presenta como píldora de clasificación dentro de la tarjeta y no como una fila del detalle funcional.

La iconografía definitiva de pasivas se reserva expresamente para HP5, utilizando `icono` en el mismo catálogo canónico.

La revalidación manual posterior a estos ajustes fue superada y aprobada por el usuario, por lo que HP3 queda cerrada funcionalmente.

### HP4 — Diseño exhaustivo de modificadores de habilidades, auras y maldiciones

**Estado:** Cerrada. Implementación, validación técnica y pruebas manuales superadas y aprobadas por el usuario sobre la base `f5e810d51172cd12b4063b40e0cdd0a90cdef646`. El commit final queda a cargo del usuario.

HP4 cierra el contrato numérico de habilidades y convierte auras/maldiciones en contenido jugable real sin crear `SistemaAuras`, `SistemaMaldiciones` ni `SistemaModificadoresHabilidad`.

#### Contrato técnico

- `ConfiguracionHabilidadEfectiva` resuelve una única configuración derivada por ejecución/vista previa;
- `danoHabilidad` y `atributoHabilidad` son los únicos nuevos objetivos de habilidad;
- los 18 atributos internos productivos y dos candidatos de proyectiles están documentados en las secciones 5 y 8;
- `modificador_factor` desaparece y los efectos numéricos usan `modificador_combatiente`;
- auras son emisiones móviles asociadas a un efecto temporal del emisor;
- maldiciones son efectos temporales sobre el objetivo;
- duración/renovación/acumulación siguen perteneciendo a `SistemaEfectosTemporales`;
- toda composición numérica termina en `SistemaModificadoresCombatiente`;
- una misma aura en el mismo emisor renueva duración; emisores diferentes son fuentes reales distintas y pueden acumularse;
- las auras físicas vuelven inactivo su aporte si el emisor deja de cumplir el requisito de equipamiento durante su vigencia;
- auras y maldiciones iniciales no escalan automáticamente con Potencia de Efectos; su magnitud procede del grado.

#### Resistencia Mental

HP4 activa `resistenciaMental` como objetivo real:

```text
base configurada
+ 2 × Sabiduría
↓
SistemaModificadoresCombatiente
↓
clamp 0–75
```

Las Maldiciones usan:

```text
probabilidadFinal = probabilidadBase × (1 - resistenciaMental / 100)
```

Resistencia Mental reduce la probabilidad de aplicación; no reduce la potencia de la maldición una vez aplicada.

#### Ceguera

Ceguera no modifica alcance. Mientras permanece activa:

```text
Percepción → limitar_maximo 1
```

Esto permite cortar visión/persecución del enemigo y habilita una estrategia de desenganche y reposicionamiento. Sus grados solo aumentan probabilidad y duración.

#### Silencio

Silencio reutiliza el tipo temporal canónico `bloqueo_habilidades`. Mientras está activo se permiten movimiento, espera y ataque con arma, pero no habilidades activas. El efecto puede existir sobre cualquier combatiente; cualquier consumidor futuro de habilidades enemigas debe consultar el mismo bloqueo temporal.

#### Potencia de Efectos

El escalado deja de estar codificado por tipo y cada efecto declara:

```text
ninguna
valor
duracion
valor_y_duracion
```

Para preservar balance actual:

- Envenenamiento → `valor`;
- Quemadura → `valor`;
- todos los demás efectos actuales, auras y maldiciones nuevas → `ninguna`.

Por tanto Veneno y Quemadura **sí** conservan el escalado de daño por tick que ya tenían; no se aumenta su duración salvo modificador explícito de habilidad.

#### 16 pasivas mágicas nuevas

Todas son de un grado y usan descriptores declarativos. Requisitos dentro de cada maestría: 2 / 4 / 7 / 9.

| Maestría | Pasiva | Efecto |
|---|---|---|
| Fuego | Afinidad ígnea | daño de habilidades de Fuego +10% |
| Fuego | Ascua eficiente | Ascua: Maná -1 |
| Fuego | Detonación expansiva | Explosión ígnea: Radio +1 |
| Fuego | Combustión persistente | Incinerar: Quemadura +1 turno |
| Frío | Afinidad glacial | daño de habilidades de Frío +10% |
| Frío | Esquirla persistente | Esquirla de hielo: Ralentización +1 turno |
| Frío | Nova expansiva | Nova de escarcha: Radio +1 |
| Frío | Congelación profunda | Ráfaga glacial: probabilidad de Congelamiento +15 puntos |
| Rayo | Afinidad tormentosa | daño de habilidades de Rayo +10% |
| Rayo | Chispa fulminante | Chispa: velocidad de lanzamiento +10% |
| Rayo | Conducción múltiple | Cadena de rayos: +1 objetivo máximo |
| Rayo | Descarga extendida | Descarga fulminante: Longitud +1 |
| Veneno | Afinidad tóxica | daño derivado de habilidades de Veneno +10% |
| Veneno | Toxina persistente | Aguijón tóxico: Envenenamiento +1 turno |
| Veneno | Nube persistente | Nube tóxica: zona +2 turnos |
| Veneno | Plaga voraz | Plaga corrosiva: +1 acumulación máxima |

#### Fuego — aura y maldiciones

Identidad jugable: presión, ruptura defensiva y preparación del daño ígneo.

| Contenido | Req. | Grados | Efecto | Prob./duración |
|---|---:|---:|---|---|
| Manto Ígneo | 0 | 3 | Res. Fuego +10 / +15 / +20; aura radio 2 | 100%; 10 turnos |
| Vulnerabilidad Ígnea | 0 | 3 | Res. Fuego -10 / -15 / -20 | 70/80/90%; 10 turnos |
| Exposición | 3 | 3 | Armadura base -8% / -12% / -18% | 70/80/90%; 5/7/10 turnos |
| Debilidad | 6 | 3 | daño de ataques y habilidades -5% / -8% / -12% | 70/80/90%; 5/7/10 turnos |

Manto Ígneo consume Maná 3/4/5. Las maldiciones consumen 4/5/6, salvo Debilidad 5/6/7. Todas consumen una acción base de 100.

#### Frío — aura y maldiciones

Identidad: control, ralentización, pérdida de visión y desenganche.

| Contenido | Req. | Grados | Efecto | Prob./duración |
|---|---:|---:|---|---|
| Velo Glacial | 0 | 3 | Res. Frío +10 / +15 / +20; aura radio 2 | 100%; 10 turnos |
| Vulnerabilidad Glacial | 0 | 3 | Res. Frío -10 / -15 / -20 | 70/80/90%; 10 turnos |
| Lentitud | 3 | 3 | movimiento ×1,10/1,15/1,20; ataque ×1,05/1,08/1,10 | 70/80/90%; 5/7/10 turnos |
| Ceguera | 6 | 3 | Percepción máxima 1 en todos los grados | 50/65/80%; 3/5/7 turnos |

Velo Glacial consume Maná 3/4/5; las maldiciones 4/5/6 salvo Ceguera 5/6/7. Acción base 100.

#### Rayo — aura y maldiciones

Identidad: velocidad, precisión e interrupción.

| Contenido | Req. | Grados | Efecto | Prob./duración |
|---|---:|---:|---|---|
| Égida de Tormenta | 0 | 3 | Res. Rayo +10 / +15 / +20; aura radio 2 | 100%; 10 turnos |
| Vulnerabilidad Eléctrica | 0 | 3 | Res. Rayo -10 / -15 / -20 | 70/80/90%; 10 turnos |
| Torpeza | 3 | 3 | Precisión -4 / -6 / -8 | 70/80/90%; 5/7/10 turnos |
| Silencio | 6 | 3 | bloquea habilidades activas | 40/55/70%; 2/3/4 turnos |

Égida consume Maná 3/4/5; Vulnerabilidad/Torpeza 4/5/6; Silencio 6/7/8. Acción base 100.

#### Veneno — aura y maldiciones

Identidad: desgaste, deterioro y supresión mágica.

| Contenido | Req. | Grados | Efecto | Prob./duración |
|---|---:|---:|---|---|
| Velo Antitóxico | 0 | 3 | Res. Veneno +10 / +15 / +20; aura radio 2 | 100%; 10 turnos |
| Vulnerabilidad Tóxica | 0 | 3 | Res. Veneno -10 / -15 / -20 | 70/80/90%; 10 turnos |
| Marchitamiento | 3 | 3 | Regen Vida y Maná -0,5 / -0,75 / -1 | 70/80/90%; 5/7/10 turnos |
| Supresión | 6 | 3 | Pot. Habilidad -5/-10/-15; Pot. Efectos -3/-6/-10 | 70/80/90%; 5/7/10 turnos |

Velo consume Maná 3/4/5; Vulnerabilidad/Marchitamiento 4/5/6; Supresión 5/6/7. Acción base 100.

#### Auras de armas

Todas tienen 3 grados, requisito 4, duración 10 turnos, radio 2, coste 0 Maná y una acción base de 100. Requieren la familia correspondiente para lanzar y para mantener activa la emisión.

| Maestría | Aura | Grado 1 | Grado 2 | Grado 3 |
|---|---|---|---|---|
| Dagas | Aura de Celeridad | mov./ataque +4% velocidad | +7% | +10% |
| Espadas | Aura de Disciplina | Precisión +2; Evasión +1 | +4 / +2 | +6 / +3 |
| Hachas | Aura de Furia | daño ataques/habilidades +5%; crítico +1 | +10%; +2 | +15%; +3 |
| Mandobles | Aura de Ímpetu | daño +6%; Armadura base +5% | +12%; +10% | +18%; +15% |
| Lanzas | Aura de Vigilancia | Percepción +1 | +2 | +3 |
| Arcos | Aura de Precisión | Precisión +3 | +5 | +8 |
| Bastones | Aura de Recuperación | Regen Vida/Maná +0,25 | +0,5 | +1 |
| Varitas | Aura de Enfoque | Pot. Habilidad +5; Efectos +3 | +10 / +6 | +15 / +10 |

#### Auras de armaduras

Misma duración/radio/coste temporal que las auras de armas. Ligera/Media/Pesada requieren las cinco piezas corporales completas; Escudos requiere escudo equipado.

| Maestría | Aura | Grado 1 | Grado 2 | Grado 3 |
|---|---|---|---|---|
| Armadura ligera | Aura de Agilidad | Evasión +2; mov. +3% velocidad | +4; +5% | +6; +8% |
| Armadura media | Aura de Resguardo Elemental | 4 resistencias elementales +4 | +7 | +10 |
| Armadura pesada | Aura de Guardia | Armadura base +5% | +10% | +15% |
| Escudos | Aura de Voluntad | 4 resistencias a efectos + Res. Mental +4 | +7 | +10 |

#### Cantidad de contenido nuevo y elección de progresión

HP4 agrega **44 contenidos aprendibles**:

```text
16 pasivas mágicas
4 auras mágicas
12 maldiciones mágicas
8 auras de armas
4 auras de armaduras/escudo
```

La cantidad de puntos de maestría **no aumenta en HP4**. Esto es deliberado: una maestría pasa a ofrecer más inversiones que puntos específicos y obliga a elegir una construcción. El balance futuro puede revisar puntos, XP, requisitos, costes y magnitudes, pero no debe alterar el motor para hacerlo.

#### Ideas y decisiones futuras documentadas

- `cantidadProyectiles` y `maximoProyectilesSimultaneos`: candidatos de corto plazo para habilidades de arco;
- habilidades transformativas: requieren contrato específico, no un `reemplazar` arbitrario;
- `precisionHechizos`: pendiente porque hoy las habilidades usan la Precisión general;
- `danoElementalGlobal`: pendiente por afectar transversalmente armas y habilidades;
- `potenciaAura`: pendiente; las auras actuales usan grado;
- atributos primarios como objetivos modificables: pendientes de aprobación cuando exista una necesidad real;
- daño físico/mágico global, robo de Vida/Maná y hallazgo de objetos: pendientes de diseño/balance;
- balance posterior de las 48 pasivas físicas de HP3, 16 pasivas mágicas, 28 auras/maldiciones activas, XP, puntos, Maná, duración, radio y probabilidades;
- HP5 implementa Personaje completo, Potencia de Habilidad, Habilidades, Resistencia Mental, ámbito de afijos e iconografía definitiva;
- HP5 completa también la iconografía de las 28 auras/maldiciones; el árbol y los estados compactos de HUD quedan en HP6.

Resultado técnico esperado de HP4:

```text
configuración efectiva única de habilidades + 44 contenidos aprendibles + runtime genérico de auras/maldiciones + Resistencia Mental, todo reutilizando el mismo centralizador
```

### HP5 — Reestructuración de interfaz e identidad visual

**Base:** `70f78115dffe96a223128b5cffbbab0ef58024ce`
**Estado:** Cerrada. Implementación, validación técnica y pruebas manuales superadas y aprobadas por el usuario. El commit final queda a cargo del usuario.

HP5 reorganiza la presentación sin modificar balance, persistencia ni reglas canónicas: Personaje usa el ancho completo; `Magia` pasa visualmente a `Habilidades`; se muestran Potencia de Habilidad y Resistencia Mental; Pasivas y Efectos activos se leen desde sus fuentes canónicas; Inventario y Equipamiento comparten la pantalla `Objetos`; los afijos muestran `Objeto/Portador`; el desglose de estadísticas usa un modal propio y resoluciones ya producidas por el centralizador; y se completan 92 iconos para dejar 104/104 habilidades con recurso real.

Las ocho Maldiciones funcionales `Exposición`, `Debilidad`, `Lentitud`, `Ceguera`, `Torpeza`, `Silencio`, `Marchitamiento` y `Supresión` tienen identidad iconográfica propia y no heredan obligatoriamente la afinidad donde se aprenden. Las cuatro Vulnerabilidades elementales sí conservan identidad elemental.

No se incorpora drag & drop a ranura concreta porque el contrato jugable actual no expone esa selección a la interfaz. No se agregan fórmulas de presentación: las extensiones de desglose son aditivas y de lectura, conservando la misma resolución ya ejecutada.

### HP6 — Árbol genérico, estados en HUD y cierre

**Base:** `bc33b5d90f8ea8d451a80b594bde9889cf9bfbdc`
**Estado:** Cerrada. Implementación, validación técnica y pruebas manuales superadas y aprobadas por el usuario el 18/08/2026. El commit final queda a cargo del usuario.

`OrganizadorArbolHabilidades` es genérico para **todas** las maestrías/habilidades. Ordena verticalmente por `requisitoNivelMaestria`, distribuye los nodos del mismo nivel y dibuja únicamente relaciones respaldadas por datos canónicos. No contiene ramas `magia/físico`, coordenadas manuales por ID ni un eje artificial para maestrías con pocos nodos: si una maestría física actual no dispone de relaciones, sus iconos quedan simplemente ordenados por nivel hasta que futuro contenido forme un grafo real.

Las relaciones del árbol quedaron cerradas con dos reglas de presentación, sin crear requisitos nuevos: las pasivas con `condiciones.idHabilidad` se conectan a esa habilidad concreta; las pasivas cuyo modificador objetivo es `danoHabilidad` y cuyo ámbito usa `maestriaHabilidad` se conectan únicamente a habilidades activas de esa maestría que realmente producen daño directo o daño periódico canónico. Para comprobar daño se usa la configuración de ejecución, no el catálogo de progresión. Auras, Maldiciones y activas sin daño no reciben esas conexiones. Las cuatro Afinidades elementales quedan por tanto conectadas solo con las ofensivas dañinas correspondientes; las maestrías físicas actuales continúan sin relaciones artificiales cuando sus datos no declaran ninguna.

Cada nodo muestra solo el icono y `grado/gradoMaximo`; una habilidad no aprendida se atenúa y una bloqueada por nivel se atenúa aún más. El clic abre un detalle contextual que clasifica el contenido por datos en `Pasiva`, `Aura`, `Maldición` u `Ofensiva`. Cada formato muestra únicamente campos pertinentes —una Aura no presenta `Daño base: —`— y las activas utilizan `ConfiguracionHabilidadEfectiva` para exponer los mismos valores efectivos usados por ejecución/barra. Desde el detalle se aprende/mejora y, cuando corresponde, se asigna o retira de la barra sin crear una segunda progresión.

La ventana de Habilidades prioriza la vista completa del árbol y los recursos se muestran con mayor tamaño en árbol, detalle, barra rápida y estados temporales. La implementación base de HP6 no redimensionó recursos; el ajuste correctivo posterior al commit `d526797646348ac44000f823da3a1e9de22c0cc4` normaliza los seis iconos restantes de 1254×1254 a 128×128, dejando el catálogo completo en 128×128 sin cambiar `Habilidades.json.icono`.

Auras y Maldiciones activas se muestran compactamente encima de experiencia/barra rápida, reutilizando el icono de la habilidad que aplica cada efecto y mostrando turnos de referencia restantes mediante `ceil((venceEn - tiempoActual) / TIEMPO_REFERENCIA)`, sin temporizador paralelo. El Player deja de conservar la representación persistente de efectos etiquetados `aura`/`maldicion`; aplicación, actualización, dispersión/emisión y demás feedback transitorio se mantienen. En otros combatientes la representación persistente sigue disponible.

HP6 conserva `ObservadorCambiosEstadoJugador` como único canal de invalidación y no modifica balance, XP, puntos, persistencia ni reglas canónicas de combate/progresión. Las pruebas manuales acordadas fueron informadas como satisfactorias por el usuario y HP6 queda cerrada documentalmente.

---

## 21. DEPENDENCIAS ENTRE ETAPAS

```text
HP0
 ↓
HP1
 ↓
HP2
 ↓
HP3
 ↓
HP4
 ↓
HP5
 ↓
HP6
```

La secuencia es deliberada:

- HP1 elimina la restricción conceptual a magia sin cargar deuda de migraciones inexistentes;
- HP2 realiza el inventario exhaustivo y cierra el motor canónico junto con la integración de afijos globales, evitando una etapa pequeña separada;
- HP3 utiliza ese motor para diseñar un catálogo amplio de pasivas y cerrar la progresión física;
- HP4 audita profundamente las habilidades y diseña/integra auras y maldiciones, incluyendo efectos sobre enemigos;
- HP5 reestructura Personaje/Objetos, completa desgloses e iconografía sin cambiar balance;
- HP6 incorpora el árbol genérico, estados compactos en HUD y realiza la regresión/cierre final.

Una etapa puede dividirse internamente en bloques de trabajo si resulta extensa, pero no deben crearse motores temporales que luego se descarten.

---

## 22. PRUEBAS OBLIGATORIAS DEL HITO

### 22.1. Progresión

- creación de personaje;
- puntos universales;
- puntos específicos correctos;
- rechazo de punto específico de otra maestría;
- grado máximo;
- requisito de nivel;
- habilidad activa existente sin regresión;
- pasiva no asignable a barra ejecutable.

### 22.2. Modificadores

- inventario documentado de objetivos potenciales encontrado en HP2;
- revisión explícita de variables de escudo/bloqueo;
- revisión explícita de variables de quiver/flechas;
- comprobación de valores equivalentes en jugador y enemigos cuando compartan contrato;

- modificador plano;
- porcentaje sobre base;
- porcentaje sobre total;
- combinación de los tres;
- valor negativo;
- condición cumplida;
- condición no cumplida;
- múltiples fuentes simultáneas;
- clave desconocida rechazada;
- operación desconocida rechazada;
- límites finales de la estadística conservados.

### 22.3. Pasivas de referencia

- arco con Ojo de halcón;
- arma no arco con Ojo de halcón aprendido pero inactivo;
- combate dual con modificación únicamente de penalización de daño secundaria;
- set completo ligero;
- ruptura del set al cambiar una pieza;
- escudo sin afectar la definición de set completo.

### 22.4. Progresión física

- daño 0 no genera XP de arma;
- daño real aplicado genera XP;
- exceso de daño sobre vida restante no genera XP por daño inexistente;
- dos fuentes de ataque atribuyen XP correctamente;
- mitigación 0 no genera XP de armadura;
- mitigación real genera XP;
- conjunto mixto distribuye XP según contribución;
- la suma distribuida conserva la XP total;
- bloqueo/resistencia/evasión no se cuentan como mitigación de Armadura.

### 22.5. Habilidades

- daño de habilidad modificado por maestría/elemento;
- atributo específico de una habilidad;
- atributo general por tipo de habilidad;
- alcance;
- radio;
- cantidad de objetivos/cadena cuando exista caso real;
- coste de Maná cuando se integre;
- pasiva y aura actuando simultáneamente;
- maldición reduciendo el mismo atributo;
- expiración del efecto restableciendo el cálculo automáticamente;
- aura/maldición aplicada a enemigo modifica el valor real del enemigo;
- retirar/expirar el efecto en enemigo restablece su cálculo sin recrear la entidad.

### 22.6. Afijos

- afijo local conserva propiedad dentro del objeto;
- afijo local no se aplica globalmente al portador;
- afijo global solo aplica mientras el objeto esté equipado;
- desequipar elimina el modificador global;
- dos objetos con modificadores compatibles se combinan por el contrato común;
- persistencia del objeto mantiene sus afijos;
- futuras rarezas/legendarios pueden utilizar el mismo contrato sin excepción por ID de objeto.

### 22.7. Interfaz

- tooltip muestra base;
- tooltip muestra modificadores planos;
- tooltip distingue porcentaje sobre base y total;
- tooltip muestra límite final cuando corresponda;
- pasiva aprendida activa;
- pasiva aprendida inactiva con motivo;
- aura activa y duración;
- maldición activa y duración;
- traducción ES/EN;
- redimensionamiento;
- zoom sin afectar paneles HTML;
- ninguna estadística es recalculada por presentación.

### 22.8. Compatibilidad y regresión

- inicio web;
- creación de personaje;
- carga;
- combate físico;
- magia;
- estados temporales;
- inventario;
- equipamiento;
- muerte;
- experiencia;
- botín;
- guardado/carga;
- GitHub Pages;
- Electron;
- ejecución offline en los términos ya soportados por el proyecto;
- sintaxis JS;
- parseo JSON;
- ausencia de configuraciones paralelas.

---

## 23. RIESGOS Y CONTROLES

### 23.1. Convertir el resolutor en un segundo motor

Control:

- el resolutor solo aplica modificadores;
- cada dominio conserva su ecuación base y reglas finales.

### 23.2. Strings libres y errores silenciosos

Control:

- catálogo canónico;
- constantes en código;
- validación estricta de JSON;
- error temprano ante claves desconocidas.

### 23.3. Acumulación ambigua de porcentajes

Control:

- operaciones diferentes para base y total;
- orden matemático único documentado.

### 23.4. Duplicación de estado

Control:

- persistir fuentes, no resultados derivados;
- reconstruir modificadores al cargar.

### 23.5. Condiciones especiales por pasiva

Control:

- contexto y condiciones declarativas;
- prohibición de `if` por nombre/ID de contenido dentro de ecuaciones generales.

### 23.6. Afijos locales y globales mezclados

Control:

- ámbito explícito;
- afijos locales permanecen en composición del objeto;
- afijos globales se convierten en fuentes del portador.

### 23.7. XP física calculada dos veces

Control:

- consumir resultados canónicos de combate;
- deduplicar resoluciones;
- no recomputar daño o mitigación en progresión.

### 23.8. Tooltips que divergen del juego

Control:

- el resolutor devuelve resultado + desglose;
- la UI no mantiene una fórmula duplicada.

### 23.9. Jugador y enemigos divergen en el motor de modificadores

Control:

- el resolutor se diseña para combatientes;
- las ecuaciones equivalentes de enemigos deben consultar los mismos objetivos cuando corresponda;
- auras/maldiciones no pueden depender de una implementación exclusiva de `Player` para alterar estadísticas del objetivo;
- las diferencias legítimas entre tipos de combatiente se expresan mediante contexto/contratos, no mediante un segundo motor.

### 23.10. Catálogo incompleto por diseñar solo a partir de ejemplos

Control:

- HP2 y HP4 son etapas de auditoría fuerte;
- se exige recorrer consumidores reales antes de cerrar objetivos/atributos;
- escudos, quiver y demás dominios descubiertos deben evaluarse expresamente aunque finalmente se decida no exponerlos.

---

## 24. COMPATIBILIDAD WEB, PHASER Y ELECTRON

### Web

El hito debe conservar la arquitectura web estática actual:

- módulos JavaScript;
- JSON;
- HTML/CSS;
- rutas compatibles con publicación web vigente.

No necesita backend ni nuevas dependencias.

### Phaser

Phaser no calcula pasivas, auras, maldiciones, afijos ni atributos modificados.

Solo representa los resultados canónicos cuando una modificación tenga consecuencia visual.

### Electron

Electron debe continuar reutilizando la misma lógica del juego.

No se moverá lógica de modificadores a Node.js ni al proceso principal.

No se requiere una dependencia nueva para este hito salvo que una etapa futura demuestre una necesidad concreta y reciba aprobación explícita.

---

## 25. ARCHIVOS Y ÁREAS CLAVE INICIALES

HP1 cerró la migración de progresión y deja como herencia canónica para las etapas siguientes:

```text
src/juego/maestrias/ContextoProgresoHabilidades.js
src/juego/maestrias/ProgresoHabilidadesJugador.js
src/juego/maestrias/ValidadorConfiguracionProgresoHabilidades.js
src/config/habilidades/Maestrias.json
src/config/habilidades/Habilidades.json
src/interfaz/habilidades/PanelHabilidadesMaestrias.js
src/interfaz/habilidades/IntegracionHabilidadesDom.js
src/partida/PersistenciaJugador.js
src/partida/EstadoPartida.js
```

Las etapas siguientes deben revisar según alcance:

```text
src/juego/modificadores/ContratosModificadoresCombatiente.js
src/juego/modificadores/SistemaModificadoresCombatiente.js
src/entidad/destructible/combatiente/EstadisticasDerivadas.js
src/entidad/destructible/combatiente/ConfiguracionAtaque.js
src/juego/efectos/ContratosEfectosTemporales.js
src/juego/efectos/SistemaEfectosTemporales.js
src/juego/objetos/SistemaAfijos.js
src/juego/espacio/SistemaEspacial.js
src/juego/zonas/SistemaZonasTemporales.js
src/entidad/destructible/combatiente/Combatiente.js
src/entidad/destructible/combatiente/Player.js
src/entidad/destructible/combatiente/Enemigo.js
src/config/objetos/afijos/Prefijos.json
src/config/objetos/afijos/Sufijos.json
src/interfaz/PanelPersonaje.js
```

No debe asumirse que esta lista reemplaza el análisis de imports, instancias y flujo real obligatorio de cada etapa.

---

## 26. DECISIONES CERRADAS

Quedan aprobadas como dirección del hito:

1. existe una única progresión general de habilidades y un único centralizador de modificadores;
2. no se conservan wrappers, configuraciones históricas ni migraciones de partidas;
3. pasivas, afijos del portador, efectos temporales, terreno, zonas, auras, maldiciones y variantes usan `SistemaModificadoresCombatiente` cuando afectan un objetivo registrado;
4. las propiedades `local_objeto` continúan dentro del objeto; las de `portador` no se fusionan con ellas;
5. toda operación matemática real necesaria se incorpora al contrato común en vez de calcularse en paralelo;
6. las ocho operaciones vigentes son `sumar`, `porcentaje_base`, `porcentaje_total`, `porcentaje_multiplicativo`, `porcentaje_inverso`, `multiplicar_redondear`, `multiplicar` y `limitar_maximo`;
7. `multiplicarMas` y `aumentarVelocidad` quedan sustituidos por semánticas canónicas y desaparecen como operaciones históricas;
8. Player y Enemigo utilizan el mismo centralizador, incluida Percepción y Resistencia Mental;
9. terreno/zonas se consultan desde el estado espacial real y no se copian como estadísticas persistidas;
10. las auras son emisiones móviles ligadas al emisor, no zonas estáticas;
11. una misma aura en un mismo emisor renueva; emisores distintos pueden aportar simultáneamente;
12. las auras físicas dependen del equipamiento actual del emisor durante su vigencia;
13. las maldiciones usan Resistencia Mental para reducir probabilidad de aplicación;
14. Resistencia Mental usa `base + 2 × Sabiduría`, pasa por el centralizador y se limita a 0–75;
15. Ceguera limita Percepción a 1 y nunca modifica alcance; los grados solo aumentan probabilidad/duración;
16. Silencio bloquea habilidades activas y permite movimiento, espera y ataques con arma;
17. `modificador_factor` se elimina y los efectos numéricos temporales utilizan `modificador_combatiente`;
18. Potencia de Efectos se declara por efecto mediante `ninguna`, `valor`, `duracion` o `valor_y_duracion`;
19. Envenenamiento y Quemadura conservan escalado de valor; el resto actual usa `ninguna` salvo decisión futura;
20. las auras/maldiciones iniciales no escalan automáticamente con Potencia de Efectos;
21. el snapshot de habilidad/efecto/zona se fija al confirmar/aplicar; las defensas del objetivo siguen siendo dinámicas;
22. HP4 usa solo dos nuevos objetivos: `danoHabilidad` y `atributoHabilidad`;
23. `atributoHabilidad` exige una clave validada del registro canónico;
24. los 18 atributos productivos quedan documentados con significado, unidad y consumidor;
25. `cantidadProyectiles` y `maximoProyectilesSimultaneos` quedan reservados a corto plazo sin activarse prematuramente;
26. los campos estructurales de habilidades permanecen fuera del motor numérico hasta un diseño transformativo explícito;
27. HP3 aporta el contexto de arma/armadura completo y HP4 agrega contexto específico de habilidad; ambos están documentados y comentados en código;
28. no se crea `SistemaModificadoresHabilidad`: `ConfiguracionHabilidadEfectiva` solo construye el snapshot usando el centralizador existente;
29. no se crea `SistemaAuras` ni `SistemaMaldiciones`;
30. `SistemaEfectosTemporales` conserva duración/renovación/acumulación; el centralizador conserva la matemática;
31. HP3 incorpora 12 maestrías físicas y 48 pasivas; su proveedor descubre pasivas/grados pero no evalúa condiciones;
32. HP3 usa un único `SistemaExperienciaMaestrias` con daño/mitigación ya resueltos;
33. `Básicas` permanece vacía hasta diseñar una fuente de progresión natural;
34. HP4 agrega 16 pasivas mágicas de un grado;
35. HP4 agrega 4 auras mágicas elementales de resistencia, aprendibles desde nivel 0 y de 3 grados;
36. HP4 agrega 12 maldiciones distribuidas tres por afinidad mágica;
37. HP4 agrega 8 auras de armas y 4 de armaduras/escudo, todas de 3 grados y requisito de maestría 4;
38. las auras tienen duración inicial 10 turnos y radio 2; las físicas cuestan 0 Maná pero consumen acción;
39. Fuego se orienta a presión/ruptura, Frío a control/desenganche, Rayo a interrupción y Veneno a desgaste/supresión;
40. cada afinidad mágica dispone de aura de su resistencia elemental y maldición que reduce esa resistencia;
41. la cantidad de puntos de maestría no aumenta con el nuevo contenido: la elección de build es deliberada y el balance se revisará después;
42. no se incrementa el esquema de persistencia en HP4; configuración efectiva, auras y maldiciones son derivadas/temporales y no requieren migración;
43. los perfiles visuales de nuevas habilidades/efectos reutilizan contratos genéricos existentes; no se crean assets gráficos nuevos en HP4;
44. la UI de Habilidades muestra los valores configurados de auras/maldiciones sin recalcular estadísticas;
45. las herramientas de depuración/regresión no pueden asumir que el catálogo total sigue teniendo solo doce habilidades activas;
46. tooltips/paneles consumen datos canónicos y nunca reproducen la fórmula del centralizador;
47. HP5 debe mostrar Potencia de Habilidad, revisar el nombre Magia/Habilidades, mostrar el ámbito de los afijos y diseñar iconografía definitiva de pasivas;
48. HP5 completa la iconografía definitiva de auras/maldiciones: las Vulnerabilidades elementales conservan identidad de afinidad y las ocho Maldiciones funcionales poseen identidad visual propia;
49. `precisionHechizos`, `danoElementalGlobal`, `potenciaAura`, atributos primarios, robos y hallazgo permanecen pendientes de decisión explícita;
50. cualquier futura transformación estructural de habilidades requiere nueva aprobación y un contrato específico;
51. HP6 utiliza un único `OrganizadorArbolHabilidades` para todas las maestrías, sin condiciones magia/físico ni disposición manual por ID;
52. una maestría con pocas habilidades puede quedar sin conexiones; no se generan ejes, ramas ni dependencias ficticias para completar visualmente el árbol;
53. los nodos del árbol muestran solo icono y `grado/maximo`, con opacidad reducida cuando no están aprendidos y mayor atenuación cuando están bloqueados por nivel;
54. el detalle de una habilidad se abre por clic y usa presentaciones específicas `Pasiva/Aura/Maldición/Ofensiva`, mostrando únicamente campos aplicables;
55. los valores activos del detalle se obtienen mediante `ConfiguracionHabilidadEfectiva` y la interfaz no recalcula atributos de habilidad;
56. aprender/mejorar y gestionar la barra desde el detalle reutiliza `ProgresoHabilidadesJugador` y `SistemaHabilidadesJugador` sin una ruta paralela;
57. HP6 aumenta el tamaño de presentación de iconos y el ajuste correctivo posterior al cierre normaliza a 128×128 los seis PNG que aún estaban sobredimensionados, sin cambiar rutas ni contratos;
58. Auras y Maldiciones activas se presentan en HUD con icono y turnos de referencia restantes, derivados del efecto temporal real y sin temporizador visual paralelo;
59. el Player no conserva la representación persistente de efectos etiquetados `aura`/`maldicion`, pero mantiene feedback transitorio; otros combatientes conservan su lectura persistente;
60. HP6 no modifica balance, XP, puntos, persistencia ni reglas canónicas de combate o progresión.
61. una relación de Afinidad basada en `danoHabilidad` solo se dibuja hacia habilidades activas de la misma maestría que produzcan daño real directo o periódico; no se conecta a Auras, Maldiciones ni activas sin daño;
62. la detección de daño para el árbol consulta la configuración canónica de ejecución, mientras la definición del modificador de la pasiva continúa proviniendo de progreso/configuración de habilidades;
63. las pruebas manuales finales de HP6 fueron declaradas satisfactorias por el usuario el 18/08/2026 y el hito de habilidades/pasivas queda cerrado documentalmente.
64. el Panel Personaje no repite un título interno dentro del panel superpuesto; la cabecera externa es la única cabecera visible;
65. `Efectos activos` resuelve sus iconos mediante la configuración canónica de ejecución (`efectoId → habilidad → icono`) y no mediante el catálogo reducido de progreso.
66. HP-AUD no crea HP7 ni un refactor general: certifica el hito cerrado y corrige únicamente deuda demostrada por evidencia.
67. la semántica para escalar la magnitud de un descriptor según su operación pertenece a `ContratosModificadoresCombatiente.js`; Potencia de Efectos y acumulaciones temporales reutilizan esa única función.
68. `SistemaExperienciaMaestrias` sigue siendo la única ruta productiva que traduce hechos jugables a XP; `Player` no expone un atajo directo de XP y las herramientas de depuración/balance pueden inyectar progreso únicamente como soporte explícito de prueba/análisis.

---

## 27. DECISIONES DE BALANCE Y CONTENIDO FUTURO ABIERTAS

No bloquean HP4 ni cambian la arquitectura:

- balance fino de las 48 pasivas físicas de HP3;
- balance fino de las 16 pasivas mágicas de HP4;
- balance de las 28 habilidades activas nuevas de aura/maldición: Maná, duración, radio, alcance, probabilidad y magnitudes;
- balance de factores de XP `0,75 / 8 / 4` y curva de maestrías;
- revisión futura de la cantidad de puntos de maestría frente a la mayor cantidad de opciones aprendibles;
- posible incorporación a corto plazo de `cantidadProyectiles` y `maximoProyectilesSimultaneos` cuando existan habilidades de arco que los consuman;
- definición futura de habilidades transformativas;
- decisión sobre `precisionHechizos`, `danoElementalGlobal`, `potenciaAura`, atributos primarios modificables, daño global, robo de Vida/Maná y hallazgo de objetos;

Estos valores y decisiones deben permanecer configurables siempre que la arquitectura real lo permita. Ninguna etapa de balance debe introducir ramas especiales por nombre de contenido.

---

## 28. CRITERIOS DE CIERRE DEL HITO

El hito completo solo puede cerrarse cuando:

- existe una única progresión general de habilidades;
- no queda una progresión productiva paralela exclusivamente mágica para el mismo propósito;
- existe un único registro canónico de objetivos modificables;
- existe un único resolutor de modificadores;
- no existen implementaciones por nombre visible para las pasivas incorporadas;
- porcentaje sobre base y porcentaje sobre total producen resultados reproducibles;
- pasivas reales modifican estadísticas/combate mediante el resolutor;
- atributos de habilidades pueden ser modificados mediante el mismo contrato;
- auras/maldiciones reutilizan el ciclo de vida temporal existente y pueden modificar jugador o enemigos mediante el mismo resolutor;
- afijos globales reutilizan modificadores y afijos locales continúan siendo locales;
- XP de armas y armaduras usa resultados canónicos;
- el panel Personaje muestra pasivas y efectos activos;
- los tooltips muestran desgloses coherentes con los valores reales;
- persistencia no guarda resultados derivados duplicados;
- el nuevo esquema de persistencia guarda y carga correctamente sin depender de migraciones históricas;
- herramientas de balance/depuración afectadas están actualizadas;
- versión web funciona;
- Electron funciona cuando corresponda a la validación disponible;
- documentación visual se actualiza si el contrato de presentación cambia;
- no se instalaron dependencias no aprobadas;
- Git status final fue revisado;
- existe documento de entrega del cierre;
- existe Conventional Commit propuesto;
- no se avanzó automáticamente a otro hito.

---

## 29. REGLA DE ORO DEL HITO

> **El contenido declara modificaciones; las ecuaciones canónicas declaran puntos modificables; un único resolutor conecta ambos mediante IDs y contexto canónicos.**

Si agregar una nueva pasiva, aura, maldición o afijo global sobre un objetivo ya soportado obliga a editar `SistemaCombate`, una habilidad concreta, un enemigo concreto o un panel para introducir una excepción, la implementación no está respetando este Plan Maestro. El mismo objetivo canónico debe poder resolverse para cualquier combatiente compatible con esa regla.

## HP4 — Ajuste incremental de refresco centralizado de interfaz

Queda establecido un **único canal canónico de invalidación** para cambios del estado del jugador capaces de alterar valores derivados visibles en la interfaz:

- archivo canónico: `src/juego/estado/ObservadorCambiosEstadoJugador.js`;
- no envía números calculados ni conoce paneles concretos;
- agrupa cambios mediante microtarea y emite solo invalidaciones semánticas;
- integra progresión de habilidades decorando `ProgresoHabilidadesJugador` y recibe además notificaciones explícitas desde el procesamiento central de acciones;
- cualquier fuente futura (equipo, efectos, recursos, atributos u otra mutación canónica) debe notificar a través de este observador, no actualizar componentes visuales directamente.

La estrategia de presentación queda así:

```text
estado canónico cambia
        ↓
ObservadorCambiosEstadoJugador
        ↓
CoordinadorActualizacionPresentacionDom
        ↓
Panel Personaje / HUD / Barra / Panel de Habilidades
releen el estado canónico
```

Reglas explícitas:

- los sistemas de dominio **no** empujan valores derivados a la UI;
- la UI vuelve a consultar estado y cálculos canónicos al refrescar;
- un cambio puramente numérico **no** obliga a redibujar Phaser;
- Phaser solo debe repintarse cuando exista un cambio visual del mundo;
- queda retirado `ObservadorProgresoHabilidades.js` como ruta visual específica.
- la validación manual de este contrato de refresco fue superada y aprobada por el usuario antes del cierre de HP4.

### HP5 — Regla de lectura cruzada de atributos y estadísticas

El detalle del Panel Personaje debe permitir navegación conceptual en ambos sentidos: un atributo primario informa a qué estadísticas aporta y cada estadística derivada informa qué atributos primarios participan en su valor base. Los aportes se consultan mediante una función de lectura ubicada junto al cálculo canónico de `EstadisticasDerivadas`; la interfaz no reproduce coeficientes ni fórmulas y el contrato existente del objeto de estadísticas derivadas permanece intacto.

El modal de detalle debe incluir una descripción funcional breve de cada atributo/estadística además del desglose numérico. Cuando un aporte de atributo ya forma parte de `valorBase`, la presentación debe indicarlo explícitamente para evitar una lectura de doble suma.

`Mitigación de bloqueo` forma parte de las estadísticas de combate visibles y utiliza el mismo resultado canónico que combate; su desglose es únicamente una extensión de lectura de esa resolución.


### Cierre validado de HP5

La validación manual final fue superada y aprobada por el usuario el 18/08/2026. Quedan confirmados como parte del estado heredado hacia HP6:

- Panel Personaje de ancho completo, sin Equipamiento embebido;
- pantalla `Objetos` con Inventario y Equipamiento presentados conjuntamente sin fusionar sus responsabilidades;
- sección `Habilidades`, Potencia de Habilidad y Resistencia Mental visibles;
- Pasivas aprendidas y Efectos activos alimentados por sus fuentes canónicas;
- modal propio de detalle de estadísticas, con descripción funcional y desglose sin fórmulas duplicadas en UI;
- lectura cruzada atributo primario → estadísticas afectadas y estadística derivada → aportes primarios mediante `obtenerAportesAtributosPrimarios`;
- `Mitigación de bloqueo` visible y desglosada usando el valor canónico de combate;
- afijos identificados visualmente como `Objeto` o `Portador` a partir de `ambito`;
- catálogo completo de 104/104 habilidades con icono real 128×128;
- ocho Maldiciones funcionales con identidad visual propia, independiente de la afinidad donde se aprenden;
- ausencia de cambios de balance, persistencia o reglas canónicas en HP5.

HP6 hereda esta base estable y queda destinada al árbol genérico de habilidades, estados compactos de Auras/Maldiciones en HUD, retirada del punto persistente del Player manteniendo feedback transitorio y regresión Web/Electron.


---

## HP-AUD — Auditoría post-hito de habilidades y modificadores

### Objetivo y alcance

HP-AUD es una auditoría extraordinaria posterior a HP6. No constituye HP7 ni reabre el hito funcional. Su objetivo es comprobar el resultado conjunto de HP1–HP6 buscando motores duplicados, código histórico productivo, dependencias incorrectas, cálculos repetidos y rutas alternativas que pudieran erosionar los contratos canónicos.

La auditoría confirmó como estructura vigente:

```text
fuentes declarativas
  ↓
SistemaModificadoresCombatiente
  ↓
resultado/desglose canónico
  ↓
combate / habilidades / tiempo / estadísticas
  ↓
HTML o Phaser representa
```

También confirmó una única progresión `ProgresoHabilidadesJugador`, un único traductor productivo `SistemaExperienciaMaestrias`, un único sistema temporal y una persistencia basada en fuentes, sin resultados derivados guardados.

### Hallazgos aprobados

Se aprobaron tres correcciones acotadas:

1. restaurar `README.md`, reemplazado accidentalmente durante entregas incrementales por instrucciones puntuales que no representaban el repositorio;
2. retirar la duplicación de la regla que escalaba magnitudes de modificadores en `CalculadorAtributosMagicos.js` y `SistemaEfectosTemporales.js`;
3. retirar `Player.agregarExperienciaMaestria()`, que permitía saltarse el traductor canónico aunque el gameplay no la utilizaba.

Quedan fuera de HP-AUD los assets históricos bajo `assets/imagenes/jugador/old/` y deudas anteriores al hito que no fueron introducidas por HP1–HP6.

### Implementación

- `ContratosModificadoresCombatiente.js` expone `escalarMagnitudModificador(descriptor, escala)` como semántica única de escalado.
- `CalculadorAtributosMagicos.js` y `SistemaEfectosTemporales.js` reutilizan esa función y eliminan sus copias locales.
- `Player` mantiene `registrarExperienciaMaestria()` hacia `SistemaExperienciaMaestrias` y deja de exponer suma directa de XP.
- `DepuradorMagiaHabilidades` conserva la capacidad de inyectar XP para pruebas, pero accede explícitamente al progreso desde la capa de depuración.
- `README.md` vuelve a ser la guía funcional completa y queda actualizado al estado posterior a HP6: 16 maestrías, 104 habilidades, pasivas/auras/maldiciones, árbol genérico, HUD y contratos canónicos actuales.

### Validación automática realizada

Sobre la base `e47d2caef9257e64cd663fc8bbc49852b19f163e`:

- 277 archivos JavaScript entre `game.js`, `src/` y `electron/`: sintaxis correcta;
- 38 JSON: parseo correcto;
- imports relativos faltantes: 0;
- ciclos ES detectados: 0;
- configuración: 16 maestrías, 104 habilidades (40 activas/64 pasivas) y 35 efectos válidos;
- 104/104 iconos de habilidades presentes y 128×128;
- escalado centralizado comparado contra la implementación previa: 40/40 combinaciones equivalentes sobre las ocho operaciones;
- validaciones negativas del escalador: operación, magnitud y escala inválidas producen error explícito;
- snapshot mágico con Potencia de Efectos: resultados esperados;
- acumulación temporal real: suma, multiplicación respecto del neutro y límite máximo conservan resultados;
- `Player.prototype.agregarExperienciaMaestria`: ausente; `registrarExperienciaMaestria`: presente;
- referencias directas a `agregarExperienciaMaestria` quedan limitadas al progreso, traductor canónico, observador de cambios y herramientas de balance/depuración;
- `git diff --check`: correcto;
- servido HTTP: recursos críticos comprobados con HTTP 200 y sin 404.

La prueba headless con Chromium volvió a quedar limitada por DBus/proceso gráfico del entorno. No se clasifica como ejecutada ni superada.

### Estado

Las correcciones aprobadas están implementadas y la validación automática es satisfactoria. HP-AUD queda **pendiente de validación manual del usuario** antes de marcarse Cerrada y antes de proponer el cierre definitivo del hito auditado.
