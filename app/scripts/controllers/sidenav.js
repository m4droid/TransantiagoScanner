'use strict';

/**
 * @ngdoc function
 * @name transantiagoApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the transantiagoScannerApp
 */
angular.module('transantiagoScannerApp')
  .controller('SidenavCtrl', function ($scope, $http, API) {

    $scope.setGroup = function (group) {
      $scope.selectedGroup = group.name;
    };

    $scope.groups = [
      {name: '1', color: '#000000', textColor: '#FFFFFF'},
      {name: '2', color: '#000000', textColor: '#FFFFFF'},
      {name: '3', color: '#000000', textColor: '#FFFFFF'},
      {name: '4', color: '#000000', textColor: '#FFFFFF'},
      {name: '5', color: '#000000', textColor: '#FFFFFF'},
      {name: 'B', color: '#000000', textColor: '#FFFFFF'},
      {name: 'C', color: '#000000', textColor: '#FFFFFF'},
      {name: 'D', color: '#000000', textColor: '#FFFFFF'},
      {name: 'E', color: '#000000', textColor: '#FFFFFF'},
      {name: 'F', color: '#000000', textColor: '#FFFFFF'},
      {name: 'G', color: '#000000', textColor: '#FFFFFF'},
      {name: 'H', color: '#000000', textColor: '#FFFFFF'},
      {name: 'I', color: '#000000', textColor: '#FFFFFF'},
      {name: 'J', color: '#000000', textColor: '#FFFFFF'}
    ];

    $scope.selectedGroup = '1';

    $scope.busRoutes = [];

    $http({
      method: 'GET',
      url: API.getServices
    }).then(function (response) {
      var routes = [];

      angular.forEach(response.data, function (route) {
        routes.push(route);
      });

      $scope.busRoutes = routes;
    }, function (response) {
      console.log('getRoutes error', response);
    });
  });
