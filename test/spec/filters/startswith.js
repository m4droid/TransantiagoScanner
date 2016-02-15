'use strict';

describe('Filter: startsWith', function () {

  // load the service's module
  beforeEach(module('transantiagoScannerApp'));

  var $filter;

  // Initialize the service and a mock scope
  beforeEach(inject(function (_$filter_) {
    $filter = _$filter_;
  }));

  /* Test Maps functions */
  it('should return a list with strings matching prefix', function () {
    var strings = [
      'asdf',
      'qwer'
    ];

    expect($filter('startsWith')(strings, 'a')).toEqual(['asdf']);
  });
});
