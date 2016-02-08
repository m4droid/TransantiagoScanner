'use strict';

/**
 * @ngdoc function
 * @name transantiagoApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the transantiagoScannerApp
 */
angular.module('transantiagoScannerApp')
  .controller('SidenavCtrl', function ($scope, $rootScope, $http, API) {

    $scope.busRoutes = [];

    $http({
      method: 'GET',
      url: API.getServices
    }).then(function (response) {
      $scope.busRoutes = response.data;
    }, function (response) {
      console.log('getRoutes error', response);
    });
  });
