import { Resource } from '@angular/core';

/**
 * The value of a resource, or `undefined` while there is none. Reading `value()` of a resource that failed throws, which
 * would break every computed signal and template that reads it; the failure is shown from `error()` instead.
 */
export function valueOf<T>(resource: Resource<T | undefined>): T | undefined {
  return resource.hasValue() ? resource.value() : undefined;
}
