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
      $scope.busRoutes = {};
      for (var index in response.data) {
        var busRoute = response.data[index];
        var group = busRoute[0];
        if ($scope.busRoutes[group] === undefined) {
          $scope.busRoutes[group] = [];
        }
        $scope.busRoutes[group].push(busRoute);
      }
    }, function (response) {
      console.log('getRoutes error', response);
    });
  });
