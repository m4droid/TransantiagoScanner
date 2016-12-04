'use strict';

/**
 * @ngdoc function
 * @name transantiagoApp.controller:MapCtrl
 * @description
 * # MapCtrl
 * Controller of the transantiagoScannerApp
 */
angular.module('transantiagoScannerApp')
  .directive('customMap', function () {
    return {
      restrict: 'AE',
      scope: {},
      templateUrl: 'views/directives/map.html',
      link: function (scope, element, attrs) {
        console.log(element);
        window.dispatchEvent(new Event('resize'));
      }
    };
  });
