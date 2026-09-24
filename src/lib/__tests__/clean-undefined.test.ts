import { cleanUndefined } from '../clean-undefined';

class Timestamp {
  seconds: number;
  nanoseconds: number;
  constructor(seconds: number, nanoseconds: number) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }
}

class FieldValue {
  type: string;
  constructor(type: string) {
    this.type = type;
  }
}

describe('cleanUndefined', () => {
  it('should remove undefined values from objects', () => {
    const input = { a: 1, b: undefined, c: 'test', d: { e: undefined, f: 2 } };
    const expected = { a: 1, c: 'test', d: { f: 2 } };
    expect(cleanUndefined(input)).toEqual(expected);
  });

  it('should remove undefined values from arrays', () => {
    const input = [1, undefined, { a: undefined, b: 2 }];
    const expected = [1, null, { b: 2 }];
    expect(cleanUndefined(input)).toEqual(expected);
  });

  it('should not mutate primitive values', () => {
    expect(cleanUndefined(1)).toBe(1);
    expect(cleanUndefined('string')).toBe('string');
    expect(cleanUndefined(null)).toBe(null);
  });

  it('should skip React elements', () => {
    const mockReactElement = { $$typeof: Symbol.for('react.element'), props: { a: undefined } };
    const result = cleanUndefined(mockReactElement);
    // Debe devolver el objeto tal cual, sin limpiarle el "a: undefined"
    expect(result).toBe(mockReactElement);
    expect(result.props.a).toBeUndefined();
  });

  it('should skip Date objects', () => {
    const mockDate = new Date('2026-09-17T00:00:00Z');
    const result = cleanUndefined(mockDate);
    expect(result).toBe(mockDate);
  });

  it('should skip Firebase Timestamp objects', () => {
    const mockTimestamp = new Timestamp(123456789, 0);
    const result = cleanUndefined(mockTimestamp);
    expect(result).toBe(mockTimestamp);
  });

  it('should skip Firebase FieldValue objects', () => {
    const mockFieldValue = new FieldValue('serverTimestamp');
    const result = cleanUndefined(mockFieldValue);
    expect(result).toBe(mockFieldValue);
  });
});
