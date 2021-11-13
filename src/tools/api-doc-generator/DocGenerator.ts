import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { Project } from 'ts-morph';
import { v4 as uuidv4 } from 'uuid';
import { Schema } from 'ts-json-schema-generator';
import { groupByKey, readDirRecursively } from '../../utils';
import { HttpEndpoint, HttpMethod } from '../../routing';
import { generateSchemas } from './schema-generator';

interface GeneratorConfig {
  projectRoot: string;
  handlerPath: string;
  docPath: string;
}

interface HandlerFile {
  fileName: string;
  directory: string;
}

interface ExportedHandler {
  uuid: string;
  sourceFile: HandlerFile;
  variableName: string;
  path: string;
  method: HttpMethod;
  tags?: string[];
  summary?: string;
  response?: string;
  paramsDescription?: Record<string, string>;
  returned?: unknown;
  requestBody?: unknown;
  queryParams?: unknown;
}

interface EndpointParameter {
  name: string;
  in: 'path' | 'body' | 'query';
  required?: boolean;
  description?: string;
  example?: unknown;
  schema?: Record<string, unknown>;
  [key: string]: unknown;
}

interface JsonSchemaItem {
  type?: string;
  properties?: Record<string, Record<string, unknown>>;
  required?: string[];
  $ref?: string;
}

interface EndpointRequestBody {
  description?: string;
  required?: boolean;
  content?: {
    [key: string]: {
      schema: JsonSchemaItem;
    };
  };
}

export class DocGenerator {
  protected handlerFiles: HandlerFile[] = [];
  protected handlers: ExportedHandler[] = [];
  protected typeDefinitions: Record<string, unknown> = {};

  constructor(protected config: GeneratorConfig) {}

  protected removeFolderIfExists(dir: string): void {
    if (fs.existsSync(dir)) {
      fs.rmdirSync(dir, {
        recursive: true,
      });
    }
  }

  protected createOutputDir(dir: string) {
    fs.mkdirSync(dir);
  }

  protected findHandlerFiles(dir: string): void {
    this.handlerFiles = readDirRecursively(dir)
      .filter((file) => file.fileName.includes('handlers.ts'))
      .map<HandlerFile>((file) => ({
        fileName: file.fileName,
        directory: file.absoluteDir,
      }));
  }

  protected parseTypesFromFiles(): void {
    const tsconfig = path.join(this.config.projectRoot, 'tsconfig.json');

    for (const file of this.handlerFiles) {
      const sourceFile = path.join(file.directory, file.fileName);
      const schemas = generateSchemas(sourceFile, tsconfig);

      if (schemas && schemas.definitions) {
        this.typeDefinitions = {
          ...this.typeDefinitions,
          ...schemas.definitions,
        };
      }
    }
  }

  protected flattenTypesWithArguments(): void {
    for (const key in this.typeDefinitions) {
      const ref = (this.typeDefinitions[key] as Record<string, unknown>)['$ref'];

      if (ref && String(ref).includes('#/definitions/')) {
        const decodedRef = decodeURIComponent(ref as string).replace('#/definitions/', '');
        const matchingType = this.typeDefinitions[decodedRef];

        // Note: for now, replace only root-level definitions containing Type Arguments
        if (matchingType && decodedRef.includes('<')) {
          this.typeDefinitions[key] = matchingType;
        }
      }
    }
  }

  protected loadExportedHandlers(): void {
    for (const file of this.handlerFiles) {
      const fileExports = module.require(path.join(file.directory, file.fileName));

      for (const key in fileExports) {
        if (fileExports[key] instanceof HttpEndpoint) {
          const endpoint: HttpEndpoint<any> = fileExports[key];

          this.handlers.push({
            uuid: uuidv4(),
            sourceFile: file,
            variableName: key,
            path: endpoint.getPath(),
            method: endpoint.getMethod(),
            tags: endpoint.getDoc().tags,
            summary: endpoint.getDoc().summary,
            response: endpoint.getDoc().response,
            paramsDescription: endpoint.getDoc().paramsDescription,
          });
        }
      }
    }
  }

  protected parseHandlerTypeArguments(): void {
    const project = new Project({
      tsConfigFilePath: path.join(this.config.projectRoot, 'tsconfig.json'),
    });

    for (const handler of this.handlers) {
      const fileName = path.join(handler.sourceFile.directory, handler.sourceFile.fileName);

      try {
        const sourceFile = project.getSourceFileOrThrow(fileName);
        const variableDeclaration = sourceFile.getVariableDeclaration(handler.variableName);

        if (variableDeclaration) {
          const callExpression = variableDeclaration.getFirstChildByKind(ts.SyntaxKind.CallExpression);

          if (callExpression) {
            const typeReference = callExpression.getFirstChildByKind(ts.SyntaxKind.TypeReference);

            if (typeReference) {
              this.processParsedHandlerType(handler, typeReference.getTypeName().getText());
            }
          }
        }
      } catch {
        console.warn('Unable to load AST for file :', fileName);
      }
    }
  }

  protected processParsedHandlerType(handler: ExportedHandler, typeName: string): void {
    const type = this.typeDefinitions[typeName];
    const index = this.handlers.findIndex((item) => item.uuid === handler.uuid);

    if (type && index > -1) {
      const { properties } = type as Schema;

      this.handlers.splice(index, 1, {
        ...handler,
        returned: properties && properties.returned ? properties.returned : undefined,
        requestBody: properties && properties.requestBody ? properties.requestBody : undefined,
        queryParams: properties && properties.queryParams ? properties.queryParams : undefined,
      });
    }
  }

  protected writeDefinitionsDoc(outputDir: string): void {
    const definitions: Record<string, unknown> = {};

    const jsonStringForHandlers = JSON.stringify(this.handlers);
    const jsonStringForTypes = JSON.stringify(this.typeDefinitions);

    for (const key in this.typeDefinitions) {
      if (
        jsonStringForHandlers.includes(`#/definitions/${encodeURIComponent(key)}`) ||
        jsonStringForTypes.includes(`#/definitions/${encodeURIComponent(key)}`)
      ) {
        definitions[key] = this.typeDefinitions[key];
      }
    }

    fs.writeFileSync(path.join(outputDir, 'definitions.json'), JSON.stringify(definitions, null, 2), 'utf8');
  }

  protected writePathsDoc(outputDir: string): Record<string, any> {
    const groupedHandlers = groupByKey<ExportedHandler>(this.handlers, 'path');
    const paths: Record<string, unknown> = {};

    for (const path in groupedHandlers) {
      const pathMethods: Record<string, any> = {};

      for (const handler of groupedHandlers[path]) {
        const formattedPath = this.getFormattedPath(handler.path);

        pathMethods[handler.method] = {
          tags: handler.tags || [],
          summary: handler.summary,
          consumes: ['post', 'put', 'patch'].includes(handler.method) ? ['application/json'] : undefined,
          parameters: this.getParametersSpecs(handler),
          requestBody: this.getRequestBodySpecs(handler),
          responses: this.getHandlerResponseSpecs(handler),
        };

        paths[formattedPath] = pathMethods;
      }
    }

    fs.writeFileSync(path.join(outputDir, 'paths.json'), JSON.stringify(paths, null, 2), 'utf8');

    return paths;
  }

  protected getFormattedPath(uri: string): string {
    return uri
      .split('/')
      .map<string>((segment) => (segment.charAt(0) === ':' ? `{${segment.substr(1)}}` : segment))
      .join('/');
  }

  protected getParametersSpecs(handler: ExportedHandler): EndpointParameter[] | undefined {
    const parameters: EndpointParameter[] = [
      ...this.getURIParametersSpecs(handler),
      ...this.getQueryParameters(handler),
    ];

    return parameters.length ? parameters : undefined;
  }

  protected getURIParametersSpecs(handler: ExportedHandler): EndpointParameter[] {
    const keys: string[] = [];

    handler.path.split('/').forEach((segment) => {
      if (segment.charAt(0) === ':') {
        keys.push(segment.substr(1));
      }
    });

    return keys.map<EndpointParameter>((key) => ({
      name: key,
      in: 'path',
      type: 'string',
      description:
        handler.paramsDescription && handler.paramsDescription[key] ? handler.paramsDescription[key] : undefined,
    }));
  }

  protected getRequestBodySpecs(handler: ExportedHandler): EndpointRequestBody | undefined {
    if (handler.requestBody) {
      const body = handler.requestBody as JsonSchemaItem;

      if (body.$ref || body.properties) {
        return {
          description: '', // TODO: add method to describe body payload
          content: {
            'application/json': {
              schema: body,
            },
          },
        };
      }
    }
  }

  // Deprecated, to be removed in a next iteration
  protected getBodyParameters(handler: ExportedHandler): EndpointParameter[] {
    const parameters: EndpointParameter[] = [];

    if (handler.requestBody) {
      const { properties, required } = this.getPropertiesFromJsonSchema(handler.requestBody);

      for (const propertyKey in properties) {
        parameters.push({
          name: propertyKey,
          in: 'body',
          required: required && required.includes(propertyKey),
          description:
            handler.paramsDescription && handler.paramsDescription[propertyKey]
              ? handler.paramsDescription[propertyKey]
              : undefined,
          ...properties[propertyKey],
        });
      }
    }

    return parameters;
  }

  protected getPropertiesFromJsonSchema(schema: any): JsonSchemaItem {
    if (schema && schema.$ref) {
      const decodedRef = decodeURIComponent(schema.$ref as string).replace('#/definitions/', '');
      const matchingType = this.typeDefinitions[decodedRef];

      if (matchingType) {
        return matchingType as JsonSchemaItem;
      }
    }

    return {
      properties: schema?.properties || {},
      required: [],
    };
  }

  protected getQueryParameters(handler: ExportedHandler): EndpointParameter[] {
    const parameters: EndpointParameter[] = [];

    if (handler.queryParams) {
      const { properties } = handler.queryParams as unknown as { properties: Record<string, Record<string, unknown>> };

      for (const propertyKey in properties) {
        parameters.push({
          name: propertyKey,
          in: 'query',
          description:
            handler.paramsDescription && handler.paramsDescription[propertyKey]
              ? handler.paramsDescription[propertyKey]
              : undefined,
          schema: {
            ...properties[propertyKey],
          },
        });
      }
    }

    return parameters;
  }

  protected findAllRefs(object: Record<string, any>): string[] {
    let refs: string[] = [];

    for (const key in object) {
      if (key === '$ref') {
        refs.push(object[key]);
      } else if (object[key] && typeof object[key] === 'object' && !Array.isArray(object[key])) {
        const childRefs = this.findAllRefs(object[key]);
        refs = [...refs, ...childRefs];
      }
    }

    return refs;
  }

  protected getHandlerResponseSpecs(handler: ExportedHandler): Record<string, unknown> | undefined {
    if (handler.returned) {
      return {
        '200': {
          description: handler.response,
          content: {
            'application/json': {
              schema: handler.returned,
            },
          },
        },
      };
    }

    return undefined;
  }

  public generate(): void {
    this.removeFolderIfExists(this.config.docPath);
    this.findHandlerFiles(this.config.handlerPath);
    this.loadExportedHandlers();
    this.parseTypesFromFiles();
    this.flattenTypesWithArguments();
    this.parseHandlerTypeArguments();
    this.createOutputDir(this.config.docPath);
    this.writePathsDoc(this.config.docPath);
    this.writeDefinitionsDoc(this.config.docPath);
  }
}
