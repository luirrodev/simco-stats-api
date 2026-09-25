import { envOrDefault } from './environment.util';

describe('envOrDefault', () => {
  it.each([
    [undefined, 'fallback'],
    ['', 'fallback'],
  ])('uses the fallback for %p', (value, expected) => {
    expect(envOrDefault(value, 'fallback')).toBe(expected);
  });

  it('keeps an explicit environment value', () => {
    expect(envOrDefault('configured', 'fallback')).toBe('configured');
  });
});
