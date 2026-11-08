# Intelligent Notification Service (AI test)

Servicio que recibe peticiones en lenguaje natural (por ejemplo, "Manda un mail a feda@test.com diciendo hola"), extrae con un motor de IA el destinatario, el mensaje y el canal, y envía la notificación a través de un proveedor externo.

- Enunciado original: [docs/test-statement.md](docs/test-statement.md)
- Motor de IA y proveedor de notificaciones (mock): [provider/](provider/), con su documentación en `http://localhost:3001/docs`

> El historial de commits sigue el orden en que se fue construyendo, por hitos.

## Requisitos

- Node.js 26 (fijado en [.node-version](.node-version)).
- Docker, para el mock, el servicio y el test de carga.

## Uso

Desde `app/`:

| Comando         | Descripción                                                   |
| --------------- | ------------------------------------------------------------- |
| `npm install`   | Instala las dependencias                                      |
| `npm test`      | Lanza los tests                                               |
| `npm run dev`   | Arranca el servicio en el puerto 5000 con recarga en caliente |
| `npm run build` | Compila a `dist/`                                             |

El servicio comparte red con el contenedor del mock (`network_mode: service:provider`), que es quien publica el puerto 5000. Para levantar ambos:

```bash
docker compose up -d provider influxdb grafana
docker compose up -d --build app
```

## Test de carga

Con el mock y el servicio levantados:

```bash
docker compose run --rm load-test
```

Los resultados se ven en [Grafana](http://localhost:3000/d/ia-performance-scorecard/).

### Evolución

Resultados del test tras cada paso. Es una ejecución por paso: sirven para ver la tendencia, no como cifras exactas.

| Paso | Checks OK | `/process` (media) |
| ---- | --------- | ------------------ |
| Endpoints sin procesamiento | 100 % | < 1 ms |

- Con `/process` vacío, el tiempo de respuesta es solo el del servicio: sirve de referencia para los pasos siguientes.

## Stack

Node.js 26 · TypeScript · Hono · Zod · Vitest.

El enunciado pide FastAPI; la empresa dejó elegir el lenguaje, y el servicio respeta el mismo contrato HTTP en el puerto 5000.

## Estructura

```
app/
  src/app.ts                 composición de la app y manejo de errores
  src/server.ts              arranque del servidor HTTP
  src/requests/routes.ts     endpoints de /v1/requests
  src/requests/store.ts      almacenamiento de las peticiones
  test/                      tests
```

## API

| Método y ruta                    | Respuesta                                    |
| -------------------------------- | -------------------------------------------- |
| `POST /v1/requests`              | `201 { id }`                                 |
| `POST /v1/requests/{id}/process` | `202 { id, status }`                         |
| `GET /v1/requests/{id}`          | `200 { id, status }`                         |

`status` es `queued`, `processing`, `sent` o `failed`. Los errores devuelven `{ error }`: 400 si el JSON está mal formado, 422 si `user_input` falta o está vacío y 404 si la petición no existe.

## Decisiones

- **Peticiones en memoria.** El enunciado no pide persistencia y el servicio corre en una sola instancia. El almacenamiento queda detrás de una clase propia, así que cambiarlo por una base de datos no afecta a las rutas.
- **422 para entradas inválidas**, el código que devolvería FastAPI con el mismo contrato, y 400 solo cuando el cuerpo no es JSON.
- **La app se construye con su almacenamiento como parámetro** (`createApp(store)`), para que cada test empiece con uno vacío.
