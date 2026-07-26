# Ajuste de arquitectura — ETAPA 6

Base: `5aa14aa11c8ba8a21fde80ae4689797a435c247f`.

Los catalizadores quedan integrados como armas normales:

- bastones y ocho varitas se definen en `Armas.json`;
- Enfocado se define en `Prefijos.json`;
- el cargador general continúa siendo la única entrada de configuración;
- `SistemaAfijos.js` aplica filtros opcionales por familia dentro del proceso común;
- el validador general reconoce `potenciaHabilidad` y familias;
- la persistencia general guarda y reconstruye las varitas como cualquier arma.

Se eliminaron las siete capas paralelas enumeradas en el paquete. No se conserva una migración de guardados porque se confirmó que no existen partidas anteriores.

No cambia el balance ni el comportamiento de combate aprobado en ETAPA 6.
