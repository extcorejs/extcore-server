import {
  createProgram,
  createParser,
  SchemaGenerator,
  Schema,
  createFormatter,
  Config,
} from 'ts-json-schema-generator';

export const generateSchemas = (sourceFile: string, tsconfigFile: string): Schema => {
  const config: Config = {
    path: sourceFile,
    tsconfig: tsconfigFile,
    type: '*',
    expose: 'export',
    additionalProperties: false,
  };

  const program = createProgram(config);
  const parser = createParser(program, config);
  const formatter = createFormatter(config);
  const generator = new SchemaGenerator(program, parser, formatter, config);

  return generator.createSchema(config.type);
};
