import { ObjectSchema } from 'yup';
import { HttpRequest } from '../routing';

export type YupValidationSchema = ObjectSchema<any> | ((req: HttpRequest) => ObjectSchema<any>);
