# PLAN MAESTRO — HABILIDADES PASIVAS Y MODIFICADORES CANÓNICOS

**Proyecto:** Dark Moon  
**Hito:** Habilidades pasivas  
**Idioma obligatorio:** Español para código nuevo, nombres técnicos nuevos, comentarios, documentación y configuraciones nuevas.  
**Fuente de verdad de implementación:** el repositorio real entregado al iniciar cada etapa.  
**Estado:** Plan maestro rector. HP0 quedó documentada; HP1, HP2 y HP3 están cerradas. HP3 fue implementada sobre el cierre HP2 `f8ea59521d521e09cc0dfc0ccf2b805e6ca2fc65`, con validación técnica y pruebas manuales superadas y aprobadas por el usuario. Cada etapa requiere análisis del repositorio real, propuesta concreta y aprobación explícita antes de modificar código.

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

#### Previstos para HP4

HP4 debe auditar y cerrar los objetivos/atributos internos de habilidades. El inventario real detectado incluye, entre otros:

```text
costoManaHabilidad
costoTemporalHabilidad
alcanceHabilidad
radioHabilidad
danoHabilidad
cantidadObjetivos
cantidadSaltos
alcanceSalto
factorDanioPorSalto
probabilidadEfecto
duracionEfecto
intensidadEfecto
intervaloEfecto
parametrosZonaTemporal
```

Los nombres canónicos finales y la decisión de si cada campo merece ser modificable se aprueban en HP4. No se crean claves de producción en HP2 sin consumidor formalizado.

#### Pendientes de decisión explícita en una etapa posterior

La auditoría identificó candidatos que no deben incorporarse automáticamente:

```text
fuerza
destreza
constitucion
inteligencia
sabiduria
carisma
resistenciaMental
potenciaAura
multiplicadorDanioMagico
danoFisicoGlobal
danoElementalGlobal
danoHechizosGlobal
probabilidades globales especiales de estados
precisionHechizos
potenciaHechizos
velocidadLanzamiento
velocidadMovimiento aportada por equipo
roboVida
roboMana
cantidadObjetosEncontrados
rarezaObjetosEncontrados
```

También queda pendiente para HP3 definir la semántica de `categoriaArmadura` cuando exista equipamiento mixto antes de utilizar condiciones de pasivas de armadura.

Los afijos reservados contienen además operaciones históricas no activas denominadas `aumentarVelocidad` y `multiplicarMas`. Se registran como hallazgo de auditoría, pero no se reinterpretan ni activan en HP2. La etapa que vaya a utilizarlas debe decidir si corresponden a una operación canónica existente, si necesitan una nueva operación o si el contenido debe reformularse.

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

### 6.1. Operaciones canónicas vigentes tras HP2

La auditoría real obligó a ampliar el contrato inicial. El centralizador soporta:

```text
sumar
porcentaje_base
porcentaje_total
multiplicar_redondear
multiplicar
```

No existe una operación ambigua denominada solamente `porcentaje`.

La regla de diseño aprobada es:

> **Si una fuente real modifica un objetivo registrado mediante una semántica matemática que el contrato todavía no representa, debe ampliarse el contrato canónico. No se permite dejar ese cálculo por fuera de `SistemaModificadoresCombatiente` únicamente para evitar agregar una operación.**

Tampoco se crean operaciones preventivas que ningún flujo real utilice.

### 6.2. Significado de las operaciones

`sumar`
: suma o resta un valor plano.

`porcentaje_base`
: suma porcentajes que se calculan exclusivamente sobre el valor base original.

`porcentaje_total`
: suma porcentajes que se aplican sobre el subtotal obtenido después de planos y porcentajes sobre base.

`multiplicar`
: compone factores multiplicativos sin redondeo intermedio. Esta operación representa, entre otros casos, los modificadores actuales de factores temporales.

`multiplicar_redondear`
: multiplica en una etapa previa y redondea el resultado de esa etapa antes de los multiplicadores normales posteriores. HP2 la incorpora porque las variantes enemigas ya tenían exactamente esa semántica sobre factores temporales y eliminar ese redondeo habría cambiado resultados combinados.

### 6.3. Orden canónico

Para un valor base `B`:

```text
P  = suma de modificadores sumar
PB = suma de porcentaje_base expresada como fracción
PT = suma de porcentaje_total expresada como fracción
MR = producto de multiplicar_redondear
M  = producto de multiplicar

subtotal = B + P + (B × PB)
despuesPorcentajeTotal = subtotal × (1 + PT)

despuesMultiplicacionRedondeada =
  si existen MR: round(despuesPorcentajeTotal × MR)
  si no: despuesPorcentajeTotal

resultadoModificado = despuesMultiplicacionRedondeada × M
```

Ejemplo sin multiplicadores:

```text
Base                         100
Plano                        +20
10% sobre base              +10
Subtotal                     130
25% sobre total             +32,5
Resultado modificado        162,5
```

Ejemplo real de dos ralentizaciones temporales:

```text
factor base        1
ralentización A    × 1,40
ralentización B    × 1,60
resultado          2,24
```

Ambos multiplicadores son fuentes del centralizador; `SistemaEfectosTemporales` conserva su ciclo de vida pero ya no calcula ni escribe el factor final.

Ejemplo de variante enemiga + efecto posterior:

```text
factorMovimiento base del enemigo: 85
Gigante: multiplicar_redondear × 1,25
etapa redondeada: round(106,25) = 106
Efecto temporal posterior: multiplicar × 1,08
resultado: 114,48
```

Esto reproduce el orden histórico sin mantener una excepción fuera del motor.

### 6.4. Límites y redondeos propios del dominio

`multiplicar_redondear` forma parte de la semántica de composición de una fuente y por eso pertenece al centralizador.

En cambio los límites y redondeos propios del resultado final continúan perteneciendo al dominio propietario.

Ejemplos:

- resistencia máxima;
- probabilidad máxima de bloqueo;
- crítico máximo;
- alcance mínimo entero;
- Vida/Maná máximos enteros.

Conceptualmente:

```text
valor base
  ↓
SistemaModificadoresCombatiente
  ↓
resultado modificado
  ↓
regla propietaria aplica su límite/redondeo final
  ↓
resultado canónico consumido
```

### 6.5. Penalizaciones y valores negativos

`sumar`, `porcentaje_base` y `porcentaje_total` admiten valores positivos y negativos.

Los multiplicadores deben ser no negativos. Los mínimos funcionales finales pertenecen al objetivo/regla correspondiente.

### 6.6. Operaciones pendientes detectadas en contenido reservado

Los catálogos de afijos contienen actualmente, solo en contenido no activo, los nombres:

```text
aumentarVelocidad
multiplicarMas
```

HP2 no les asigna una interpretación automática. Permanecen documentados como deuda de diseño. Cuando una etapa quiera activar esos afijos deberá decidir explícitamente si:

1. se expresan con una operación canónica ya existente;
2. requieren una operación nueva con semántica precisa;
3. deben reformularse.

No podrán introducir un cálculo paralelo.

---

## 7. CONTEXTO Y CONDICIONES

### 7.1. Contexto canónico disponible tras HP3

El contrato canónico admite estas claves para modificadores de combatiente:

```text
tipoCombatiente
familiaArma
familiaSecundaria
mano
tipoAtaque
esAtaqueDual
categoriaArmadura
conjuntoArmaduraCompleto
```

Una clave de contexto desconocida produce error explícito.

Los valores de contexto deben ser escalares declarativos: texto, número finito, booleano o `null`. Las condiciones pueden usar uno de esos valores o una lista no vacía de valores escalares. No se aceptan funciones, objetos ejecutables ni expresiones JavaScript arbitrarias.

`tipoCombatiente` se inyecta desde `Combatiente`. Los contextos de ataque aportan familia, mano, tipo de ataque y condición dual cuando corresponde. `familiaSecundaria` permite distinguir, entre otros casos, la presencia real de escudo o una segunda arma.

HP3 cierra la semántica del equipo corporal: `categoriaArmadura` puede ser `ligera`, `media`, `pesada`, `mixta` o `null`; `conjuntoArmaduraCompleto=true` exige que las cinco ranuras corporales —cabeza, torso, manos, piernas y pies— estén ocupadas. El escudo no participa de esa clasificación. Una mezcla de categorías produce `mixta`, y quitar una sola pieza vuelve el conjunto incompleto aunque las restantes pertenezcan a la misma categoría.

### 7.2. Ampliaciones previstas

HP4 deberá decidir e incorporar únicamente las claves necesarias para modificadores internos de habilidades. Candidatas detectadas:

```text
idHabilidad
maestria
elemento
tipoHabilidad
atributoHabilidad
```

No se consideran disponibles antes de quedar registradas en el mismo contrato canónico.

### 7.3. Condiciones declarativas

Los modificadores pueden declarar condiciones simples que el evaluador común compara contra el contexto.

Ejemplos ya expresables:

```text
familiaArma = arco
mano = secundaria
esAtaqueDual = true
tipoCombatiente = enemigo
```

Ejemplos que requieren la ampliación de HP4:

```text
idHabilidad = explosion_ignea
maestria = frio
tipoHabilidad = area
```

No debe existir código específico por pasiva, aura, maldición, afijo, terreno o variante.

### 7.4. Pasiva aprendida pero inactiva

Una pasiva puede estar aprendida y no aplicar en el contexto actual.

Ejemplo:

```text
Ojo de halcón
Aprendida: sí
Arma actual: espada
Estado actual: inactiva
Motivo: requiere arco
```

La interfaz debe poder diferenciar aprendizaje de aplicabilidad actual utilizando el desglose del mismo resolutor, sin recalcular la condición por separado.

---

## 8. MODIFICADORES DE HABILIDADES ACTIVAS — RESERVADOS PARA HP4

HP2 no registra todavía objetivos internos de habilidades activas. La auditoría confirmó que existen suficientes parámetros diferentes como para requerir la etapa de diseño fuerte prevista en HP4.

### 8.1. Daño de habilidades

`danoHabilidad` continúa como objetivo conceptual previsto, no como clave productiva de HP2.

HP4 debe decidir su representación exacta y el contexto necesario para permitir modificaciones:

- sobre una habilidad concreta;
- por maestría;
- por elemento;
- por tipo de habilidad;
- por otras propiedades canónicas que la auditoría de HP4 apruebe.

Ejemplo futuro conceptual:

```text
objetivo: danoHabilidad
operacion: porcentaje_base
valor: 15
condicion:
  elemento: fuego
```

### 8.2. Atributos internos de habilidad

Alcance de habilidad, radio, cantidad de objetivos, coste de Maná, duración, probabilidad de efectos y parámetros equivalentes necesitan un contrato adicional basado en los consumidores reales.

HP4 debe decidir si conviene un objetivo general acompañado por una clave de atributo, objetivos específicos, o una combinación que preserve claridad y validación fuerte. No se fija esa decisión en HP2.

El requisito ya cerrado es que, una vez incorporados como objetivos modificables, **su valor final también debe atravesar el mismo `SistemaModificadoresCombatiente`**. No se creará un resolutor especial de habilidades.

### 8.3. Regla de integración futura

Cada atributo de habilidad se integra una sola vez en su punto canónico de consumo.

Después de esa integración, nuevas pasivas, auras, maldiciones, terreno o afijos que modifiquen ese atributo no deben requerir cambios en la habilidad concreta ni un cálculo paralelo.

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
ligero          velocidadAtaqueLocalPorcentaje     operacion: aumentarVelocidad
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
despiadado          danioFisicoMasPorcentaje            operacion: multiplicarMas
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
de_celeridad         velocidadMovimientoPorcentaje      operacion: aumentarVelocidad
de_fortuna           rarezaObjetosEncontradosPorcentaje
de_abundancia        cantidadObjetosEncontradosPorcentaje
del_taumaturgo       danioHechizosAumentadoPorcentaje
de_canalizacion      velocidadLanzamientoPorcentaje     operacion: aumentarVelocidad
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

**Estado:** Cerrada sobre `f8ea59521d521e09cc0dfc0ccf2b805e6ca2fc65` como commit base, con implementación, validación técnica y pruebas manuales superadas y aprobadas por el usuario; pendiente únicamente del commit final de HP3.

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

#### Auras aprobadas para HP4

HP3 deja diseñado el catálogo funcional, sin runtime todavía:

1. Aura de Guardia: +15% Armadura base.
2. Aura de Celeridad: movimiento ×0,90 y ataque ×0,95.
3. Aura de Precisión: +8 Precisión.
4. Aura de Enfoque: +15 Potencia de Habilidad y +10 Potencia de Efectos.
5. Aura de Recuperación: +1 regeneración de Vida y +1 de Maná.
6. Aura de Resguardo Elemental: +10 a las cuatro resistencias elementales.
7. Aura de Voluntad: +10 a las cuatro resistencias de efectos.
8. Aura de Vigilancia: +2 Percepción.

#### Maldiciones aprobadas para HP4

1. Torpeza: -8 Precisión.
2. Exposición: -15% Armadura base.
3. Lentitud: movimiento ×1,20 y ataque ×1,10.
4. Supresión: -15 Potencia de Habilidad y -10 Potencia de Efectos.
5. Marchitamiento: -1 regeneración de Vida y de Maná.
6. Vulnerabilidad elemental: -10 a las cuatro resistencias elementales.
7. Ceguera: -3 Percepción y -1 Alcance.
8. Debilidad: -10% daño de fuente.

HP4 debe decidir emisión, radio, duración, renovación, convivencia, objetivos y cualquier atributo interno de habilidades necesario. No debe crear otro resolutor: cuando una aura o maldición modifique un objetivo registrado, su descriptor termina en `SistemaModificadoresCombatiente`.

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

HP4 es también una etapa de **análisis y diseño fuerte**.

Antes de implementar debe auditar todas las habilidades activas y sus contratos reales para identificar qué parámetros tiene sentido exponer al sistema de modificadores. No debe limitarse a alcance, radio, daño o cantidad de objetivos ya citados.

Debe revisar, según existan realmente:

- daño;
- alcance;
- radio/área;
- formas o patrones de selección;
- cantidad de objetivos;
- cantidad y alcance de saltos/cadenas;
- coste de Maná;
- costes temporales;
- probabilidad de aplicar efectos;
- duración/intensidad/acumulaciones de efectos;
- intervalos/ticks;
- cantidades de proyectiles o impactos;
- parámetros de zonas temporales;
- condiciones de objetivo;
- cualquier otra variable de habilidad que pueda ser modificada sin convertir el JSON en código.

Después debe proponer y aprobar el catálogo inicial de `ATRIBUTOS_HABILIDAD` y sus puntos exactos de integración.

Debe tomar el catálogo funcional de auras/maldiciones aprobado en HP3 y **refinar su representación técnica** cuando dependa de atributos internos de habilidades o nuevos tipos de modificador descubiertos en esta auditoría. HP4 puede proponer ajustes si el análisis real demuestra que algún diseño de HP3 no puede expresarse limpiamente sin romper los contratos canónicos.

Requisitos específicos:

- incorporar `DANO_HABILIDAD`;
- incorporar `ATRIBUTO_HABILIDAD`;
- integrar cada atributo una sola vez en su consumidor canónico;
- permitir modificadores generales, por maestría, elemento, tipo o habilidad específica mediante contexto;
- permitir que auras/maldiciones modifiquen tanto al jugador como a enemigos afectados;
- comprobar explícitamente casos donde una maldición lanzada por el jugador altera una estadística o capacidad de un enemigo sin lógica específica del enemigo;
- conservar `SistemaEfectosTemporales` como dueño del ciclo de vida.

Resultado esperado:

```text
habilidades activas y efectos temporales completamente integrados al mismo contrato de modificadores para jugador y enemigos, con un catálogo de atributos basado en auditoría real
```

### HP5 — Interfaz, posible rediseño, regresión y cierre

HP5 comienza con un análisis específico de la pantalla de Personaje.

No se asume de antemano que basten cambios mínimos. Debe decidirse, mediante propuesta previa, si corresponde:

- conservar la estructura actual;
- reorganizar secciones;
- incorporar agrupadores/pestañas;
- rediseñar parcialmente;
- realizar un rediseño más profundo del panel manteniendo HTML/CSS y el diseño maestro visual.

Debe contemplar la cantidad final de pasivas, efectos y desgloses producidos por HP2–HP4.

Mejoras de interfaz ya reservadas y aprobadas para analizar en HP5:

- mostrar **Potencia de Habilidad** en el panel Personaje, consumiendo el valor canónico dentro de la sección actualmente denominada `Magia`;
- analizar si esa sección debe seguir llamándose `Magia` o renombrarse a `Habilidades` u otra denominación más general;
- en cada caja de afijo, agregar junto a `Prefijo/Sufijo` una segunda píldora que comunique al jugador si el efecto es propio del objeto o se aplica al portador. La palabra visible definitiva se diseña en HP5; la UI consume `ambito` y no lo recalcula.
- diseñar y asignar la **iconografía definitiva de las pasivas**, reutilizando el atributo canónico `icono` de `Habilidades.json`; HP3 no crea iconos provisionales ni otro contrato visual paralelo. HP5 debe definir una dirección visual coherente para las pasivas y validar su lectura dentro del panel real.

Luego debe:

- mostrar Pasivas en el panel de habilidades;
- mostrar pasivas aprendidas activas/inactivas en Personaje;
- mostrar auras/maldiciones activas;
- mostrar desgloses de estadísticas usando el resultado real del resolutor;
- completar i18n;
- revisar herramientas de balance/depuración afectadas;
- validar persistencia nueva, web, Electron y regresión funcional;
- validar presentación con redimensionamiento y densidad real de contenido;
- actualizar documentación correspondiente;
- generar entrega final del hito.

Resultado esperado:

```text
hito completamente visible, utilizable, verificable y preparado para balance y contenido posterior
```

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
```

La secuencia es deliberada:

- HP1 elimina la restricción conceptual a magia sin cargar deuda de migraciones inexistentes;
- HP2 realiza el inventario exhaustivo y cierra el motor canónico junto con la integración de afijos globales, evitando una etapa pequeña separada;
- HP3 utiliza ese motor para diseñar un catálogo amplio de pasivas y cerrar la progresión física;
- HP4 audita profundamente las habilidades y diseña/integra auras y maldiciones, incluyendo efectos sobre enemigos;
- HP5 decide la arquitectura visual final cuando ya conoce la densidad real de contenido y cierra regresión/documentación.

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

1. existe un único sistema general de progresión de habilidades;
2. HP1 reemplazó `ProgresoMagicoJugador` por `ProgresoHabilidadesJugador`, sin duplicarlo ni conservar wrappers;
3. Maestrías/Habilidades generales salen del directorio conceptual exclusivo de magia;
4. pasivas consumen los mismos puntos universales/específicos que las activas;
5. pasivas, auras, maldiciones, afijos del portador, efectos temporales, terreno/zonas y fuentes equivalentes comparten un sistema canónico de modificadores cuando afectan un objetivo registrado;
6. auras/maldiciones y otros efectos temporales mantienen su ciclo de vida mediante el sistema temporal existente, pero la composición de sus modificadores numéricos pertenece al centralizador;
7. no existe un sistema independiente por estadística ni por tipo de combatiente;
8. las ecuaciones solicitan modificaciones mediante claves registradas canónicamente;
9. todo objetivo registrado obtiene su valor final mediante `SistemaModificadoresCombatiente` antes de ser consumido;
10. si aparece una semántica matemática real no soportada, se amplía el contrato común en vez de resolverla en paralelo;
11. HP2 implementa `sumar`, `porcentaje_base`, `porcentaje_total`, `multiplicar_redondear` y `multiplicar`;
12. las configuraciones y descriptores fallan explícitamente ante objetivos, operaciones, ámbitos o claves de contexto desconocidos;
13. condiciones/contexto son declarativos y no pueden contener código ejecutable;
14. los límites y redondeos finales propios de una regla continúan perteneciendo a su dominio; los redondeos que formen parte de la propia composición de modificadores se expresan como operación canónica;
15. los afijos `local_objeto` continúan perteneciendo al objeto;
16. los afijos `portador` reutilizan el resolutor común mientras el objeto esté equipado;
17. el objeto conserva visible la información de sus afijos `portador`, aunque esos valores no se fusionen con sus propiedades locales;
18. equipar/desequipar no mantiene copias manuales de modificadores: las fuentes se obtienen desde el equipo canónico actual;
19. terreno y zonas pueden ser fuentes canónicas; su vigencia se obtiene de la posición/estado espacial real y no se persiste como estadística del actor;
20. una zona puede aplicar un estado, aportar modificadores directos o ambas cosas según contenido; solo la composición de objetivos registrados pertenece al centralizador;
21. `PercepcionJugador` se elimina y Player/Enemigo resuelven Percepción mediante el mismo motor;
22. los efectos de factores temporales se multiplican dentro del centralizador y dejan de escribir factores finales sobre el combatiente;
23. variantes enemigas son fuentes canónicas cuando modifican objetivos registrados; atributos primarios y experiencia otorgada permanecen fuera hasta su decisión correspondiente;
24. la penalización base de la mano secundaria permanece en el ataque y `multiplicadorDanioFuente` permite modificar su resultado por contexto sin reglas especiales de pasiva;
25. quiver conserva munición/capacidad en su dominio, pero sus afijos `portador` pueden modificar cualquier objetivo registrado sin motor especial;
26. escudos conservan Armadura/Bloqueo/Mitigación locales y cualquier modificación global posterior de esos objetivos atraviesa el centralizador;
27. HP2 adopta persistencia de jugador `v3`, sin migración;
28. se persisten fuentes de objetos y no `propiedadesFinales`; las propiedades locales se reconstruyen desde plantilla + afijos al cargar;
29. wrappers/fallbacks históricos directamente intervenidos se eliminan en vez de conservar compatibilidad vieja;
30. el registro auditado mantiene cuatro estados documentales: implementado, previsto para etapa posterior, pendiente de decisión explícita y deliberadamente fuera del motor;
31. los seis atributos primarios no ingresan automáticamente al motor; requieren aprobación en la etapa que realmente los necesite;
32. `resistenciaMental`, `potenciaAura`, familias de daño global, robo, hallazgo, precisión/potencia de hechizos y velocidades reservadas permanecen pendientes de decisión;
33. `aumentarVelocidad` y `multiplicarMas` existen únicamente en afijos no activos y no reciben semántica automática en HP2;
34. los atributos internos de habilidades se auditan y formalizan en HP4; cuando sean objetivos modificables también deberán atravesar `SistemaModificadoresCombatiente`;
35. HP3 incorpora doce maestrías físicas: ocho de armas y cuatro defensivas, disponibles para las tres profesiones;
36. cada maestría física utiliza cuatro pasivas `3/3/3/1` con requisitos `0/3/6/9`;
37. `ProveedorModificadoresPasivasAprendidas` descubre pasivas/grados y entrega descriptores, pero solo `SistemaModificadoresCombatiente` interpreta condiciones y calcula resultados;
38. la XP de armas usa daño realmente aplicado por cada fuente y familia; la XP defensiva consume mitigación de Armadura y Bloqueo ya resuelta;
39. existe un único `SistemaExperienciaMaestrias` y cada maestría declara sus fuentes/factores en configuración;
40. el set corporal completo se compone de cabeza, torso, manos, piernas y pies; el escudo queda fuera;
41. un conjunto mixto usa `categoriaArmadura=mixta`; una ranura corporal vacía implica `conjuntoArmaduraCompleto=false`;
42. la mitigación de Armadura se distribuye entre ligera/media/pesada/escudo/otras según contribución canónica y las fuentes no clasificables no regalan XP física;
43. `Básicas` permanece vacía hasta diseñar una fuente de progresión natural;
44. HP3 adopta progreso de habilidades `v3` y persistencia de jugador `v4`, sin migración;
45. HP3 deja diseñadas ocho auras y ocho maldiciones cuyo runtime se completa en HP4;
46. el panel Personaje debe poder mostrar pasivas/efectos y aplicabilidad sin recalcular estadísticas; HP5 decidirá si requiere rediseño;
47. HP5 debe mostrar Potencia de Habilidad, revisar la denominación Magia/Habilidades y comunicar visualmente el ámbito de cada afijo;
48. tooltips y paneles deben consumir resultado/desglose canónico, no reproducir las fórmulas del motor;
49. la XP positiva conserva el mínimo de 1 punto definido por el diseño; cuando un mismo golpe distribuye mitigación de Armadura entre varias categorías, se calcula un único pool entero y se reparte por restos mayores para que el redondeo no cree ni destruya XP.

---

## 27. DECISIONES DE BALANCE ABIERTAS

No bloquean la arquitectura y se resolverán en la etapa de implementación/contenido correspondiente:

- balance fino posterior de los valores iniciales de las 48 pasivas físicas;
- balance fino posterior de los factores de XP `0,75 / 8 / 4`, manteniéndolos configurables;
- magnitudes/balance de futuros modificadores sobre los objetivos ya registrados;
- catálogo inicial amplio de atributos de habilidad modificables, a cerrar en HP4 tras auditoría real;
- refinamiento técnico y balance de las ocho auras y ocho maldiciones diseñadas en HP3 durante HP4.

Estos valores deben quedar configurables siempre que la arquitectura real lo permita.

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
