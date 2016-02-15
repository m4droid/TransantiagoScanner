'use strict';

describe('Service: MapsUtils', function () {

  // load the service's module
  beforeEach(module('transantiagoScannerApp'));

  var MapsUtils;

  // Initialize the service and a mock scope
  beforeEach(inject(function (_MapsUtils_) {
    MapsUtils = _MapsUtils_;
  }));

  /* Test Maps functions */
  it('should radians function convert from degrees', function () {
    expect(MapsUtils.radians(0)).toBe(0);
    expect(MapsUtils.radians(45)).toBe(Math.PI / 4);
    expect(MapsUtils.radians(90)).toBe(Math.PI / 2);
    expect(MapsUtils.radians(180)).toBe(Math.PI);
  });
});
