'use strict';

describe('Controller: SidenavCtrl', function () {

  // load the controller's module
  beforeEach(module('transantiagoScannerApp'));

  var SidenavCtrl,
    scope,
    httpBackend;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope, $injector, API) {
    scope = $rootScope.$new();

    httpBackend = $injector.get('$httpBackend');
    httpBackend.whenGET(API.getServices).respond(['210', '506', '509', 'H05']);

    SidenavCtrl = $controller('SidenavCtrl', {
      $scope: scope,
      $httpBackend: httpBackend
    });
  }));

  // it('should set a list of groups', function () {
  //   expect(scope.groups.length).toBe(14);
  // });

  // it('should set first selected group to 1XX', function () {
  //   expect(scope.selectedGroup).toBe('1');
  // });

  // it('should get a list of bus routes in groups', function () {
  //   httpBackend.flush();
  //   expect(scope.busRoutes).toEqual(['210', '506', '509', 'H05']);
  // });
});
