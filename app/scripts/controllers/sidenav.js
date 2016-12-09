'use strict';

/**
 * @ngdoc function
 * @name transantiagoApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the transantiagoScannerApp
 */
angular.module('transantiagoScannerApp')
  .controller('SidenavCtrl', function ($scope, $http, API, localStorageService) {
    $scope.flyToStop = function (stopRawData) {
      var stopMarker = $scope.getStopMarker(stopRawData);
      $scope.map.panTo(stopMarker.getLatLng());
      stopMarker.onMarkerClickFunc();
    }

    localStorageService.bind($scope, 'latestStops');
  });
