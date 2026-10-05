import { describe, expect, test } from 'vitest';
import {
  PipelineError,
  SchemaChangeError,
  SourceUnavailableError,
  ValidationError,
} from '../../src/errors.js';

describe('pipeline error hierarchy', () => {
  test('PipelineError initializes correctly', () => {
    const err = new PipelineError('generic pipeline error');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('PipelineError');
    expect(err.message).toBe('generic pipeline error');
  });

  test('SchemaChangeError contains details', () => {
    const details = { expectedHeaders: ['a', 'b'], receivedHeaders: ['a', 'c'] };
    const err = new SchemaChangeError('Header mismatch', details);
    expect(err).toBeInstanceOf(PipelineError);
    expect(err.name).toBe('SchemaChangeError');
    expect(err.details).toEqual(details);
  });

  test('ValidationError contains issues array', () => {
    const issues = [{ path: ['code'], message: 'Invalid code' }];
    const err = new ValidationError('Zod validation failed', issues);
    expect(err).toBeInstanceOf(PipelineError);
    expect(err.name).toBe('ValidationError');
    expect(err.issues).toEqual(issues);
  });

  test('SourceUnavailableError contains statusCode and url', () => {
    const err = new SourceUnavailableError('Not found', {
      statusCode: 404,
      url: 'https://example.com/data.csv',
    });
    expect(err).toBeInstanceOf(PipelineError);
    expect(err.name).toBe('SourceUnavailableError');
    expect(err.statusCode).toBe(404);
    expect(err.url).toBe('https://example.com/data.csv');
  });
});
