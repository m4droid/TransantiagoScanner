'use strict';

describe('Controller: MainCtrl', function () {

  // load the controller's module
  beforeEach(module('transantiagoScannerApp'));

  var MainCtrl,
    scope,
    httpBackend;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope, $injector) {
    scope = $rootScope.$new();

    httpBackend = $injector.get('$httpBackend');
    httpBackend.whenGET('images/markers/marker_bus.svg').respond('fake_marker_bus_content');
    httpBackend.whenGET('views/infowindow_bus.html').respond('fake_infowindow_bus_content');

    MainCtrl = $controller('MainCtrl', {
      $scope: scope,
      // place here mocked dependencies
      $httpBackend: httpBackend
    });
  }));

  /* Test init */
  it('should set $mdMedia function into scope', function () {
    expect(typeof(scope.$mdMedia)).toBe('function');
  });

  it('should load templates', function () {
    httpBackend.flush();

    expect(scope.busMarkerSvgTemplate).toBe('fake_marker_bus_content');
    expect(scope.busMarkerInfoWindowTemplate).toBe('fake_infowindow_bus_content');
  });
});
