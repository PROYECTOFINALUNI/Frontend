# Frontend de gestión de gastos

El proyecto contiene el frontend de una aplicación para la gestión de gastos corporativos. Está desarrollado con **React**, **TypeScript** y **Vite**, y se comunica mediante HTTP con la API REST proporcionada por el backend desarrollado en Django.

La aplicación permite a los usuarios gestionar informes y gastos desde una interfaz web, así como participar en los distintos procesos de aprobación según su rol.

Entre sus principales funcionalidades se encuentran la creación y consulta de informes, el registro de gastos, la visualización de avisos y cálculos asociados, el envío de informes para aprobación y la gestión de las distintas opciones de administración disponibles para los usuarios autorizados.

El frontend constituye un proyecto independiente del backend y dispone de sus propias dependencias, configuración y contenedores Docker.

## Requisitos

Para ejecutar el proyecto mediante contenedores es necesario disponer de:

- Docker
- Docker Compose

No es necesario instalar Node.js directamente en el equipo si se utiliza Docker.

Para ejecutar el proyecto sin contenedores es necesario disponer de:

- Node.js 22 o superior
- npm

Además, el backend debe encontrarse en ejecución para que el frontend pueda comunicarse con la API.

## Backend necesario

El frontend depende del backend de la aplicación, que por defecto debe encontrarse disponible en:

```text
http://localhost:8000
```

Por este motivo, antes de utilizar la aplicación web debe iniciarse el proyecto backend.

Desde la carpeta correspondiente al backend puede ejecutarse:

```bash
docker compose up -d
```

Si todavía no existe ningún usuario administrador, también debe crearse un superusuario desde el backend:

```bash
docker compose exec backend python manage.py createsuperuser
```

Este usuario podrá utilizarse posteriormente para iniciar sesión en la aplicación y configurar los principales datos necesarios.

## Instalación y ejecución con Docker

En primer lugar, se debe descomprimir el proyecto y abrir una terminal dentro de la carpeta raíz, donde se encuentra el archivo `docker-compose.yml`.

Si el proyecto incluye un archivo `.env.example`, puede utilizarse para crear el archivo de configuración local:

```bash
cp .env.example .env
```

A continuación, para iniciar el frontend se utiliza:

```bash
docker compose up
```

La aplicación queda disponible en:

```text
http://localhost:3000
```

El entorno de desarrollo utiliza recarga automática, por lo que los cambios realizados en el código se reflejan en el navegador durante el desarrollo.

## Instalación y ejecución sin Docker

También es posible ejecutar el proyecto utilizando Node.js directamente.

Primero deben instalarse las dependencias:

```bash
npm install
```

Después se puede iniciar el servidor de desarrollo mediante:

```bash
npm run dev
```

La aplicación estará disponible igualmente en:

```text
http://localhost:3000
```

## Variables de entorno

La configuración principal del frontend se realiza mediante variables de entorno de Vite.

El proyecto incluye un archivo `.env.example` que sirve como referencia.

La variable principal es:

```text
VITE_API_BASE_URL
```

Esta variable indica la dirección del backend con el que debe comunicarse la aplicación.

En el entorno de desarrollo su valor habitual es:

```text
http://localhost:8000
```

También puede utilizarse la variable:

```text
VITE_USE_POLLING
```

para habilitar el sistema de detección de cambios mediante polling cuando sea necesario al utilizar Docker.

Debe tenerse en cuenta que las variables que comienzan por `VITE_` se incorporan al frontend durante el proceso de construcción de la aplicación.

## Acceso a la aplicación

Una vez iniciado el frontend, se puede acceder desde el navegador mediante:

```text
http://localhost:3000
```

Para iniciar sesión es necesario disponer previamente de un usuario válido creado en el backend.

Dependiendo del rol asignado al usuario, la aplicación mostrará diferentes funcionalidades y opciones de gestión.

## Autenticación

La aplicación utiliza el sistema de autenticación proporcionado por el backend mediante **JSON Web Tokens (JWT)**.

Al iniciar sesión, el frontend obtiene los tokens necesarios para autenticarse frente a la API.

El token de acceso se utiliza para realizar las peticiones protegidas al backend mediante la cabecera:

```text
Authorization: Bearer <token>
```

El frontend también gestiona la renovación de la sesión utilizando el token de actualización proporcionado por el backend.

Los permisos reales de cada operación son comprobados siempre por el backend. La interfaz puede ocultar o mostrar determinadas opciones dependiendo del rol del usuario, pero la autorización final se realiza en la API.

## Funcionalidades principales

La aplicación permite trabajar con los principales elementos del sistema de gestión de gastos.

Entre las funcionalidades disponibles se encuentran:

- Inicio y cierre de sesión.
- Consulta de la información del usuario autenticado.
- Creación y consulta de informes de gastos.
- Creación, modificación y consulta de gastos.
- Visualización del estado de los informes.
- Envío de informes para aprobación.
- Aprobación, rechazo o delegación de informes por parte de los usuarios autorizados.
- Consulta del historial y los eventos relacionados con un informe.
- Gestión de categorías.
- Gestión de usuarios.
- Gestión de reglas de aviso.
- Gestión de reglas de aprobación.
- Gestión de atributos organizativos.
- Configuración de campos personalizados asociados a categorías.

Las funcionalidades visibles dependen del rol y de los permisos del usuario autenticado.

## Flujo general de uso

El funcionamiento principal de la aplicación está basado en informes de gastos.

De forma resumida, el proceso es el siguiente:

1. El usuario inicia sesión.
2. Crea un nuevo informe de gastos.
3. Añade uno o varios gastos al informe.
4. Mientras el informe se encuentre en estado borrador, puede modificar sus gastos.
5. La aplicación muestra los cálculos y avisos correspondientes a los datos introducidos.
6. El usuario envía el informe para su aprobación.
7. El sistema determina el flujo de aprobación correspondiente.
8. Los usuarios autorizados pueden aprobar, rechazar o delegar el informe.
9. Una vez completado el proceso, el informe puede pasar a estado aprobado y posteriormente ser marcado como pagado por un administrador.

## Cálculo y previsualización de gastos

Durante la creación o modificación de un gasto, el frontend puede mostrar una previsualización de los importes y de los impuestos correspondientes.

La aplicación realiza inicialmente un cálculo local para proporcionar una respuesta inmediata al usuario y posteriormente puede consultar al backend para verificar el resultado.

El backend se considera siempre la fuente definitiva de los valores almacenados.

De esta forma, el usuario puede visualizar una estimación antes de guardar el gasto sin sustituir las validaciones y cálculos realizados por el servidor.

## Categorías y campos personalizados

Las categorías pueden contener campos personalizados definidos por los administradores.

Cuando un usuario selecciona una categoría que contiene este tipo de campos, el formulario del gasto muestra automáticamente los campos adicionales correspondientes.

Estos pueden ser, entre otros:

- Campos de texto.
- Campos numéricos.
- Campos de tipo booleano.

La obligatoriedad y configuración de estos campos depende de la categoría seleccionada y de la configuración realizada desde la administración.

## Estructura general

El código fuente principal se encuentra dentro de la carpeta `src/` y se organiza por funcionalidades:

```text
src/
├── app/
├── features/
│   ├── approvals/
│   ├── auth/
│   ├── catalog/
│   ├── dashboard/
│   ├── expenses/
│   ├── reports/
│   └── settings/
└── shared/
    ├── api/
    ├── components/
    ├── money/
    ├── test/
    ├── types/
    ├── utils/
    └── validation/
```

Las principales responsabilidades son:

- `app/`: configuración general de la aplicación, rutas, proveedores y estructura principal.
- `features/auth/`: inicio de sesión y gestión de la autenticación.
- `features/expenses/`: gestión de los gastos.
- `features/reports/`: gestión de informes y de su flujo de aprobación.
- `features/approvals/`: funcionalidades destinadas a los usuarios encargados de aprobar informes.
- `features/settings/`: pantallas de configuración y administración.
- `shared/api/`: comunicación con la API del backend.
- `shared/components/`: componentes reutilizables de la interfaz.
- `shared/types/`: tipos compartidos de la aplicación.
- `shared/validation/`: validación de formularios y datos.

Esta organización permite separar las distintas funcionalidades del proyecto y reutilizar componentes y lógica común.

## Comandos disponibles

El proyecto dispone de distintos comandos de npm para su desarrollo y comprobación.

Para iniciar el entorno de desarrollo:

```bash
npm run dev
```

Para generar una versión de producción:

```bash
npm run build
```

Para comprobar los tipos de TypeScript:

```bash
npm run typecheck
```

Para ejecutar el análisis de código:

```bash
npm run lint
```

Para ejecutar las pruebas:

```bash
npm run test
```

También existen comandos adicionales para comprobar el formato del código y generar informes de cobertura de las pruebas.

## Pruebas

El proyecto incluye pruebas automatizadas para comprobar diferentes partes de la aplicación.

Se utilizan herramientas como **Vitest** y **React Testing Library** para verificar la lógica y el comportamiento de los componentes.

Entre los aspectos comprobados se encuentran los cálculos monetarios, los formularios de gastos, la comunicación con la API, la autenticación y el tratamiento de errores.

Las pruebas pueden ejecutarse mediante:

```bash
npm run test
```

## Docker

Para iniciar el entorno de desarrollo mediante Docker:

```bash
docker compose up
```

El frontend se ejecuta en el puerto `3000`.

El proyecto también dispone de una configuración destinada a construir y servir una versión de producción de la aplicación.

Para detener los contenedores se utiliza:

```bash
docker compose down
```

## Consideraciones finales

El frontend depende de que el backend esté correctamente configurado y accesible desde la dirección definida mediante `VITE_API_BASE_URL`.

En el entorno de desarrollo habitual:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Administración de Django: `http://localhost:8000/admin/`
- Swagger: `http://localhost:8000/api/docs/`

Por tanto, para utilizar la aplicación completa deben encontrarse en ejecución tanto el frontend como el backend.
