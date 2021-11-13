# Extcore Server

### The project

Extcore Server aims to be the easiest and most efficient way to bootstrap a Typescript Node.js API.

It's a micro framework based on Express, allowing you to:
- Type properly your request's body, parameters and response
- Autoload your routes without maintaining a huge router file
- Handle JSON XHR requests without the need to install additional middlewares
- Generate your API Docs automatically using your endpoints typings

This project is still experimental so feel free to share your feedback, report issues and submit your PRs on GitHub!

### Get started

Install the CLI globally:

```
sudo npm i -g @extcore/cli
```

Then, create your project:
```
ext create awesome-project
```

Run your project in development mode:
```
cd awesome-project && npm run dev
```

- Have a look at the example endpoints in `src/http/handlers`.
- API Doc is located at this URL: `http://localhost:3030/api-docs` (make sure to generate it first, using `npm run build:doc` - read more info below).

### Defining endpoints

#### The basics

```typescript
import { route } from '@extcore/server';

export const getArticles = route({
  path: '/articles',
  method: 'get', // 'get' | 'post' | 'put' | 'patch' | 'delete' - Optional, default is 'get'
  tags: ['Articles'], // Optional, will be used by API Docs in order to group your endpoints
  handler: async (req) => {
    // Use 'req' in the same way as in a regular express application
    // req.body, req.params and req.query will be typed based on provided interface (see next section)
      
    await doSomething();
    
    return {
        // Response Body here...
    };
  },
});
```

#### Using types

Use the Route `interface` to type your endpoint parameters, body and response:

```typescript
import { Route } from '@extcore/server';

export type MyEndpoint = Route<
  ResponseBody,
  RequestBody, // Optional
  URLParams, // Optional
  QueryParams //Optional
>;
```

Example:

```typescript
import { route, Route } from '@extcore/server';
import { Articles } from '../../entities';

export type GetArticlesRoute = Route<Articles[]>;

export const getArticles = route<GetArticlesRoute>({
  // ...
});
```

**NOTE**: in order for the API Doc generator to work properly, your endpoint types must be exported!

### API Doc

- As mentioned above, don't forget to export your endpoint types.
- Run `npm run build:doc` to generate your OpenAPI 3 documentation
- If you need to include custom paths or definitions, use the files located in `src/swagger/doc` folder
- Generated doc will be located in `.swagger` folder, at the root of your project

### Using global middlewares and customizing server

If you need to add custom features to your server, such as application tracking tools like Sentry, Crashlytics, Application Insights, etc., you can use hooks or directly access to the Express app instance.

#### Access the underlying Express instance

```typescript
//  src/index.ts file

const server = createServer({
  // ...
});

// Use the getInstance() method to get the Express app instance
const app = server.getInstance();

// Attach your custom routes or middlewares
app.get('/hello', (req, res) => {
  res.json({ message: 'Hello World!' });
});
```

#### Hooks

The `createServer` method allows you to define hooks as describe in the example below:

```typescript
//  src/index.ts file

const server = createServer({
  // ...
  hooks: (hooks) => {
    hooks.beforeRoutes((app) => {
      app.use((req, res, next) => {
        // ... Custom middleware here ...  
      });
    });
    
    // ...
  },
});
```
Hook callbacks receive the underlying Express instance.

Available lifecycle hooks:
- beforeMiddlewares : triggered at the very beginning of server initialization, before loading core middlewares
- beforeRoutes : triggered when core middlewares are loaded, before initialization of routes
- afterRoutes : triggered when all routes are loaded, before initialization of error middlewares
- afterErrorMiddlewares : triggered when core error handlers are loaded

### Feedback

In order to improve this package, don't hesitate to share your feedback and contribute!

### On the roadmap

- Add route validators
- Add event / listener layer
- Add preconfigured data layer
- Add authentication layer
